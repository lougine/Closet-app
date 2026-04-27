import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');
const ITEM_SIZE = (SW - 40 - 24) / 3;

export function createAnalyticsStyles(isDarkMode: boolean) {
  const palette = isDarkMode
    ? {
        screen: '#121212',
        panel: '#1E1E1E',
        panelSoft: '#242424',
        text: '#F2F2F2',
        subText: '#A8A8A8',
        border: '#343434',
        track: '#2D2D2D',
        insightBg: '#24161E',
        waveFill: '#1E1E1E',
      }
    : {
        screen: COLORS.white,
        panel: COLORS.white,
        panelSoft: COLORS.offWhite,
        text: COLORS.text,
        subText: COLORS.subText,
        border: COLORS.offWhite,
        track: COLORS.lightGray,
        insightBg: '#FFF0F4',
        waveFill: COLORS.white,
      };

  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: palette.screen,
    },
    container: {
      paddingBottom: 20,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.screen,
    },
    headerBg: {
      backgroundColor: COLORS.lightPink,
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 0,
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: COLORS.white,
      marginBottom: 4,
    },
    headerWaveSvg: {
      marginBottom: -1,
    },
    card: {
      backgroundColor: palette.panel,
      borderRadius: 20,
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 14,
      shadowColor: COLORS.hotPink,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
      gap: 10,
      borderWidth: 1,
      borderColor: palette.border,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.subText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
    },
    cardSub: {
      fontSize: 12,
      color: palette.subText,
    },
    secondarySub: {
      fontSize: 11,
      color: palette.subText,
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 14,
    },
    halfCard: {
      flex: 1,
      marginHorizontal: 0,
    },
    bigStat: {
      fontSize: 36,
      fontWeight: '800',
      color: COLORS.hotPink,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.track,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: COLORS.hotPink,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.lightPink,
      marginHorizontal: 20,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      marginBottom: 10,
    },
    sectionHeaderText: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.white,
    },
    totalPill: {
      alignSelf: 'flex-start',
      backgroundColor: palette.panelSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    totalPillText: { fontSize: 12, fontWeight: '600', color: palette.subText },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: 110,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: palette.text,
    },
    categoryBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.panelSoft,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: '100%',
      borderRadius: 4,
      minWidth: 4,
    },
    categoryCount: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.subText,
      width: 28,
      textAlign: 'right',
    },
    colourChartWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    colourLegend: {
      flex: 1,
      paddingLeft: 12,
      gap: 6,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendLabel: {
      fontSize: 12,
      color: palette.text,
      fontWeight: '500',
    },
    favouriteColoursText: {
      fontSize: 13,
      color: palette.subText,
      textAlign: 'center',
      lineHeight: 20,
    },
    colourBold: {
      fontWeight: '800',
    },
    usageSection: {
      marginHorizontal: 20,
      marginBottom: 14,
    },
    bottomSpacer: {
      height: 100,
    },
    usageTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    usageTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
    },
    usageSub: {
      fontSize: 12,
      color: palette.subText,
      marginTop: 2,
    },
    accentLine: {
      width: 40,
      height: 3,
      borderRadius: 2,
    },
    itemGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    itemCell: {
      width: ITEM_SIZE,
      alignItems: 'center',
      gap: 4,
    },
    itemThumb: {
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      borderRadius: 14,
      backgroundColor: palette.panelSoft,
    },
    itemThumbEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    wearBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    wearBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.white,
    },
    itemName: {
      fontSize: 11,
      color: palette.subText,
      textAlign: 'center',
      width: ITEM_SIZE,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: palette.insightBg,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 14,
      gap: 12,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.hotPink,
    },
    insightText: {
      flex: 1,
    },
    insightTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
    },
    insightBody: {
      fontSize: 13,
      color: palette.subText,
      marginTop: 2,
      lineHeight: 20,
    },
    trendHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    trendSelectorWrap: {
      flexDirection: 'row',
      gap: 6,
    },
    trendSelectorPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: palette.panelSoft,
      borderWidth: 1,
      borderColor: palette.track,
    },
    trendSelectorPillActive: {
      backgroundColor: COLORS.hotPink,
      borderColor: COLORS.hotPink,
    },
    trendSelectorText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.subText,
    },
    trendSelectorTextActive: {
      color: COLORS.white,
    },
    trendLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trendTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
      marginTop: 8,
    },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    trendLabel: { width: 56, fontSize: 12, color: palette.subText },
    trendTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.panelSoft,
      overflow: 'hidden',
    },
    trendFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: COLORS.hotPink,
    },
    trendValue: {
      width: 28,
      textAlign: 'right',
      fontSize: 12,
      color: palette.text,
      fontWeight: '700',
    },
    dayTrendWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    dayChip: {
      backgroundColor: palette.panelSoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 58,
      alignItems: 'center',
    },
    dayChipTitle: { fontSize: 11, color: palette.subText, fontWeight: '600' },
    dayChipValue: { fontSize: 13, color: palette.text, fontWeight: '700' },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: palette.subText,
    },
    waveFill: {
      color: palette.waveFill,
    },
  });
}
