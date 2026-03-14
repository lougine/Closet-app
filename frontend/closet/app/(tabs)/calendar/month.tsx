import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles, SW } from '../../../Styles/calendar/month.styles';
import { COLORS, DAYS_SHORT, getMonthGrid, getMostWornThisMonth, getStreak, isSameDay, MONTHS, toDateKey, useCalendar } from '../../../context/calendar-context';

export default function MonthScreen() {
  const router = useRouter();

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

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
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
          const outfit = outfitMap[key];
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <TouchableOpacity
              key={key}
              style={[styles.gridCell, { width: cellSize, height: cellSize + 10 }]}
              onPress={() => {
                setSelectedDate(day);
                router.back();
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
                <Image
                  source={{ uri: outfit.previewImage }}
                  style={[
                    styles.gridThumb,
                    { width: cellSize - 8, height: cellSize - 8 },
                  ]}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.analyticsSection}>
        <Text style={styles.analyticsSectionTitle}>This month</Text>

        <View style={styles.analyticsCard}>
          {mostWorn ? (
            <Image
              source={{ uri: mostWorn.previewImage }}
              style={styles.analyticsThumb}
              resizeMode="cover"
            />
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
      </View>
    </ScrollView>
  );
}