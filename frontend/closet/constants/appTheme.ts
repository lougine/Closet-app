import { COLORS } from './theme';

export type AppTheme = {
  screen: string;
  card: string;
  softCard: string;
  text: string;
  subText: string;
  border: string;
  inputBg: string;
  iconInactive: string;
  itemCard: string;
  itemEmpty: string;
};

export type WardrobePanelTheme = {
  panelBg: string;
  panelCard: string;
  panelText: string;
  panelSubText: string;
  panelBorder: string;
  panelIconBtnBg: string;
  panelBadgeBg: string;
};

type AppThemeOverrides = {
  light?: Partial<AppTheme>;
  dark?: Partial<AppTheme>;
};

const lightTheme: AppTheme = {
  screen: COLORS.offWhite,
  card: COLORS.white,
  softCard: '#FFF1F6',
  text: COLORS.text,
  subText: COLORS.subText,
  border: COLORS.offWhite,
  inputBg: COLORS.white,
  iconInactive: '#6F6F6F',
  itemCard: COLORS.white,
  itemEmpty: '#F5F5F5',
};

const darkTheme: AppTheme = {
  screen: '#121212',
  card: '#1E1E1E',
  softCard: '#252525',
  text: '#F2F2F2',
  subText: '#A8A8A8',
  border: '#343434',
  inputBg: '#2A2A2A',
  iconInactive: '#8E8E8E',
  itemCard: '#212121',
  itemEmpty: '#2B2B2B',
};

export function getAppTheme(
  isDarkMode: boolean,
  overrides?: AppThemeOverrides,
): AppTheme {
  const baseTheme = isDarkMode ? darkTheme : lightTheme;
  const scopedOverrides = isDarkMode ? overrides?.dark : overrides?.light;
  return {
    ...baseTheme,
    ...scopedOverrides,
  };
}

export function getWardrobePanelTheme(isDarkMode: boolean): WardrobePanelTheme {
  if (isDarkMode) {
    return {
      panelBg: '#121212',
      panelCard: '#1E1E1E',
      panelText: '#F2F2F2',
      panelSubText: '#A7A7A7',
      panelBorder: '#343434',
      panelIconBtnBg: '#242424',
      panelBadgeBg: '#1E1E1E',
    };
  }

  return {
    panelBg: '#FFFFFF',
    panelCard: '#FFFFFF',
    panelText: '#1A1A1A',
    panelSubText: '#777777',
    panelBorder: '#EAEAEA',
    panelIconBtnBg: '#FFFFFF',
    panelBadgeBg: '#FFFFFF',
  };
}

export function getGarmentSearchTheme(isDarkMode: boolean): AppTheme {
  return getAppTheme(isDarkMode, {
    dark: {
      card: '#1F1F1F',
      subText: '#A7A7A7',
      border: '#353535',
      inputBg: '#252525',
      itemCard: '#1E1E1E',
      itemEmpty: '#2A2A2A',
    },
    light: {
      screen: '#FFFFFF',
      card: '#F5F5F5',
      subText: '#6E6E6E',
      border: '#E8E8E8',
      inputBg: '#FAFAFA',
      itemCard: '#FFFFFF',
      itemEmpty: '#F4F4F4',
    },
  });
}
