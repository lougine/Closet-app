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
    gap: 16 
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
  lastUpdated: { 
    fontSize: 12, 
    color: COLORS.subText 
},
  card: {
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 20, gap: 16,
    shadowColor: COLORS.hotPink, 
    shadowOffset: { 
        width: 0, 
        height: 2 
    },
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 2,
  },
  policySection: { 
    gap: 6 
},
  policyTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.text 
},
  policyBody: { 
    fontSize: 13, 
    color: COLORS.subText, 
    lineHeight: 21 
},
  divider: { 
    height: 1, 
    backgroundColor: COLORS.offWhite 
},
  emailLink: { 
    fontSize: 13, 
    color: COLORS.hotPink, 
    fontWeight: '600' 
},
});
