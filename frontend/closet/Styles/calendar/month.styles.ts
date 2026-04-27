import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from '../../context/calendar-context';

export const { width: SW } = Dimensions.get('window');

export const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 60,
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },

  backBtnText: {
    fontSize: 13,
    color: COLORS.hotPink,
    fontWeight: '500',
  },

  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF1F6',
    borderWidth: 1,
    borderColor: '#FFD7E5',
  },

  todayBtnText: {
    fontSize: 12,
    color: COLORS.hotPink,
    fontWeight: '600',
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.offWhite,
  },

  filterChipActive: {
    backgroundColor: '#FFE2EC',
    borderWidth: 1,
    borderColor: '#FFC5D8',
  },

  filterChipText: {
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: COLORS.hotPink,
  },

  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  weekHeaderCell: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.subText,
  },

  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  blankCell: {},

  gridCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 2,
  },

  gridCellMuted: {
    opacity: 0.2,
  },

  gridDayNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  gridDayNumToday: {
    backgroundColor: COLORS.lightPink,
  },

  gridDayNumSelected: {
    backgroundColor: COLORS.hotPink,
  },

  gridDayText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
  },

  gridDayTextToday: {
    color: COLORS.white,
    fontWeight: '700',
  },

  gridDayTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },

  gridThumb: {
    borderRadius: 6,
    backgroundColor: COLORS.offWhite,
  },

  analyticsSection: {
    marginTop: 28,
    gap: 12,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },

  kpiCard: {
    flex: 1,
    backgroundColor: '#FFF1F6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD7E5',
  },

  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.hotPink,
  },

  kpiLabel: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.subText,
    fontWeight: '600',
  },

  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },

  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },

  analyticsThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },

  analyticsThumbEmpty: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },

  streakBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightPink,
  },

  analyticsTextWrap: {
    flex: 1,
  },

  analyticsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  analyticsValue: {
    fontSize: 12,
    color: COLORS.subText,
    marginTop: 2,
  },

  loggedListSection: {
    marginTop: 8,
    gap: 10,
  },

  loggedLookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },

  loggedLookThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.offWhite,
  },

  loggedLookTextWrap: {
    flex: 1,
  },

  loggedLookDay: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  loggedLookDate: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.subText,
  },

  loggedLookEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 8,
  },

  loggedLookEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.subText,
  },
});