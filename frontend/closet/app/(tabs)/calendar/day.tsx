import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OutfitPreviewCollage from '../../../components/OutfitPreviewCollage';
import { styles } from '../../../Styles/calendar/day.styles';
import { COLORS, DAYS_SHORT, getOutfitForDate, getWeekDays, isSameDay, MONTHS, OutfitEntry, toDateKey, useCalendar } from '../../../context/calendar-context';

export default function DayScreen() {
  const router = useRouter();

  const {
    selectedDate,
    setSelectedDate,
    setCurrentMonth,
    outfitMap,
    saveOutfitForDate,
    refetch,
    loading,
    deleteOutfit,
  } = useCalendar();

  const [menuVisible, setMenuVisible] = useState(false);

  const selectedOutfit = getOutfitForDate(outfitMap, selectedDate);
  const weekDays = getWeekDays(selectedDate);

  function prevWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function nextWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function jumpToDay(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function jumpToToday() {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function goToNearestOutfit(direction: 'next' | 'prev') {
    const step = direction === 'next' ? 1 : -1;
    const probe = new Date(selectedDate);

    for (let i = 0; i < 365; i++) {
      probe.setDate(probe.getDate() + step);
      const outfit = getOutfitForDate(outfitMap, probe);
      if (outfit) {
        const nextDate = new Date(probe);
        setSelectedDate(nextDate);
        setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        return;
      }
    }

    Alert.alert('No outfits found', `There are no ${direction === 'next' ? 'future' : 'previous'} outfit entries yet.`);
  }

  function goToMonth() {
    setCurrentMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
    router.push('/(tabs)/calendar/month');
  }

  function goToStyling(mode: 'create' | 'discover' | 'randomize') {
    router.push({
      pathname: '/(tabs)/styling',
      params: { mode, date: toDateKey(selectedDate) },
    });
  }

  function openOutfitDetail(outfit: OutfitEntry) {
    router.push({
      pathname: '/wardrobe/outfit-detail' as any,
      params: { outfitJson: JSON.stringify(outfit) },
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

  async function handleDuplicateToTomorrow(outfit: OutfitEntry) {
    if (!outfit?.garmentIds?.length) {
      Alert.alert('Unavailable', 'This outfit has no items to duplicate.');
      return;
    }

    const targetDate = new Date(selectedDate);
    targetDate.setDate(targetDate.getDate() + 1);

    try {
      setMenuVisible(false);
      await saveOutfitForDate({
        garmentIds: outfit.garmentIds,
        date: targetDate,
        name: 'Duplicated outfit',
      });
      setSelectedDate(targetDate);
      setCurrentMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
      Alert.alert('Saved', 'Outfit duplicated to tomorrow.');
    } catch {
      Alert.alert('Error', 'Could not duplicate outfit. Try again.');
    }
  }

  function handleEditInStyling() {
    setMenuVisible(false);
    goToStyling('create');
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
            const hasOutfit = !!getOutfitForDate(outfitMap, day);

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
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.hotPink} />
        }
      >
        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => jumpToDay(-1)}>
            <Ionicons name="arrow-back-outline" size={14} color={COLORS.hotPink} />
            <Text style={styles.quickActionText}>Yesterday</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={jumpToToday}>
            <Ionicons name="today-outline" size={14} color={COLORS.hotPink} />
            <Text style={styles.quickActionText}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={() => jumpToDay(1)}>
            <Text style={styles.quickActionText}>Tomorrow</Text>
            <Ionicons name="arrow-forward-outline" size={14} color={COLORS.hotPink} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.secondaryQuickBtn} onPress={() => goToNearestOutfit('prev')}>
            <Ionicons name="chevron-back-circle-outline" size={14} color={COLORS.subText} />
            <Text style={styles.secondaryQuickText}>Previous look</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryQuickBtn} onPress={() => goToNearestOutfit('next')}>
            <Text style={styles.secondaryQuickText}>Next look</Text>
            <Ionicons name="chevron-forward-circle-outline" size={14} color={COLORS.subText} />
          </TouchableOpacity>
        </View>

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

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => openOutfitDetail(selectedOutfit!)}
        >
          {selectedOutfit?.previewImage || selectedOutfit?.garments?.some((garment) => garment?.imageUrl) ? (
            <OutfitPreviewCollage outfit={selectedOutfit} style={styles.outfitImage} />
          ) : (
            <View style={[styles.outfitImage, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.lightGray} />
              <Text style={{ marginTop: 8, color: COLORS.subText, fontSize: 12 }}>Outfit saved</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.outfitMetaRow}>
          <View style={styles.outfitMetaPill}>
            <Ionicons name="shirt-outline" size={14} color={COLORS.subText} />
            <Text style={styles.outfitMetaText}>{selectedOutfit?.garmentIds?.length || 0} items</Text>
          </View>
          <View style={styles.outfitMetaPill}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.subText} />
            <Text style={styles.outfitMetaText}>{selectedDate.toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.outfitActionRow}>
          <TouchableOpacity style={styles.outfitActionBtn} onPress={() => goToStyling('create')}>
            <Ionicons name="color-wand-outline" size={16} color={COLORS.hotPink} />
            <Text style={styles.outfitActionText}>Re-style day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outfitActionBtn} onPress={() => goToStyling('randomize')}>
            <Ionicons name="shuffle-outline" size={16} color={COLORS.hotPink} />
            <Text style={styles.outfitActionText}>Remix outfit</Text>
          </TouchableOpacity>
        </View>

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
                onPress={handleEditInStyling}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={COLORS.subText}
                />
                <Text style={styles.menuItemTextNeutral}>Edit in styling</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDuplicateToTomorrow(selectedOutfit!)}
              >
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={COLORS.subText}
                />
                <Text style={styles.menuItemTextNeutral}>Duplicate to tomorrow</Text>
              </TouchableOpacity>

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
                if (mode === 'wardrobe') goToStyling('create');
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