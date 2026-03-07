import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from '../../app/(tabs)/calendar/calendar-context';

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

  gridCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 2,
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
});