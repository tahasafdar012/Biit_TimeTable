import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (section) => `timetable:${section}`;

export async function saveCachedWeek(section, data) {
  await AsyncStorage.setItem(keyFor(section), JSON.stringify(data));
}

export async function getCachedWeek(section) {
  const raw = await AsyncStorage.getItem(keyFor(section));
  return raw ? JSON.parse(raw) : null;
}

export const clearCachedWeek = (section) => AsyncStorage.removeItem(keyFor(section));
