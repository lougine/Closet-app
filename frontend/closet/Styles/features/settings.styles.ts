import { StyleSheet } from 'react-native';

export const settingsUI = {
  pageBg: '#8E8E8E',
  sheetBg: '#F4F4F4',
  textPrimary: '#111111',
  textMuted: '#9A9A9A',
  divider: '#E1E1E1',
  iconDark: '#050505',
  chevron: '#676767',
  white: '#FFFFFF',
  danger: '#121212',
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: settingsUI.pageBg,
  },
  headerZone: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: settingsUI.pageBg,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    color: settingsUI.white,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: 0,
  },

  sheet: {
    flex: 1,
    backgroundColor: settingsUI.sheetBg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingTop: 14,
    paddingBottom: 36,
  },

  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DD405C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: settingsUI.textPrimary,
    letterSpacing: 0,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  sectionSpacing: {
    height: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: settingsUI.textMuted,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 24,
  },

  listBlock: {
    backgroundColor: settingsUI.sheetBg,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: settingsUI.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0,
  },
  dangerText: {
    color: settingsUI.danger,
  },

  fullDivider: {
    height: 1,
    backgroundColor: settingsUI.divider,
    marginTop: 8,
    marginBottom: 8,
  },
});
