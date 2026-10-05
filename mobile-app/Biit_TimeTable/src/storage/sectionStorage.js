import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'selectedSection';

export const getSavedSection = () => AsyncStorage.getItem(KEY);
export const saveSection = (section) => AsyncStorage.setItem(KEY, section);
export const clearSection = () => AsyncStorage.removeItem(KEY);
