import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import { getAlertPrefs } from '../storage/alertPrefs';
import { toMinutes } from '../utils/time';

// Android-only native module (android/app/src/main/java/com/biit_timetable/alarms).
// iOS doesn't let apps change the ringer, so these features are hidden there.
const { ClassAlarms } = NativeModules;
export const alertsSupported = Platform.OS === 'android' && !!ClassAlarms;

const REMINDER_MINUTES = 10;
const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

// This week's date for `day` at `minutes` past midnight. It may be in the past;
// the native side rolls it forward to the next weekly occurrence.
function weeklyTime(day, minutes) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (DAY_INDEX[day] - now.getDay()));
  d.setMinutes(minutes);
  return d.getTime();
}

function buildEvents(week, { reminders, vibrate }) {
  const events = [];
  let id = 1;

  for (const [day, slots] of Object.entries(week?.days ?? {})) {
    if (!(day in DAY_INDEX)) continue;
    const classes = slots
      .filter((s) => s.status === 'class')
      .map((s) => ({ ...s, startMin: toMinutes(s.start), endMin: toMinutes(s.end) }))
      .sort((a, b) => a.startMin - b.startMin);

    if (reminders) {
      for (const c of classes) {
        events.push({
          id: id++,
          type: 'reminder',
          at: weeklyTime(day, c.startMin - REMINDER_MINUTES),
          title: `${c.subject} in ${REMINDER_MINUTES} minutes`,
          body: [c.room, (c.teachers ?? []).join(', ')].filter(Boolean).join(' · '),
        });
      }
    }

    if (vibrate) {
      // back-to-back classes form one block, so the phone doesn't ring for a moment between them
      const blocks = [];
      for (const c of classes) {
        const last = blocks[blocks.length - 1];
        if (last && c.startMin <= last.end) last.end = Math.max(last.end, c.endMin);
        else blocks.push({ start: c.startMin, end: c.endMin });
      }
      for (const b of blocks) {
        events.push({ id: id++, type: 'vibrate', at: weeklyTime(day, b.start) });
        events.push({ id: id++, type: 'ring', at: weeklyTime(day, b.end) });
      }
    }
  }
  return events;
}

let lastScheduled = null; // skip re-scheduling when nothing changed (refreshes run every few minutes)

// Schedule alarms for this week's timetable according to the saved on/off settings.
export async function syncClassAlerts(week) {
  if (!alertsSupported) return;
  const prefs = await getAlertPrefs();
  const events = week && (prefs.reminders || prefs.vibrate) ? buildEvents(week, prefs) : [];
  const exact = await ClassAlarms.canScheduleExactAlarms();
  const json = JSON.stringify(events);
  const key = `${exact}|${json}`;
  if (key === lastScheduled) return;
  await ClassAlarms.setSchedule(json);
  lastScheduled = key;
}

export async function clearClassAlerts() {
  lastScheduled = null;
  if (alertsSupported) await ClassAlarms.clear();
}

// Android 13+ asks the user before an app may show notifications
export async function requestNotificationPermission() {
  if (Platform.Version < 33) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export const canScheduleExactAlarms = () =>
  alertsSupported ? ClassAlarms.canScheduleExactAlarms() : Promise.resolve(true);

export const openExactAlarmSettings = () => alertsSupported && ClassAlarms.openExactAlarmSettings();
