import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
};

export type OutfitMap = Record<string, OutfitEntry>; 

export function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function buildOutfitMap(outfits: OutfitEntry[]): OutfitMap {
  const map: OutfitMap = {};
  outfits.forEach((o) => { map[toDateKey(new Date(o.date))] = o; });
  return map;
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
): { previewImage: string; count: number } | null {
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
  return { previewImage: best.outfit.previewImage, count: best.count };
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
  deleteOutfit: (id: string) => Promise<void>;
  refetch: () => void;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [outfits, setOutfits] = useState<OutfitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const outfitMap = buildOutfitMap(outfits);

  useEffect(() => { fetchOutfits(); }, []);

  async function fetchOutfits() {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/outfits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOutfits(data);
    } catch (e) {
      console.warn('Calendar: could not load outfits (offline?)');
    } finally {
      setLoading(false);
    }
  }

  async function deleteOutfit(id: string) {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      await fetch(`https://your-api.com/outfits/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setOutfits((prev) => prev.filter((o) => o._id !== id));
    } catch (e) {
      console.error('Calendar: could not delete outfit');
      throw e; 
    }
  }

  return (
    <CalendarContext.Provider value={{
      selectedDate, currentMonth, outfits, outfitMap, loading,
      setSelectedDate, setCurrentMonth,
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