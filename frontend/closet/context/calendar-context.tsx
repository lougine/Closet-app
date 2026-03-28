import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { buildApiUrl, buildAuthHeaders } from '@/constants/api';

export const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type OutfitEntry = {
  _id: string;
  userId: string;
  date: string;         
  garmentIds: string[];
  previewImage: string;
  isLookbook?: boolean;
  garments?: Array<{ imageUrl?: string | null }>;
};

export type OutfitMap = Record<string, OutfitEntry>; 

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function buildOutfitMap(outfits: OutfitEntry[]): OutfitMap {
  const map: OutfitMap = {};
  outfits.forEach((o) => {
    if (o?.isLookbook) return;

    // Extract date key directly from ISO string to avoid timezone conversion issues
    const dateString = typeof o.date === 'string' ? o.date.slice(0, 10) : '';
    const hasPreview = Boolean(o.previewImage);

    if (!dateString) return;
    
    const existing = map[dateString];
    if (!existing) {
      map[dateString] = o;
      return;
    }

    // Prefer entries with preview image; otherwise keep the first (newest from API sort).
    if (!existing.previewImage && hasPreview) {
      map[dateString] = o;
    }
  });
  return map;
}

export function getOutfitForDate(outfitMap: OutfitMap, date: Date): OutfitEntry | undefined {
  return outfitMap[toDateKey(date)];
}

export function getWeekDays(date: Date): Date[] {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) grid.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export function getMostWornThisMonth(
  outfits: OutfitEntry[], year: number, month: number
): { outfit: OutfitEntry; count: number } | null {
  const thisMonth = outfits.filter((o) => {
    const d = new Date(o.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  if (!thisMonth.length) return null;
  const countMap: Record<string, { count: number; outfit: OutfitEntry }> = {};
  thisMonth.forEach((o) => {
    const key = [...o.garmentIds].sort().join(',');
    if (!countMap[key]) countMap[key] = { count: 0, outfit: o };
    countMap[key].count++;
  });
  const best = Object.values(countMap).sort((a, b) => b.count - a.count)[0];
  return { outfit: best.outfit, count: best.count };
}

export function getStreak(outfitMap: OutfitMap): number {
  let streak = 0;
  const checking = new Date();
  while (outfitMap[toDateKey(checking)]) {
    streak++;
    checking.setDate(checking.getDate() - 1);
  }
  return streak;
}

type CalendarContextType = {
  selectedDate: Date;
  currentMonth: Date;
  outfits: OutfitEntry[];
  outfitMap: OutfitMap;
  loading: boolean;

  setSelectedDate: (date: Date) => void;
  setCurrentMonth: (date: Date) => void;
  saveOutfitForDate: (payload: { garmentIds: string[]; date: Date; name?: string }) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [outfits, setOutfits] = useState<OutfitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const outfitMap = buildOutfitMap(outfits);

  useEffect(() => { fetchOutfits(); }, []);

  const normalizeOutfitEntry = (entry: any): OutfitEntry => {
    const garments = Array.isArray(entry?.garments) ? entry.garments : [];
    const derivedPreviewImage = garments.find((garment: any) => garment?.imageUrl)?.imageUrl || '';
    const normalizedGarmentIds = Array.isArray(entry?.garmentIds)
      ? entry.garmentIds.map((id: any) => String(id))
      : [];

    return {
      _id: String(entry?._id || ''),
      userId: String(entry?.userId || ''),
      date: String(entry?.date || ''),
      garmentIds: normalizedGarmentIds,
      previewImage: String(entry?.previewImage || derivedPreviewImage || ''),
      isLookbook: Boolean(entry?.isLookbook),
      garments,
    };
  };

  async function fetchOutfits() {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(buildApiUrl('/api/outfits'), {
        headers: buildAuthHeaders(token),
      });
      const data = await res.json();
      const normalized = Array.isArray(data) ? data.map(normalizeOutfitEntry) : [];
      setOutfits(normalized);
    } catch (e) {
      console.warn('Calendar: could not load outfits (offline?)');
    } finally {
      setLoading(false);
    }
  }

  async function deleteOutfit(id: string) {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await fetch(buildApiUrl(`/api/outfits/${id}`), {
        method: 'DELETE',
        headers: buildAuthHeaders(token),
      });
      setOutfits((prev) => prev.filter((o) => o._id !== id));
    } catch (e) {
      console.error('Calendar: could not delete outfit');
      throw e; 
    }
  }

  async function saveOutfitForDate(payload: { garmentIds: string[]; date: Date; name?: string }) {
    const { garmentIds, date, name } = payload;
    const token = await SecureStore.getItemAsync('userToken');
    
    // Create a date at UTC midnight to avoid timezone shifting
    const dateKey = toDateKey(date);
    const [year, month, day] = dateKey.split('-').map(Number);
    const normalizedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
    
    const res = await fetch(buildApiUrl('/api/outfits'), {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name || 'Outfit',
        garments: garmentIds,
        date: normalizedDate,
      }),
    });

    if (!res.ok) {
      throw new Error('Could not save outfit');
    }

    await fetchOutfits();
  }

  return (
    <CalendarContext.Provider value={{
      selectedDate, currentMonth, outfits, outfitMap, loading,
      setSelectedDate, setCurrentMonth,
      saveOutfitForDate,
      deleteOutfit, refetch: fetchOutfits,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used inside CalendarProvider');
  return ctx;
}

export default function CalendarContextFile() { return null; }