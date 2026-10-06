import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'alertPrefs';
const DEFAULTS = { reminders: false, vibrate: false };

export async function getAlertPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return DEFAULTS;
  }
}

export const saveAlertPrefs = (prefs) => AsyncStorage.setItem(KEY, JSON.stringify(prefs));
