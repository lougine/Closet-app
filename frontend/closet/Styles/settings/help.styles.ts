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
    gap: 14 
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
  sectionLabel: {
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.subText,
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginLeft: 4, 
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 18, 
    gap: 12,
    shadowColor: COLORS.hotPink, 
    shadowOffset: { 
        width: 0, 
        height: 2 
    },
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
},
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.text 
},
  cardSub: { 
    fontSize: 13, 
    color: COLORS.subText, 
    lineHeight: 20 
 },
  messageInput: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
  },
  charCount: { 
    fontSize: 11, 
    color: COLORS.lightGray, 
    textAlign: 'right', 
    marginTop: -6 
},
  sendBtn: {
    backgroundColor: COLORS.hotPink,
    borderRadius: 14, 
    paddingVertical: 14,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    shadowColor: COLORS.hotPink, 
    shadowOffset: { 
        width: 0, 
        height: 4 
    },
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 4,
  },
  sendBtnText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.white 
},
  emailNote: { 
    fontSize: 12, 
    color: COLORS.subText, 
    textAlign: 'center' 
},
  emailLink: { 
    color: COLORS.hotPink, 
    fontWeight: '600' 
},
  faqRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqQ: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text, 
    paddingRight: 8 
},
  faqAnswer: {
    paddingBottom: 12,
    paddingTop: 2,
  },
  faqA: { 
    fontSize: 13, 
    color: COLORS.subText, 
    lineHeight: 20 
},
  divider: { 
    height: 1, 
    backgroundColor: COLORS.offWhite 
},
});
