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
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 8 
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
  sectionLabel: {
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.subText,
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginLeft: 4, 
    marginTop: 10, 
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 18, 
    gap: 14,
    shadowColor: COLORS.hotPink, 
    shadowOffset: { 
        width: 0, 
        height: 2 
    },
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 2,
  },
  pwRow: { 
    gap: 6 
},
  fieldLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.subText, 
    textTransform: 'uppercase', 
    letterSpacing: 0.8 
},
  pwInputWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1.5, 
    borderBottomColor: COLORS.lightGray 
},
  pwInput: { 
    flex: 1, 
    fontSize: 16, 
    color: COLORS.text, 
    paddingVertical: 6 
},
  eyeBtn: {
    padding: 6 
},
  pwHint: { 
    fontSize: 12, 
    color: COLORS.subText 
},
  saveBtn: {
    backgroundColor: COLORS.hotPink, 
    borderRadius: 14, 
    paddingVertical: 14,
    alignItems: 'center', 
    shadowColor: COLORS.hotPink,
    shadowOffset: { 
        width: 0, 
        height: 4 
    }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 4,
  },
  saveBtnDisabled: { 
    opacity: 0.6 
},
  saveBtnText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.white 
},

  toggleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
},
  toggleText: { 
    flex: 1 
},
  toggleTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text 
},
  toggleSub: { 
    fontSize: 12, 
    color: COLORS.subText, 
    marginTop: 2 
},
  divider: { 
    height: 1, 
    backgroundColor: COLORS.offWhite 
},
  deleteRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
},
  deleteText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.hotPink 
 },
});
