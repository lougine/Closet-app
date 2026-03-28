import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OutfitPreviewCollage from '../../../components/OutfitPreviewCollage';
import { styles } from '../../../Styles/calendar/day.styles';
import { COLORS, DAYS_SHORT, getOutfitForDate, getWeekDays, isSameDay, MONTHS, OutfitEntry, toDateKey, useCalendar } from '../../../context/calendar-context';
import { useAppTheme } from '../../../context/themeContext';

export default function DayScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const theme = isDarkMode
    ? {
        screen: '#121212',
        card: '#1F1F1F',
        softCard: '#252525',
        text: '#F2F2F2',
        subText: '#A7A7A7',
        border: '#353535',
      }
    : {
        screen: COLORS.white,
        card: COLORS.offWhite,
        softCard: COLORS.white,
        text: COLORS.text,
        subText: COLORS.subText,
        border: '#FFD7E5',
      };

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
      <View style={[styles.loadingWrap, { backgroundColor: theme.screen }]}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.screen }]}>
      <View style={[styles.headerBg, { backgroundColor: isDarkMode ? '#1A1A1A' : undefined }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={prevWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToMonth}>
            <Text style={[styles.monthLabel, { color: theme.text }] }>
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={nextWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
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
                  style={[
                    styles.dayName,
                    { color: theme.subText },
                    isSelected && styles.dayNameSelected,
                    isSelected && { color: theme.text },
                  ]}
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
                      { color: theme.subText },
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
        style={[styles.flex, { backgroundColor: theme.screen }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.hotPink} />
        }
      >
        <View style={styles.quickActionRow}>
          <TouchableOpacity style={[styles.secondaryQuickBtn, { backgroundColor: theme.softCard }]} onPress={() => goToNearestOutfit('prev')}>
            <Ionicons name="chevron-back-circle-outline" size={14} color={theme.subText} />
            <Text style={[styles.secondaryQuickText, { color: theme.subText }]}>Previous look</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryQuickBtn, { backgroundColor: theme.softCard }]} onPress={() => goToNearestOutfit('next')}>
            <Text style={[styles.secondaryQuickText, { color: theme.subText }]}>Next look</Text>
            <Ionicons name="chevron-forward-circle-outline" size={14} color={theme.subText} />
          </TouchableOpacity>
        </View>

        {selectedOutfit ? renderFilledDay() : renderEmptyDay()}
      </ScrollView>
    </View>
  );

  function renderFilledDay() {
    return (
      <View style={[styles.outfitCard, { backgroundColor: theme.card }] }>
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
            <View style={[styles.outfitImage, styles.outfitImagePlaceholder]}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.lightGray} />
              <Text style={[styles.outfitSavedText, { color: theme.subText }]}>Outfit saved</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.outfitMetaRow}>
          <View style={[styles.outfitMetaPill, { backgroundColor: theme.softCard }] }>
            <Ionicons name="shirt-outline" size={14} color={theme.subText} />
            <Text style={[styles.outfitMetaText, { color: theme.subText }]}>{selectedOutfit?.garmentIds?.length || 0} items</Text>
          </View>
          <View style={[styles.outfitMetaPill, { backgroundColor: theme.softCard }] }>
            <Ionicons name="calendar-outline" size={14} color={theme.subText} />
            <Text style={[styles.outfitMetaText, { color: theme.subText }]}>{selectedDate.toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.outfitActionRow}>
          <TouchableOpacity style={[styles.outfitActionBtn, { backgroundColor: theme.softCard, borderColor: theme.border }]} onPress={() => goToStyling('create')}>
            <Ionicons name="color-wand-outline" size={16} color={COLORS.hotPink} />
            <Text style={styles.outfitActionText}>Re-style day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outfitActionBtn, { backgroundColor: theme.softCard, borderColor: theme.border }]} onPress={() => goToStyling('randomize')}>
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
            <View style={[styles.menuPopup, { backgroundColor: theme.softCard }] }>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEditInStyling}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={COLORS.subText}
                />
                <Text style={[styles.menuItemTextNeutral, { color: theme.text }]}>Edit in styling</Text>
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
                <Text style={[styles.menuItemTextNeutral, { color: theme.text }]}>Duplicate to tomorrow</Text>
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
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: theme.subText }]}>{subtitle}</Text>

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
              style={[styles.optionBtn, { backgroundColor: theme.card }]}
              onPress={() => {
                if (mode === 'wardrobe') goToStyling('create');
                else if (mode === 'discover') goToStyling('randomize');
                else goToStyling(mode);
              }}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: theme.softCard }]}>
                <Ionicons name={icon as any} size={28} color={COLORS.hotPink} />
              </View>

              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.optionSub, { color: theme.subText }]}>{sub}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.subText}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
}