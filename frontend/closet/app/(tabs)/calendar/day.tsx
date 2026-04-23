import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, PanResponder, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OutfitPreviewCollage from '../../../components/OutfitPreviewCollage';
import { styles } from '../../../Styles/calendar/day.styles';
import { COLORS, DAYS_SHORT, getOutfitForDate, getWeekDays, isSameDay, MONTHS, OutfitEntry, toDateKey, useCalendar } from '../../../context/calendar-context';
import { useAppTheme } from '../../../context/themeContext';
import { getAppTheme } from '../../../constants/appTheme';

export default function DayScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const theme = getAppTheme(isDarkMode, {
    dark: {
      card: '#1F1F1F',
      subText: '#A7A7A7',
      border: '#353535',
    },
    light: {
      screen: '#F6F6F6',
      card: '#F6F6F6',
      softCard: '#F6F6F6',
      border: '#FFD7E5',
    },
  });

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const outfitPreviewBackground = isDarkMode ? '#1c1c1c' : '#f4f4f4';
  const outfitPreviewEmptyBackground = isDarkMode ? '#2b2b2b' : '#ececec';

  async function handlePullRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

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

  function goToAdjacentDay(direction: 'next' | 'prev') {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
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

  function goToStyling(mode: 'create' | 'discover' | 'randomize' | 'ai-recommended', outfit?: OutfitEntry) {
    router.push({
      pathname: '/(tabs)/styling',
      params: { 
        mode, 
        date: toDateKey(selectedDate),
        outfitJson: outfit ? JSON.stringify(outfit) : undefined,
      },
    });
  }

  function goToOutfitsIndex() {
    router.push({
      pathname: '/(tabs)' as any,
      params: {
        tab: 'outfits',
        pickForCalendar: '1',
      },
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
        previewImage: outfit.previewImage,
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
    goToStyling('create', selectedOutfit);
  }

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);
      return horizontalDistance > 14 && horizontalDistance > verticalDistance;
    },
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const isHorizontalSwipe = Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
      return isHorizontalSwipe;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx <= -50) {
        goToAdjacentDay('next');
        return;
      }
      if (gestureState.dx >= 50) {
        goToAdjacentDay('prev');
      }
    },
  });

  if (loading && !isRefreshing) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.screen }]}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.screen }]} {...panResponder.panHandlers}>
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
                onPress={() => {
                  setSelectedDate(day);
                }}
              >
                <Text
                  style={[
                    styles.dayName,
                    isSelected && styles.dayNameSelected,
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

        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.secondaryQuickBtn} onPress={() => goToNearestOutfit('prev')}>
            <Ionicons name="chevron-back-circle-outline" size={14} color="#FFFFFF" />
            <Text style={styles.secondaryQuickText}>Previous look</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryQuickBtn} onPress={() => goToNearestOutfit('next')}>
            <Text style={styles.secondaryQuickText}>Next look</Text>
            <Ionicons name="chevron-forward-circle-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>
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
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#F0507B"
            colors={["#F0507B"]}
            progressViewOffset={140}
          />
        }
      >
        <View>
          {selectedOutfit ? renderFilledDay() : renderEmptyDay()}
        </View>
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
          {selectedOutfit?.previewImage || selectedOutfit?.garments?.some((garment) => garment?.imageUrl)
            ? (
              <OutfitPreviewCollage
                outfit={selectedOutfit}
                style={styles.outfitImage}
                previewBackgroundColor={outfitPreviewBackground}
                emptyBackgroundColor={outfitPreviewEmptyBackground}
              />
            )
            : (
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
              action: 'outfits' as const,
              title: 'Add from wardrobe',
              subtitle: 'Pick a saved fit from your closet.',
            },
            {
              action: 'create' as const,
              title: 'Create new outfit',
              subtitle: 'Build a fresh look for this day.',
            },
            {
              action: 'randomize' as const,
              title: 'Discover new outfits',
              subtitle: 'Let us suggest a random combo.',
            },
            {
              action: 'ai-recommended' as const,
              title: 'AI Recommended outfits',
              subtitle: 'Get smart picks based on your style.',
            },
          ].map(({ action, title, subtitle }) => (
            <TouchableOpacity
              key={action}
              style={styles.optionBtn}
              onPress={() => {
                if (action === 'outfits') goToOutfitsIndex();
                else if (action === 'create') goToStyling('create');
                else if (action === 'randomize') goToStyling('discover');
                else if (action === 'ai-recommended') goToStyling('ai-recommended');
              }}
            >
              <View style={styles.optionTextWrap}>
                <View style={styles.optionTextGroup}>
                  <View style={styles.optionTitleRow}>
                    <Ionicons name="star" size={14} color="#FFFFFF" style={styles.optionIcon} />
                    <Text style={styles.optionTitle}>{title}</Text>
                  </View>
                  <Text style={styles.optionSubtitle}>{subtitle}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
}
