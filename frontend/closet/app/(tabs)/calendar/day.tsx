// app/calendar/day.tsx
// ─────────────────────────────────────────────────────────────────────────────
// DAY VIEW for the ClosetDripp calendar.
//
// What it shows:
//   • Pink wave header with month/year label + 7-day week strip
//   • If selected day HAS an outfit → outfit image + 3-dot delete menu
//   • If selected day is EMPTY → 3 action buttons (wardrobe / create / discover)
//
// State comes from CalendarProvider via useCalendar() — no props needed.
// To switch to month view: router.push('/calendar/month')
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  COLORS, DAYS_SHORT, MONTHS,
  OutfitEntry,
  toDateKey, isSameDay, getWeekDays,
  useCalendar,
} from './calendar-context';

const { width: SW } = Dimensions.get('window');

export default function DayScreen() {
  const router = useRouter();
  const {
    selectedDate, setSelectedDate, setCurrentMonth,
    outfitMap, loading, deleteOutfit,
  } = useCalendar();

  const [menuVisible, setMenuVisible] = useState(false);

  // The outfit saved for the currently selected day (undefined if none)
  const selectedOutfit = outfitMap[toDateKey(selectedDate)];
  const weekDays = getWeekDays(selectedDate);

  function prevWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  }

  function nextWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  }

  function goToMonth() {
    setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    router.push('/(tabs)/calendar/month');
  }

  function goToStyling(mode: 'wardrobe' | 'create' | 'discover') {
    router.push({
      pathname: '/(tabs)/styling',
      // TODO: update path if your styling screen is elsewhere
      params: { mode, date: toDateKey(selectedDate) },
    });
  }

  async function handleDelete(outfit: OutfitEntry) {
    Alert.alert('Delete Outfit', 'Remove this outfit from your calendar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setMenuVisible(false);
            await deleteOutfit(outfit._id);
          } catch {
            Alert.alert('Error', 'Could not delete outfit. Try again.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>

      {/* ══════════════════════════════════════════════════════
          PINK WAVE HEADER
          ══════════════════════════════════════════════════════ */}
      <View style={styles.headerBg}>

        {/* Month/year row + prev/next week arrows */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={prevWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Tap month label to open month grid view */}
          <TouchableOpacity onPress={goToMonth}>
            <Text style={styles.monthLabel}>
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={nextWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* 7-day week strip */}
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
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {DAYS_SHORT[day.getDay()]}
                </Text>
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
                {/* White dot if this day has an outfit logged */}
                {hasOutfit && <View style={styles.outfitDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wave bottom edge of pink header */}
        {/* TODO: swap for your calendar.png image asset:
            <Image source={require('../../assets/images/calendar.png')}
              style={styles.headerWave} resizeMode="stretch" /> */}
        <Svg width={SW} height={80} viewBox="0 0 1440 320"
          style={styles.headerWave} preserveAspectRatio="none">
          <Path fill={COLORS.white}
            d="M0,160 C400,320 1000,0 1440,220 L1440,320 L0,320 Z" />
        </Svg>
      </View>

      {/* ══════════════════════════════════════════════════════
          CONTENT — outfit card or empty day
          ══════════════════════════════════════════════════════ */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {selectedOutfit ? renderFilledDay() : renderEmptyDay()}
      </ScrollView>
    </View>
  );

  // ─── Filled day: outfit image + 3-dot delete menu ───────────────────────
  function renderFilledDay() {
    return (
      <View style={styles.outfitCard}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.subText} />
        </TouchableOpacity>

        <Image source={{ uri: selectedOutfit!.previewImage }}
          style={styles.outfitImage} resizeMode="contain" />

        {/* Delete confirmation modal */}
        <Modal transparent visible={menuVisible} animationType="fade"
          onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
            onPress={() => setMenuVisible(false)}>
            <View style={styles.menuPopup}>
              <TouchableOpacity style={styles.menuItem}
                onPress={() => handleDelete(selectedOutfit!)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.hotPink} />
                <Text style={styles.menuItemText}>Delete outfit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── Empty day: contextual prompt + 3 action buttons ────────────────────
  function renderEmptyDay() {
    const today = new Date();
    const isPast = selectedDate < today && !isSameDay(selectedDate, today);

    const title = isSameDay(selectedDate, today)
      ? "What's the fit today? ✨"
      : isPast ? 'This day had no look logged.'
      : 'Plan the vibe early. 🎀';

    const subtitle = isSameDay(selectedDate, today)
      ? 'Your closet is waiting.'
      : isPast ? 'Add it retroactively.'
      : 'Future you will thank you.';

    return (
      <View style={styles.emptyDay}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>

        <View style={styles.optionsBlock}>
          {[
            { mode: 'wardrobe' as const, icon: 'shirt-outline', title: 'Add from wardrobe', sub: 'Pick from your saved clothes' },
            { mode: 'create' as const, icon: 'sparkles-outline', title: 'Create new outfit', sub: 'Style something from scratch' },
            { mode: 'discover' as const, icon: 'compass-outline', title: 'Discover new outfits', sub: 'Get inspired by new looks' },
          ].map(({ mode, icon, title, sub }) => (
            <TouchableOpacity key={mode} style={styles.optionBtn} onPress={() => goToStyling(mode)}>
              <View style={styles.optionIconWrap}>
                <Ionicons name={icon as any} size={28} color={COLORS.hotPink} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSub}>{sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },

  // ── Pink wave header ───────────────────────────────────────────────────────
  headerBg: { backgroundColor: COLORS.lightPink, paddingTop: 56, paddingBottom: 0 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  arrowBtn: { padding: 4 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: COLORS.white, letterSpacing: 0.3 },
  headerWave: { marginBottom: -1 },

  // ── Week strip ─────────────────────────────────────────────────────────────
  weekStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingBottom: 8 },
  dayColumn: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  dayName: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  dayNameSelected: { color: COLORS.white, fontWeight: '700' },
  dayBubble: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayBubbleSelected: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  dayBubbleToday: { borderWidth: 1.5, borderColor: COLORS.white },
  dayNumber: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  dayNumberSelected: { color: COLORS.white, fontWeight: '800' },
  dayNumberToday: { color: COLORS.white, fontWeight: '700' },
  outfitDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' },

  // ── Content area ───────────────────────────────────────────────────────────
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  // ── Filled day ─────────────────────────────────────────────────────────────
  outfitCard: { flex: 1, backgroundColor: COLORS.offWhite, borderRadius: 24, padding: 16, minHeight: 400, alignItems: 'center', position: 'relative' },
  menuBtn: { position: 'absolute', top: 14, right: 14, padding: 6, zIndex: 10 },
  outfitImage: { width: '90%', height: 380, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menuPopup: { backgroundColor: COLORS.white, borderRadius: 16, padding: 8, width: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10 },
  menuItemText: { fontSize: 15, color: COLORS.hotPink, fontWeight: '500' },

  // ── Empty day ──────────────────────────────────────────────────────────────
  emptyDay: { flex: 1, justifyContent: 'center', gap: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginTop: 12 },
  emptySubtitle: { fontSize: 15, color: COLORS.subText, textAlign: 'center', marginBottom: 8 },
  optionsBlock: { gap: 12 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.offWhite, borderRadius: 18, padding: 16, gap: 14 },
  optionIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  optionSub: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
});