import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchWeek, isServerRejection, errorMessage } from '../services/api';
import { getCachedWeek, saveCachedWeek } from '../storage/timetableCache';
import { syncClassAlerts } from '../services/classAlerts';
import { UPDATE_CHECK_INTERVAL_MS } from '../config';

/*
 * Offline-first timetable for the selected section, shared by every tab.
 *
 *  1. On start, the saved copy on the phone is shown immediately — no internet needed.
 *  2. Then the server is checked in the background: on start, whenever the app comes
 *     back to the foreground, every few minutes while open, and on pull-to-refresh.
 *  3. Only a timetable that actually changed is saved and re-plans class alerts.
 *
 * The only other time the app needs internet is picking a section (downloadTimetable).
 */

// Download a section's timetable, save it for offline use and plan its class alerts.
// Used when the user picks a section, and by background update checks.
export async function downloadTimetable(section, current = null) {
  const week = await fetchWeek(section, current?.etag);
  if (!week) return current; // server says nothing changed since `current`
  await saveCachedWeek(section, week);
  syncClassAlerts(week).catch(() => {}); // never block the timetable on alarm setup
  return week;
}

const TimetableContext = createContext(null);

export function TimetableProvider({ section, children }) {
  const [week, setWeek] = useState(null); // { updatedAt, version, days: { Monday: [...] } }
  const [loading, setLoading] = useState(true); // nothing to show yet
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh spinner
  const [error, setError] = useState(null); // only set when it should be shown to the user

  const weekRef = useRef(null); // latest week, for update checks without re-creating callbacks
  const checking = useRef(false); // one update check at a time

  const showWeek = useCallback(next => {
    weekRef.current = next;
    setWeek(next);
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const latest = await downloadTimetable(section, weekRef.current);
      if (latest !== weekRef.current) showWeek(latest);
      setError(null);
    } catch (err) {
      if (isServerRejection(err)) {
        // e.g. the section was removed in a new upload: the saved copy is no longer valid
        showWeek(null);
        setError(errorMessage(err));
      } else if (!weekRef.current) {
        // offline with nothing saved — the only time being offline is a problem
        setError(errorMessage(err));
      }
      // offline with a saved copy: keep showing it quietly
    } finally {
      checking.current = false;
    }
  }, [section, showWeek]);

  // Show the saved copy first, then check the server
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getCachedWeek(section).catch(() => null);
      if (cancelled) return;
      if (saved) {
        showWeek(saved);
        setLoading(false);
        checkForUpdate();
      } else {
        await checkForUpdate();
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section, showWeek, checkForUpdate]);

  // Check again when the app returns to the foreground, and every few minutes while it's open
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkForUpdate();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [checkForUpdate]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await checkForUpdate();
    setRefreshing(false);
  }, [checkForUpdate]);

  // "Try again" from an error screen
  const retry = useCallback(async () => {
    setLoading(true);
    await checkForUpdate();
    setLoading(false);
  }, [checkForUpdate]);

  const value = { section, week, loading, refreshing, error, refresh, retry };
  return <TimetableContext.Provider value={value}>{children}</TimetableContext.Provider>;
}

export const useTimetable = () => useContext(TimetableContext);
