import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'themeMode';

// Brand green taken from the BIIT logo (#026E3C).
export const palettes = {
  light: {
    primary: '#026E3C',
    primarySoft: '#E4F2EA',
    buttonBg: '#026E3C',
    onButton: '#FFFFFF',
    background: '#F3F7F4',
    card: '#FFFFFF',
    text: '#11241A',
    textMuted: '#5F7166',
    border: '#E0E9E3',
    danger: '#C62828',
    dangerSoft: '#FDECEC',
    warningSoft: '#FFF6E0',
    warningText: '#7A5800',
    header: '#026E3C',
    statusBar: '#FFFFFF',
    headerText: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabInactive: '#8A9A90',
  },
  dark: {
    primary: '#4CC387',
    primarySoft: '#183A27',
    buttonBg: '#1E8A4E',
    onButton: '#FFFFFF',
    background: '#0C1611',
    card: '#15231B',
    text: '#E6F1EA',
    textMuted: '#93A89B',
    border: '#243A2D',
    danger: '#EF6B6B',
    dangerSoft: '#3A1C1C',
    warningSoft: '#3A3018',
    warningText: '#F2D27A',
    header: '#15231B',
    statusBar: '#0C1611',
    headerText: '#E6F1EA',
    tabBar: '#15231B',
    tabInactive: '#6F8577',
  },
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  // 'light' | 'dark' once the user picks one; null = follow the phone's setting
  const [mode, setMode] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark') setMode(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const isDark = (mode ?? systemScheme) === 'dark';

  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? palettes.dark : palettes.light,
      setDarkMode: dark => {
        const next = dark ? 'dark' : 'light';
        setMode(next);
        AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      },
    }),
    [isDark],
  );

  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
