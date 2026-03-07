import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../../Styles/calendar/day.styles';
import { COLORS, DAYS_SHORT, getWeekDays, isSameDay, MONTHS, OutfitEntry, toDateKey, useCalendar } from '../../../context/calendar-context';

export default function DayScreen() {
  const router = useRouter();

  const {
    selectedDate,
    setSelectedDate,
    setCurrentMonth,
    outfitMap,
    loading,
    deleteOutfit,
  } = useCalendar();

  const [menuVisible, setMenuVisible] = useState(false);

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
    setCurrentMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
    router.push('/(tabs)/calendar/month');
  }

  function goToIndex(mode: 'wardrobe') {
    router.push({
      pathname: '/(tabs)',
      params: { mode, date: toDateKey(selectedDate), tab: 'outfits' },
    });
  }

  function goToStyling(mode: 'create' | 'discover' | 'randomize') {
    router.push({
      pathname: '/(tabs)/styling',
      params: { mode, date: toDateKey(selectedDate) },
    });
  }

  async function handleDelete(outfit: OutfitEntry) {
    Alert.alert('Delete Outfit', 'Remove this outfit from your calendar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
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
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={prevWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={22} color={"#000"} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToMonth}>
            <Text style={styles.monthLabel}>
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={nextWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={22} color={"#000"} />
          </TouchableOpacity>
        </View>

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
                <Text
                  style={[styles.dayName, isSelected && styles.dayNameSelected]}
                >
                  {DAYS_SHORT[day.getDay()]}
                </Text>

                <View
                  style={[
                    styles.dayBubble,
                    isSelected && styles.dayBubbleSelected,
                    isToday && !isSelected && styles.dayBubbleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>

                {hasOutfit && <View style={styles.outfitDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Image
          source={require('../../../assets/images/calendar.png')}
          style={styles.headerWave}
          resizeMode="stretch"
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
      >
        {selectedOutfit ? renderFilledDay() : renderEmptyDay()}
      </ScrollView>
    </View>
  );

  function renderFilledDay() {
    return (
      <View style={styles.outfitCard}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={COLORS.subText}
          />
        </TouchableOpacity>

        <Image
          source={{ uri: selectedOutfit!.previewImage }}
          style={styles.outfitImage}
          resizeMode="contain"
        />

        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuPopup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDelete(selectedOutfit!)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={COLORS.hotPink}
                />
                <Text style={styles.menuItemText}>Delete outfit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  function renderEmptyDay() {
    const today = new Date();
    const isPast =
      selectedDate < today && !isSameDay(selectedDate, today);

    const title = isSameDay(selectedDate, today)
      ? "What's the fit today?"
      : isPast
      ? 'This day had no look logged.'
      : 'Plan the vibe early.';

    const subtitle = isSameDay(selectedDate, today)
      ? 'Your closet is waiting.'
      : isPast
      ? 'Add it retroactively.'
      : 'Future you will thank you.';

    return (
      <View style={styles.emptyDay}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>

        <View style={styles.optionsBlock}>
          {[
            {
              mode: 'wardrobe' as const,
              icon: 'shirt-outline',
              title: 'Add from wardrobe',
              sub: 'Pick from your saved clothes',
            },
            {
              mode: 'create' as const,
              icon: 'sparkles-outline',
              title: 'Create new outfit',
              sub: 'Style something from scratch',
            },
            {
              mode: 'discover' as const,
              icon: 'compass-outline',
              title: 'Discover new outfits',
              sub: 'Get inspired by new looks',
            },
          ].map(({ mode, icon, title, sub }) => (
            <TouchableOpacity
              key={mode}
              style={styles.optionBtn}
              onPress={() => {
                if (mode === 'wardrobe') goToIndex('wardrobe');
                else if (mode === 'discover') goToStyling('randomize');
                else goToStyling(mode);
              }}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name={icon as any} size={28} color={COLORS.hotPink} />
              </View>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSub}>{sub}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.lightGray}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
}