import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import { Alert, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OutfitPreviewCollage from '../../../components/OutfitPreviewCollage';
import { styles, SW } from '../../../Styles/calendar/month.styles';
import { COLORS, DAYS_SHORT, getMonthGrid, getMostWornThisMonth, getOutfitForDate, getStreak, isSameDay, MONTHS, toDateKey, useCalendar } from '../../../context/calendar-context';
import { useAppTheme } from '../../../context/themeContext';
import { getAppTheme } from '../../../constants/appTheme';

export default function MonthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ garmentIds?: string; outfitName?: string }>();
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [showOnlyLogged, setShowOnlyLogged] = useState(false);
  const { isDarkMode } = useAppTheme();
  const theme = getAppTheme(isDarkMode, {
    dark: {
      card: '#1F1F1F',
      subText: '#A7A7A7',
      border: '#353535',
    },
    light: {
      screen: COLORS.white,
      card: COLORS.offWhite,
      softCard: '#FFF1F6',
      border: '#FFD7E5',
    },
  });

  const { currentMonth, setCurrentMonth, selectedDate, setSelectedDate, outfitMap, outfits, saveOutfitForDate } = useCalendar();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  const grid = getMonthGrid(year, month);
  const cellSize = Math.floor((SW - 32) / 7);
  const weekHeaderCellWidth = useMemo(() => ({ width: cellSize }), [cellSize]);
  const gridCellSize = useMemo(() => ({ width: cellSize, height: cellSize + 10 }), [cellSize]);
  const thumbSize = useMemo(() => ({ width: cellSize - 8, height: cellSize - 8 }), [cellSize]);

  const mostWorn = getMostWornThisMonth(outfits, year, month);
  const streak = getStreak(outfitMap);
  const loggedLooks = useMemo(() => {
    const entries = grid
      .filter((d): d is Date => Boolean(d))
      .map((d) => ({ date: d, outfit: getOutfitForDate(outfitMap, d) }))
      .filter((entry) => Boolean(entry.outfit));

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [grid, outfitMap]);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  function goToAdjacentMonth(direction: 'next' | 'prev') {
    const offset = direction === 'next' ? 1 : -1;
    const target = new Date(year, month + offset, 1);
    setCurrentMonth(target);

    const currentDay = selectedDate.getDate();
    const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(currentDay, maxDay);
    setSelectedDate(new Date(target.getFullYear(), target.getMonth(), clampedDay));
  }

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);
      return horizontalDistance > 14 && horizontalDistance > verticalDistance;
    },
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);
      return horizontalDistance > 18 && horizontalDistance > verticalDistance * 1.2;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx <= -50) {
        goToAdjacentMonth('next');
        return;
      }
      if (gestureState.dx >= 50) {
        goToAdjacentMonth('prev');
      }
    },
  });

  function jumpToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function openOutfitDetail(outfit: any) {
    router.push({
      pathname: '/wardrobe/outfit-detail' as any,
      params: { outfitJson: JSON.stringify(outfit) },
    });
  }

  const handleSaveOutfitToDate = async (date: Date) => {
    if (!params.garmentIds) return;

    setSavingOutfit(true);
    try {
      const garmentIds = JSON.parse(params.garmentIds);
      await saveOutfitForDate({
        garmentIds,
        date,
        name: params.outfitName || 'Outfit',
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save outfit to calendar');
    } finally {
      setSavingOutfit(false);
    }
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.screen }]}
      contentContainerStyle={styles.container}
      {...panResponder.panHandlers}
    >
      
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: theme.text }] }>
          {MONTHS[month]} {year}
        </Text>

        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.hotPink} />
        <Text style={styles.backBtnText}>Day view</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.todayBtn} onPress={jumpToToday}>
        <Ionicons name="today-outline" size={14} color={COLORS.hotPink} />
        <Text style={styles.todayBtnText}>Jump to today</Text>
      </TouchableOpacity>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: isDarkMode ? '#262626' : COLORS.offWhite },
            !showOnlyLogged && styles.filterChipActive,
          ]}
          onPress={() => setShowOnlyLogged(false)}
        >
          <Text style={[styles.filterChipText, { color: theme.subText }, !showOnlyLogged && styles.filterChipTextActive]}>All days</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: isDarkMode ? '#262626' : COLORS.offWhite },
            showOnlyLogged && styles.filterChipActive,
          ]}
          onPress={() => setShowOnlyLogged(true)}
        >
          <Text style={[styles.filterChipText, { color: theme.subText }, showOnlyLogged && styles.filterChipTextActive]}>Looks only</Text>
        </TouchableOpacity>
      </View>
      {showOnlyLogged ? (
        <View style={styles.loggedListSection}>
          {loggedLooks.length > 0 ? loggedLooks.map(({ date, outfit }) => (
            <TouchableOpacity
              key={toDateKey(date)}
              style={[styles.loggedLookCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => openOutfitDetail(outfit)}
            >
              <OutfitPreviewCollage outfit={outfit} style={styles.loggedLookThumb} />
              <View style={styles.loggedLookTextWrap}>
                <Text style={[styles.loggedLookDay, { color: theme.text }]}>
                  {DAYS_SHORT[date.getDay()]} look
                </Text>
                <Text style={[styles.loggedLookDate, { color: theme.subText }]}>
                  {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={[styles.loggedLookEmpty, { backgroundColor: theme.card, borderColor: theme.border }] }>
              <Ionicons name="shirt-outline" size={20} color={theme.subText} />
              <Text style={[styles.loggedLookEmptyText, { color: theme.subText }]}>No logged outfits this month yet.</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={styles.weekHeaderRow}>
            {DAYS_SHORT.map((d) => (
              <Text key={d} style={[styles.weekHeaderCell, weekHeaderCellWidth, { color: theme.subText }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.gridWrap}>
            {grid.map((day, i) => {
              if (!day)
                return (
                  <View
                    key={`blank-${i}`}
                    style={[styles.blankCell, gridCellSize]}
                  />
                );

              const key = toDateKey(day);
              const outfit = getOutfitForDate(outfitMap, day);
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.gridCell,
                    gridCellSize,
                  ]}
                  onPress={() => {
                    setSelectedDate(day);
                    
                    // If saving outfit, do that instead
                    if (params.garmentIds) {
                      handleSaveOutfitToDate(day);
                      return;
                    }
                    
                    router.back();
                  }}
                  onLongPress={() => {
                    if (outfit) openOutfitDetail(outfit);
                  }}
                >
                  <View
                    style={[
                      styles.gridDayNum,
                      isToday && styles.gridDayNumToday,
                      isSelected && styles.gridDayNumSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridDayText,
                        { color: theme.text },
                        isToday && styles.gridDayTextToday,
                        isSelected && styles.gridDayTextSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>

                  {outfit && (
                    <OutfitPreviewCollage
                      outfit={outfit}
                      style={[
                        styles.gridThumb,
                        thumbSize,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.analyticsSection}>
            <Text style={[styles.analyticsSectionTitle, { color: theme.text }]}>This month</Text>

            <View style={[styles.analyticsCard, { backgroundColor: theme.card }] }>
              {mostWorn ? (
                <OutfitPreviewCollage outfit={mostWorn.outfit} style={styles.analyticsThumb} />
              ) : (
                <View style={styles.analyticsThumbEmpty}>
                  <Ionicons name="shirt-outline" size={22} color={COLORS.lightGray} />
                </View>
              )}

              <View style={styles.analyticsTextWrap}>
                <Text style={[styles.analyticsLabel, { color: theme.text }]}>Most worn this month</Text>
                <Text style={[styles.analyticsValue, { color: theme.subText }]}>
                  {mostWorn ? `${mostWorn.count} days` : 'No data yet'}
                </Text>
              </View>
            </View>

            <View style={[styles.analyticsCard, { backgroundColor: theme.card }] }>
              <View style={[styles.streakBadge, { backgroundColor: theme.softCard, borderColor: theme.border }]}>
                <Ionicons name="star" size={22} color={COLORS.hotPink} />
              </View>

              <View style={styles.analyticsTextWrap}>
                <Text style={[styles.analyticsLabel, { color: theme.text }] }>
                  {streak > 0 ? `${streak} Day streak` : 'No streak yet'}
                </Text>
                <Text style={[styles.analyticsValue, { color: theme.subText }] }>
                  {streak > 0
                    ? 'Continuous calendar record'
                    : 'Start logging to build a streak!'}
                </Text>
              </View>
            </View>

          </View>
        </>
      )}
    </ScrollView>
  );
}