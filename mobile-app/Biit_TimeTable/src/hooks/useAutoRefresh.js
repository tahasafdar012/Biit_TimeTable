import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// While the app is open on this screen, check for a newly uploaded timetable this often
const POLL_MS = 2 * 60 * 1000;

// Re-fetch when the user comes back to this tab or reopens the app, and every few
// minutes while the screen is open, so a timetable the admin re-uploads shows up
// without needing to pull-to-refresh. Offline, each refresh just falls back to the
// saved copy, and the first refresh after the internet returns picks up the update.
export default function useAutoRefresh(refresh) {
  const skipFirstFocus = useRef(true); // the screen's own initial load covers the first focus

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) skipFirstFocus.current = false;
      else refresh();

      // poll only while this tab is visible and the app is in the foreground
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') refresh();
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
}

export const formatUpdatedAt = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
