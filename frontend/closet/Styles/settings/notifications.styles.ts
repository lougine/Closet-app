import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

export const styles = StyleSheet.create({
  scroll: { 
    flex: 1, 
    backgroundColor: COLORS.offWhite 
},
  container: { 
    paddingTop: 60, 
    paddingBottom: 60, 
    paddingHorizontal: 20, 
    gap: 10 
},
  loadingWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.offWhite 
},
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 4 
},
  backBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: COLORS.white, 
    justifyContent: 'center', 
    alignItems: 'center' 
},
  headerSpacer: { 
    width: 36 
},
  pageTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.text 
},
  pageSubtitle: { 
    fontSize: 13, 
    color: COLORS.subText, 
    marginBottom: 8 
},
  sectionLabel: {
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.subText,
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginLeft: 4, 
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: COLORS.hotPink, 
    shadowOffset: { 
        width: 0, 
        height: 2 
    },
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 2,
  },
  notifRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 14,
  },
  notifText: { 
    flex: 1 
},
  notifTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text 
},
  notifSub: { 
    fontSize: 12, 
    color: COLORS.subText, 
    marginTop: 1 
},
  divider: { 
    height: 1, 
    backgroundColor: COLORS.offWhite, 
    marginHorizontal: 16 
},
});
