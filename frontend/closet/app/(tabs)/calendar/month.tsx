// app/calendar/month.tsx
// ─────────────────────────────────────────────────────────────────────────────
// MONTH VIEW for the ClosetDripp calendar.
//
// What it shows:
//   • Month navigation arrows + "Month YYYY" label
//   • Day-of-week header row (Sun Mon Tue ...)
//   • Full calendar grid — day number + tiny outfit thumbnail per cell
//   • "This month" analytics section: most worn outfit + streak
//
// State comes from CalendarProvider via useCalendar().
// To go back to day view: router.back()
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  COLORS, DAYS_SHORT, MONTHS,
  toDateKey, isSameDay,
  getMonthGrid, getMostWornThisMonth, getStreak,
  useCalendar,
} from './calendar-context';

const { width: SW } = Dimensions.get('window');

export default function MonthScreen() {
  const router = useRouter();
  const {
    currentMonth, setCurrentMonth,
    selectedDate, setSelectedDate,
    outfitMap, outfits,
  } = useCalendar();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  const grid = getMonthGrid(year, month);
  const cellSize = Math.floor((SW - 32) / 7);

  const mostWorn = getMostWornThisMonth(outfits, year, month);
  const streak = getStreak(outfitMap);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

      {/* ══════════════════════════════════════════════════════
          MONTH NAVIGATION HEADER
          ══════════════════════════════════════════════════════ */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
      </View>

      {/* Back to day view link */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.hotPink} />
        <Text style={styles.backBtnText}>Day view</Text>
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════
          DAY-OF-WEEK HEADER ROW
          ══════════════════════════════════════════════════════ */}
      <View style={styles.weekHeaderRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={[styles.weekHeaderCell, { width: cellSize }]}>{d}</Text>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════
          CALENDAR GRID
          Tap any day → select it and go back to day view
          ══════════════════════════════════════════════════════ */}
      <View style={styles.gridWrap}>
        {grid.map((day, i) => {
          if (!day) return (
            <View key={`blank-${i}`} style={{ width: cellSize, height: cellSize + 10 }} />
          );

          const key = toDateKey(day);
          const outfit = outfitMap[key];
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <TouchableOpacity
              key={key}
              style={[styles.gridCell, { width: cellSize, height: cellSize + 10 }]}
              onPress={() => {
                setSelectedDate(day);
                router.back(); // go to day view for this date
              }}
            >
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

              {/* Tiny outfit thumbnail */}
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

      {/* ══════════════════════════════════════════════════════
          THIS MONTH ANALYTICS
          ══════════════════════════════════════════════════════ */}
      <View style={styles.analyticsSection}>
        <Text style={styles.analyticsSectionTitle}>This month</Text>

        {/* Most worn outfit */}
        <View style={styles.analyticsCard}>
          {mostWorn ? (
            <Image source={{ uri: mostWorn.previewImage }}
              style={styles.analyticsThumb} resizeMode="cover" />
          ) : (
            <View style={styles.analyticsThumbEmpty}>
              <Ionicons name="shirt-outline" size={22} color={COLORS.lightGray} />
            </View>
          )}
          <View style={styles.analyticsTextWrap}>
            <Text style={styles.analyticsLabel}>Most worn this month</Text>
            <Text style={styles.analyticsValue}>
              {mostWorn ? `${mostWorn.count} days` : 'No data yet'}
            </Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.analyticsCard}>
          <View style={styles.streakBadge}>
            <Ionicons name="star" size={22} color={COLORS.hotPink} />
          </View>
          <View style={styles.analyticsTextWrap}>
            <Text style={styles.analyticsLabel}>
              {streak > 0 ? `${streak} Day streak 🔥` : 'No streak yet'}
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

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  container: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 60 },

  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginBottom: 12 },
  backBtnText: { fontSize: 13, color: COLORS.hotPink, fontWeight: '500' },

  weekHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  weekHeaderCell: { textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.subText },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2, gap: 2 },
  gridDayNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  gridDayNumToday: { backgroundColor: COLORS.lightPink },
  gridDayNumSelected: { backgroundColor: COLORS.hotPink },
  gridDayText: { fontSize: 11, fontWeight: '500', color: COLORS.text },
  gridDayTextToday: { color: COLORS.white, fontWeight: '700' },
  gridDayTextSelected: { color: COLORS.white, fontWeight: '700' },
  gridThumb: { borderRadius: 6, backgroundColor: COLORS.offWhite },

  analyticsSection: { marginTop: 28, gap: 12 },
  analyticsSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  analyticsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.offWhite, borderRadius: 16, padding: 14, gap: 14 },
  analyticsThumb: { width: 52, height: 52, borderRadius: 12 },
  analyticsThumbEmpty: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  streakBadge: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightPink },
  analyticsTextWrap: { flex: 1 },
  analyticsLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  analyticsValue: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
});