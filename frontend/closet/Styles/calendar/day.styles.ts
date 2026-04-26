import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from '../../context/calendar-context';

export const { width: SW } = Dimensions.get('window');

const HEADER_H = 140;

export const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: '#F6F6F6' 
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
  },
 headerBgLight: {
  height: HEADER_H,
  position: 'relative',
},
headerBgDark: {
  height: HEADER_H,
  position: 'relative',
},
  headerWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW,
    height: HEADER_H,
    zIndex: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
    zIndex: 1,
  },
  arrowBtn: { 
    padding: 4 
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
    marginTop: 15,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 4,
    zIndex: 1,
    marginTop: 5,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dayName: {
    fontSize: 14,
    color: '#444444',
    fontWeight: '600',
  },
  dayNameSelected: {
    color: '#494949',
    fontWeight: '700',
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: '#FB92BD',
  },
  dayBubbleToday: {
    borderWidth: 1.5,
    borderColor: "#F0507B",
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3a3838',
  },
  dayNumberSelected: {
    color: '#534c4c',
    fontWeight: '600',
  },
  dayNumberToday: {
    color: "#F0507B",
    fontWeight: '700',
  },
  outfitDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 40,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
    paddingHorizontal: 20,
    zIndex: 1,
    transform: [{ translateY: 0 }],
  },
  secondaryQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    backgroundColor: '#F0507B',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  secondaryQuickText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  outfitCard: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: 24,
    padding: 16,
    minHeight: 400,
    alignItems: 'center',
    position: 'relative',
  },
  menuBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  outfitImage: {
    width: '90%',
    height: 380,
    marginTop: 20,
  },
  outfitImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitMetaRow: {
    marginTop: 16,
    width: '90%',
    flexDirection: 'row',
    gap: 4,
  },
  outfitMetaPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  outfitMetaText: {
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: '600',
  },
  outfitActionRow: {
    marginTop: 12,
    width: '90%',
    flexDirection: 'row',
    gap: 4,
  },
  outfitActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  outfitActionText: {
    fontSize: 12,
    color: COLORS.hotPink,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.hotPink,
    fontWeight: '500',
  },
  menuItemTextNeutral: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 14,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.subText,
    textAlign: 'center',
    marginBottom: 8,
  },
  optionsBlock: {
    gap: 12,
  },
  optionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    backgroundColor: '#FB92BD',
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '72%',
    alignSelf: 'center',
  },
  optionTextWrap: { 
    width: '100%', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextGroup: {
    alignItems: 'flex-start',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#FFE6EF',
    fontWeight: '500',
    textAlign: 'left',
  },
});