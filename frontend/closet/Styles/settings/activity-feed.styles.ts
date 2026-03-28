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
    gap: 8 
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
  loadingIndicator: { 
    marginTop: 40 
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
  groupLabel: {
    fontSize: 12, 
    fontWeight: '700', 
    color: COLORS.subText,
    textTransform: 'uppercase', 
    letterSpacing: 1,
    marginTop: 12, 
    marginBottom: 6, 
    marginLeft: 4,
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
  activityRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 14,
  },
  activityText: { 
    flex: 1 
},
  activityDesc: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: COLORS.text, 
    lineHeight: 20 
},
  activityTime: { 
    fontSize: 12, 
    color: COLORS.subText, 
    marginTop: 2 
},
  divider: { 
    height: 1, 
    backgroundColor: COLORS.offWhite, 
    marginHorizontal: 16 
},
  emptyState: {
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 60, 
    gap: 12,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.text 
},
  emptySub: { 
    fontSize: 14, 
    color: COLORS.subText, 
    textAlign: 'center', 
    lineHeight: 22 
 },
});
