// calendar.tsx
// This is the full Calendar screen for ClosetDripp.
// It handles 3 views in one file:
//   1. DAY VIEW (empty)   → shown when a day has no outfit saved
//   2. DAY VIEW (filled)  → shown when a day has an outfit image
//   3. MONTH VIEW         → full calendar grid + analytics
//
// Navigation between views is handled by the `view` state variable.
// All API calls are marked with TODO so your team can wire them up.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg'; // for the wavy pink header

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────────────

// This is what one saved outfit looks like (matches your MongoDB collection)
type OutfitEntry = {
  _id: string;           // MongoDB document ID
  userId: string;
  date: string;          // ISO string e.g. "2025-09-13T00:00:00.000Z"
  garmentIds: string[];  // Array of clothing item IDs
  previewImage: string;  // URL to the generated preview image
};

// Which of the 3 views is currently showing
type ViewMode = 'day' | 'month';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Converts a Date to a "YYYY-MM-DD" string for easy comparison
function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Returns true if two dates are the same calendar day
function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

// Returns all the days to display in a month grid (including leading/trailing blanks)
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid: (Date | null)[] = [];

  // Leading blanks (days before the 1st)
  for (let i = 0; i < firstDay.getDay(); i++) {
    grid.push(null);
  }
  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }
  // Trailing blanks to fill the last row
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  return grid;
}

// Returns the 7 days of the week containing a given date (Sun–Sat)
function getWeekDays(date: Date): Date[] {
  const day = date.getDay(); // 0=Sun
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('day');          // 'day' or 'month'
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Currently selected date
  const [currentMonth, setCurrentMonth] = useState(new Date());       // Which month the month-view shows
  const [outfits, setOutfits] = useState<OutfitEntry[]>([]);          // All outfits from backend
  const [loading, setLoading] = useState(true);                       // Loading spinner
  const [menuVisible, setMenuVisible] = useState(false);              // 3-dot delete menu

  // ── Derived data ───────────────────────────────────────────────────────────
  // Build a quick lookup: "YYYY-MM-DD" → OutfitEntry
  const outfitMap: Record<string, OutfitEntry> = {};
  outfits.forEach((o) => {
    const key = toDateKey(new Date(o.date));
    outfitMap[key] = o;
  });

  // The outfit for the currently selected day (undefined if none)
  const selectedOutfit = outfitMap[toDateKey(selectedDate)];

  // The 7 days in the week strip (day view)
  const weekDays = getWeekDays(selectedDate);

  // ── Fetch outfits from backend ─────────────────────────────────────────────
  useEffect(() => {
    fetchOutfits();
  }, []);

  async function fetchOutfits() {
    try {
      setLoading(true);
      // TODO: Replace with your real API URL and userId
      // The userId should come from your auth context / session
      const userId = 'REPLACE_WITH_REAL_USER_ID';
      const response = await fetch(`https://your-api.com/outfits?userId=${userId}`);
      const data = await response.json();
      setOutfits(data); // expects an array of OutfitEntry
    } catch (error) {
      console.error('Failed to fetch outfits:', error);
    } finally {
      setLoading(false);
    }
  }

  // ── Delete an outfit ───────────────────────────────────────────────────────
  async function deleteOutfit(outfitId: string) {
    try {
      // TODO: Replace with your real API URL
      await fetch(`https://your-api.com/outfits/${outfitId}`, { method: 'DELETE' });
      // Remove it from local state immediately (no need to re-fetch)
      setOutfits((prev) => prev.filter((o) => o._id !== outfitId));
      setMenuVisible(false);
    } catch (error) {
      console.error('Failed to delete outfit:', error);
      Alert.alert('Error', 'Could not delete outfit. Try again.');
    }
  }

  // ── Navigate to styling page ───────────────────────────────────────────────
  // Each option button sends the user to the styling page with a different "mode"
  // Your styling page can read the `mode` param to know which tab to open
  function goToStyling(mode: 'wardrobe' | 'create' | 'discover') {
    router.push({
      pathname: '/(tabs)/styling', // TODO: Update this path to your actual styling screen path
      params: {
        mode,                                   // which tab to open on the styling page
        date: toDateKey(selectedDate),          // so the styling page knows which date to save to
      },
    });
  }

  // ── Analytics helpers (for month view) ────────────────────────────────────
  // Returns the outfit worn the most times this month
  function getMostWornThisMonth(): { previewImage: string; count: number } | null {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Filter outfits to this month only
    const thisMonthOutfits = outfits.filter((o) => {
      const d = new Date(o.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if (thisMonthOutfits.length === 0) return null;

    // Count how many times each garment set appears (using sorted garmentIds as key)
    const countMap: Record<string, { count: number; outfit: OutfitEntry }> = {};
    thisMonthOutfits.forEach((o) => {
      const key = [...o.garmentIds].sort().join(',');
      if (!countMap[key]) countMap[key] = { count: 0, outfit: o };
      countMap[key].count++;
    });

    const best = Object.values(countMap).sort((a, b) => b.count - a.count)[0];
    return { previewImage: best.outfit.previewImage, count: best.count };
  }

  // Calculates the current outfit logging streak (consecutive days with an outfit)
  function getStreak(): number {
    const today = new Date();
    let streak = 0;
    let checking = new Date(today);

    while (true) {
      const key = toDateKey(checking);
      if (outfitMap[key]) {
        streak++;
        checking.setDate(checking.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // ── Month navigation ───────────────────────────────────────────────────────
  function prevMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'day' ? renderDayView() : renderMonthView()}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DAY VIEW
  // Shown when user first opens calendar or taps a day in month view.
  // If the day has an outfit → shows the outfit image + 3-dot menu.
  // If the day is empty → shows the 3 option buttons.
  // ─────────────────────────────────────────────────────────────────────────
  function renderDayView() {
    return (
      <View style={styles.flex}>
        {/* ── Pink wavy header containing nav arrows + week strip ── */}
        <View style={styles.dayHeaderBg}>

          {/* Month/year row with arrows */}
          <View style={styles.dayHeader}>
            {/* Left arrow → go back one week */}
            <TouchableOpacity onPress={() => {
              const prev = new Date(selectedDate);
              prev.setDate(prev.getDate() - 7);
              setSelectedDate(prev);
            }}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            {/* Tap month+year text to switch to month grid view */}
            <TouchableOpacity
              onPress={() => {
                setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
                setViewMode('month');
              }}
            >
              <Text style={styles.monthLabel}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </TouchableOpacity>

            {/* Right arrow → go forward one week */}
            <TouchableOpacity onPress={() => {
              const next = new Date(selectedDate);
              next.setDate(next.getDate() + 7);
              setSelectedDate(next);
            }}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Week strip — sits inside the pink block */}
          <View style={styles.weekStrip}>
            {weekDays.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const hasOutfit = !!outfitMap[toDateKey(day)];

              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dayColumn}
                  onPress={() => setSelectedDate(day)}
                >
                  {/* Day name e.g. "Mon" */}
                  <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                    {DAYS_SHORT[day.getDay()]}
                  </Text>

                  {/* Day number bubble:
                      - selected → semi-transparent white circle
                      - today (not selected) → white outline circle
                      - other → nothing */}
                  <View style={[
                    styles.dayBubble,
                    isSelected && styles.dayBubbleSelected,
                    isToday && !isSelected && styles.dayBubbleToday,
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}>
                      {day.getDate()}
                    </Text>
                  </View>

                  {/* Small white dot if this day has an outfit */}
                  {hasOutfit && <View style={styles.outfitDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Wave cut at bottom of pink header — mirrors the signup page wave style */}
          <Svg
            width={SCREEN_WIDTH}
            height={80}
            viewBox="0 0 1440 320"
            style={styles.headerWave}
            preserveAspectRatio="none"
          >
            <Path
              fill={COLORS.white}
              d="M0,160 C400,320 1000,0 1440,220 L1440,320 L0,320 Z"
            />
          </Svg>
        </View>

        {/* ── Content area: outfit or empty state ── */}
        <ScrollView style={styles.flex} contentContainerStyle={styles.dayContent}>
          {selectedOutfit ? renderFilledDay() : renderEmptyDay()}
        </ScrollView>
      </View>
    );
  }

  // ── Filled day: shows the outfit image + 3-dot delete menu ──────────────
  function renderFilledDay() {
    return (
      <View style={styles.outfitCard}>
        {/* 3-dot menu button (top right of card) */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.subText} />
        </TouchableOpacity>

        {/* The outfit preview image */}
        <Image
          source={{ uri: selectedOutfit!.previewImage }}
          style={styles.outfitImage}
          resizeMode="contain"
        />

        {/* ── Delete modal (appears when 3-dot is pressed) ── */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          {/* Dim background — tap anywhere outside to close */}
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            {/* The popup card */}
            <View style={styles.menuPopup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert(
                    'Delete Outfit',
                    'Are you sure you want to remove this outfit?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteOutfit(selectedOutfit!._id),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.hotPink} />
                <Text style={styles.menuItemText}>Delete outfit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  function renderEmptyDay() {
    return (
      <View style={styles.emptyDay}>
        {/* Prompt text — changes based on today / past / future */}
        <Text style={styles.emptyTitle}>
          {isSameDay(selectedDate, new Date())
            ? "What's the fit today? ✨"
            : selectedDate < new Date()
            ? 'This day had no look logged.'
            : 'Plan the vibe early. 🎀'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isSameDay(selectedDate, new Date())
            ? 'Your closet is waiting.'
            : selectedDate < new Date()
            ? 'Add it retroactively.'
            : 'Future you will thank you.'}
        </Text>

        {/* ── Option buttons — centered block ── */}
        <View style={styles.optionsBlock}>
        {/* ── Option 1: Add from wardrobe ── */}
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => goToStyling('wardrobe')}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="shirt-outline" size={28} color={COLORS.hotPink} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Add from wardrobe</Text>
            <Text style={styles.optionSub}>Pick from your saved clothes</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
        </TouchableOpacity>

        {/* ── Option 2: Create new outfit ── */}
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => goToStyling('create')}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="sparkles-outline" size={28} color={COLORS.hotPink} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Create new outfit</Text>
            <Text style={styles.optionSub}>Style something from scratch</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
        </TouchableOpacity>

        {/* ── Option 3: Discover new outfits ── */}
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => goToStyling('discover')}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="compass-outline" size={28} color={COLORS.hotPink} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Discover new outfits</Text>
            <Text style={styles.optionSub}>Get inspired by new looks</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
        </TouchableOpacity>

        </View>{/* end optionsBlock */}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MONTH VIEW
  // Full calendar grid + analytics section below.
  // Tapping a day switches back to day view for that date.
  // ─────────────────────────────────────────────────────────────────────────
  function renderMonthView() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const grid = getMonthGrid(year, month);
    const today = new Date();
    const mostWorn = getMostWornThisMonth();
    const streak = getStreak();

    // Each cell is 1/7 of the screen width
    const cellSize = Math.floor((SCREEN_WIDTH - 32) / 7);

    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.monthContainer}>

        {/* ── Month header: arrows + "Month YYYY" + back to day button ── */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth}>
            <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>
            {MONTHS[month]} {year}
          </Text>

          <TouchableOpacity onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.hotPink} />
          </TouchableOpacity>
        </View>

        {/* Small "back to day view" link */}
        <TouchableOpacity
          style={styles.backToDayBtn}
          onPress={() => setViewMode('day')}
        >
          <Ionicons name="calendar-outline" size={14} color={COLORS.hotPink} />
          <Text style={styles.backToDayText}>Day view</Text>
        </TouchableOpacity>

        {/* ── Day-of-week header row ── */}
        <View style={styles.weekHeaderRow}>
          {DAYS_SHORT.map((d) => (
            <Text key={d} style={[styles.weekHeaderCell, { width: cellSize }]}>
              {d}
            </Text>
          ))}
        </View>

        {/* ── Calendar grid ── */}
        <View style={styles.gridWrap}>
          {grid.map((day, i) => {
            if (!day) {
              // Empty cell (leading/trailing blank)
              return <View key={`blank-${i}`} style={{ width: cellSize, height: cellSize + 10 }} />;
            }

            const key = toDateKey(day);
            const outfit = outfitMap[key];
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <TouchableOpacity
                key={key}
                style={[styles.gridCell, { width: cellSize, height: cellSize + 10 }]}
                onPress={() => {
                  // Tap a day → switch to day view for that date
                  setSelectedDate(day);
                  setViewMode('day');
                }}
              >
                {/* Day number */}
                <View style={[
                  styles.gridDayNum,
                  isToday && styles.gridDayNumToday,
                  isSelected && styles.gridDayNumSelected,
                ]}>
                  <Text style={[
                    styles.gridDayText,
                    isToday && styles.gridDayTextToday,
                    isSelected && styles.gridDayTextSelected,
                  ]}>
                    {day.getDate()}
                  </Text>
                </View>

                {/* Tiny outfit thumbnail if one exists */}
                {outfit && (
                  <Image
                    source={{ uri: outfit.previewImage }}
                    style={[styles.gridThumb, { width: cellSize - 8, height: cellSize - 8 }]}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Analytics section ── */}
        <View style={styles.analyticsSection}>
          <Text style={styles.analyticsSectionTitle}>This month</Text>

          {/* Most worn outfit */}
          {mostWorn ? (
            <View style={styles.analyticsCard}>
              <Image
                source={{ uri: mostWorn.previewImage }}
                style={styles.analyticsThumb}
                resizeMode="cover"
              />
              <View style={styles.analyticsTextWrap}>
                <Text style={styles.analyticsLabel}>Most worn this month</Text>
                <Text style={styles.analyticsValue}>{mostWorn.count} days</Text>
              </View>
            </View>
          ) : (
            <View style={styles.analyticsCard}>
              <View style={styles.analyticsThumbEmpty}>
                <Ionicons name="shirt-outline" size={22} color={COLORS.lightGray} />
              </View>
              <View style={styles.analyticsTextWrap}>
                <Text style={styles.analyticsLabel}>Most worn this month</Text>
                <Text style={styles.analyticsValue}>No data yet</Text>
              </View>
            </View>
          )}

          {/* Streak */}
          <View style={styles.analyticsCard}>
            {/* Star badge for streak */}
            <View style={styles.streakBadge}>
              <Ionicons name="star" size={22} color={COLORS.hotPink} />
            </View>
            <View style={styles.analyticsTextWrap}>
              <Text style={styles.analyticsLabel}>
                {streak > 0 ? `${streak} Day streak` : 'No streak yet'}
              </Text>
              <Text style={styles.analyticsValue}>
                {streak > 0 ? 'Continuous calendar record' : 'Start logging to build a streak!'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    );
  }
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  flex: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },

  // ── Day view wavy pink header ──────────────────────────────────────────────
  dayHeaderBg: {
    backgroundColor: COLORS.lightPink,  // lighter pink for the header block
    paddingTop: 56,
    paddingBottom: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,  // white text on pink background
    letterSpacing: 0.3,
  },
  headerWave: {
    marginBottom: -1, // flush against white content below
  },

  // ── Week strip (inside the pink header) ───────────────────────────────────
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dayName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)', // slightly transparent white on pink bg
    fontWeight: '500',
  },
  dayNameSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  // Selected day: semi-transparent white circle (like pic 2)
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: 'rgba(255,255,255,0.35)', // transparent white circle
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  dayBubbleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)', // white on pink
  },
  dayNumberSelected: {
    color: COLORS.white,
    fontWeight: '800',
  },
  dayNumberToday: {
    color: COLORS.white,
    fontWeight: '700',
  },
  outfitDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  // ── Day content area ───────────────────────────────────────────────────────
  dayContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Filled day (outfit card) ───────────────────────────────────────────────
  outfitCard: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: 24,
    padding: 16,
    minHeight: 400,
    alignItems: 'center',
    position: 'relative',
  },
  menuBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  outfitImage: {
    width: '90%',
    height: 380,
    marginTop: 20,
  },

  // ── Delete modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.hotPink,
    fontWeight: '500',
  },

  // ── Empty day ──────────────────────────────────────────────────────────────
  emptyDay: {
    flex: 1,
    justifyContent: 'center',  // vertically center everything
    gap: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.subText,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Wraps the 3 option buttons — gives them consistent spacing
  optionsBlock: {
    gap: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  optionTextWrap: {
    flex: 1,  // takes remaining space so arrow stays on right
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionSub: {
    fontSize: 12,
    color: COLORS.subText,
    marginTop: 2,
  },

  // ── Month view ─────────────────────────────────────────────────────────────
  monthContainer: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 60,
    backgroundColor: COLORS.white,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backToDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  backToDayText: {
    fontSize: 13,
    color: COLORS.hotPink,
    fontWeight: '500',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekHeaderCell: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.subText,
  },

  // ── Grid ───────────────────────────────────────────────────────────────────
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 2,
  },
  gridDayNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDayNumToday: {
    backgroundColor: COLORS.lightPink,
  },
  gridDayNumSelected: {
    backgroundColor: COLORS.hotPink,
  },
  gridDayText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
  },
  gridDayTextToday: {
    color: COLORS.white,
    fontWeight: '700',
  },
  gridDayTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  gridThumb: {
    borderRadius: 6,
    backgroundColor: COLORS.offWhite,
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  analyticsSection: {
    marginTop: 28,
    gap: 12,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  analyticsThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  analyticsThumbEmpty: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightPink,
  },
  analyticsTextWrap: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  analyticsValue: {
    fontSize: 12,
    color: COLORS.subText,
    marginTop: 2,
  },
});