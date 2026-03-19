import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OutfitPreviewCollage from '../../../components/OutfitPreviewCollage';
import { styles, SW } from '../../../Styles/calendar/month.styles';
import { COLORS, DAYS_SHORT, getMonthGrid, getMostWornThisMonth, getOutfitForDate, getStreak, isSameDay, MONTHS, toDateKey, useCalendar } from '../../../context/calendar-context';

export default function MonthScreen() {
  const router = useRouter();
  const [showOnlyLogged, setShowOnlyLogged] = useState(false);

  const {
    currentMonth,
    setCurrentMonth,
    selectedDate,
    setSelectedDate,
    outfitMap,
    outfits,
  } = useCalendar();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  const grid = getMonthGrid(year, month);
  const cellSize = Math.floor((SW - 32) / 7);

  const mostWorn = getMostWornThisMonth(outfits, year, month);
  const streak = getStreak(outfitMap);

  const monthStats = useMemo(() => {
    const daysWithOutfit = grid
      .filter((d): d is Date => Boolean(d))
      .filter((d) => Boolean(getOutfitForDate(outfitMap, d)));

    const uniqueDateKeys = new Set(daysWithOutfit.map((d) => toDateKey(d)));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const loggedDays = uniqueDateKeys.size;
    const coverage = daysInMonth > 0 ? Math.round((loggedDays / daysInMonth) * 100) : 0;

    let weekendCount = 0;
    let weekdayCount = 0;
    const weekdayFrequency = [0, 0, 0, 0, 0, 0, 0];

    daysWithOutfit.forEach((d) => {
      const weekday = d.getDay();
      weekdayFrequency[weekday] += 1;
      if (weekday === 0 || weekday === 6) weekendCount += 1;
      else weekdayCount += 1;
    });

    const busiestWeekdayIndex = weekdayFrequency.indexOf(Math.max(...weekdayFrequency));
    const busiestWeekday = loggedDays > 0 ? DAYS_SHORT[busiestWeekdayIndex] : 'N/A';

    return {
      loggedDays,
      coverage,
      weekendCount,
      weekdayCount,
      busiestWeekday,
    };
  }, [grid, month, outfitMap, year]);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

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

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      
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
          style={[styles.filterChip, !showOnlyLogged && styles.filterChipActive]}
          onPress={() => setShowOnlyLogged(false)}
        >
          <Text style={[styles.filterChipText, !showOnlyLogged && styles.filterChipTextActive]}>All days</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, showOnlyLogged && styles.filterChipActive]}
          onPress={() => setShowOnlyLogged(true)}
        >
          <Text style={[styles.filterChipText, showOnlyLogged && styles.filterChipTextActive]}>Looks only</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeaderRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={[styles.weekHeaderCell, { width: cellSize }]}>
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
                style={{ width: cellSize, height: cellSize + 10 }}
              />
            );

          const key = toDateKey(day);
          const outfit = getOutfitForDate(outfitMap, day);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const shouldMute = showOnlyLogged && !outfit;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.gridCell,
                { width: cellSize, height: cellSize + 10 },
                shouldMute && styles.gridCellMuted,
              ]}
              onPress={() => {
                setSelectedDate(day);
                router.back();
              }}
              disabled={shouldMute}
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
                    { width: cellSize - 8, height: cellSize - 8 },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.analyticsSection}>
        <Text style={styles.analyticsSectionTitle}>This month</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthStats.loggedDays}</Text>
            <Text style={styles.kpiLabel}>Logged days</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthStats.coverage}%</Text>
            <Text style={styles.kpiLabel}>Coverage</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthStats.busiestWeekday}</Text>
            <Text style={styles.kpiLabel}>Top day</Text>
          </View>
        </View>

        <View style={styles.analyticsCard}>
          {mostWorn ? (
            <OutfitPreviewCollage outfit={mostWorn.outfit} style={styles.analyticsThumb} />
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

        <View style={styles.analyticsCard}>
          <View style={styles.streakBadge}>
            <Ionicons name="star" size={22} color={COLORS.hotPink} />
          </View>

          <View style={styles.analyticsTextWrap}>
            <Text style={styles.analyticsLabel}>
              {streak > 0 ? `${streak} Day streak` : 'No streak yet'}
            </Text>
            <Text style={styles.analyticsValue}>
              {streak > 0
                ? 'Continuous calendar record'
                : 'Start logging to build a streak!'}
            </Text>
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <View style={styles.streakBadge}>
            <Ionicons name="partly-sunny-outline" size={22} color={COLORS.hotPink} />
          </View>

          <View style={styles.analyticsTextWrap}>
            <Text style={styles.analyticsLabel}>Weekday vs Weekend</Text>
            <Text style={styles.analyticsValue}>
              {monthStats.weekdayCount} weekday looks • {monthStats.weekendCount} weekend looks
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}