import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_PREFERENCE_KEY = 'appThemePreference';

type ThemeContextValue = {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      try {
        const stored = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
        if (isMounted && stored) {
          setIsDarkMode(stored === 'dark');
        }
      } catch {
        // If storage fails, app falls back to light mode.
      }
    }

    loadPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  async function setDarkMode(value: boolean) {
    setIsDarkMode(value);
    try {
      await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, value ? 'dark' : 'light');
    } catch {
      // Ignore persistence failure; UI state still updates.
    }
  }

  async function toggleDarkMode() {
    await setDarkMode(!isDarkMode);
  }

  const contextValue = useMemo(
    () => ({ isDarkMode, setDarkMode, toggleDarkMode }),
    [isDarkMode],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}
