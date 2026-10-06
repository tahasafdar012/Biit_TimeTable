import { StyleSheet, Text, View, Image, Switch, Pressable, ScrollView, Alert, Linking } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from './theme/ThemeContext';
import { clearSection } from './storage/sectionStorage';
import { clearCachedWeek } from './storage/timetableCache';
import { getAlertPrefs, saveAlertPrefs } from './storage/alertPrefs';
import {
  alertsSupported,
  canScheduleExactAlarms,
  clearClassAlerts,
  openExactAlarmSettings,
  requestNotificationPermission,
  syncClassAlerts,
} from './services/classAlerts';
import { useTimetable } from './timetable/TimetableContext';
import { formatUpdatedAt } from './utils/time';

const logo = require('./assets/logo.png');
const APP_VERSION = require('../package.json').version;

// Without the "Alarms & reminders" permission Android may fire alerts a few minutes late
async function askForExactAlarms() {
  if (await canScheduleExactAlarms()) return;
  Alert.alert(
    'Allow on-time alerts',
    'To switch exactly when a class starts and ends, allow "Alarms & reminders" for BIIT TimeTable.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Allow', onPress: openExactAlarmSettings },
    ],
  );
}

const SettingScreen = ({ navigation }) => {
  const { colors, isDark, setDarkMode } = useTheme();
  const { section, week: timetable } = useTimetable(); // saved copy: version, file name, updatedAt
  const [prefs, setPrefs] = useState({ reminders: false, vibrate: false });

  // reload on every visit in case alert permissions/settings changed outside the app
  useFocusEffect(
    useCallback(() => {
      getAlertPrefs().then(setPrefs);
    }, []),
  );

  const updatePref = async (name, value) => {
    if (value && name === 'reminders' && !(await requestNotificationPermission())) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications for BIIT TimeTable in your phone settings to get class reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const next = { ...prefs, [name]: value };
    setPrefs(next);
    await saveAlertPrefs(next);
    await syncClassAlerts(timetable).catch(() => {});
    if (value) askForExactAlarms();
  };

  const resetSection = () => {
    Alert.alert(
      'Reset section?',
      'You will be taken back to choose your section again. You need internet to pick a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearSection();
            if (section) await clearCachedWeek(section); // reset = start fresh, needs internet again
            await clearClassAlerts().catch(() => {}); // old section's reminders; new ones come with the new section
            // Settings lives inside the tab navigator; reset the root stack above it.
            (navigation.getParent() ?? navigation).reset({
              index: 0,
              routes: [{ name: 'SelectSection' }],
            });
          },
        },
      ],
    );
  };

  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[card, styles.profile]}>
        <View style={styles.logoRing}>
          <Image source={logo} style={styles.logo} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.appName, { color: colors.text }]}>BIIT TimeTable</Text>
          <View style={[styles.sectionChip, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="school-outline" size={13} color={colors.primary} />
            <Text style={[styles.sectionChipText, { color: colors.primary }]}>{section ?? 'No section'}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.groupTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
      <View style={card}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Dark mode</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>{isDark ? 'On' : 'Off'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.border, true: colors.buttonBg }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text style={[styles.groupTitle, { color: colors.textMuted }]}>SECTION</Text>
      <View style={card}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="people" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Current section</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>{section ?? 'Not selected'}</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={resetSection}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="refresh" size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.danger }]}>Reset section</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Choose a different section</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.groupTitle, { color: colors.textMuted }]}>TIMETABLE</Text>
      <View style={card}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Current Timetable Version</Text>
            {/* the version comes from the PDF's file name; show the name when it has none */}
            <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
              {(!timetable?.version && timetable?.fileName) ||
                (formatUpdatedAt(timetable?.updatedAt)
                  ? `Updated ${formatUpdatedAt(timetable.updatedAt)}`
                  : 'Not downloaded yet')}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{timetable?.version ?? '—'}</Text>
          </View>
        </View>
      </View>

      {alertsSupported && (
        <>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
          <View style={card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Class Reminders</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Alert 10 minutes before each class starts
                </Text>
              </View>
              <Switch
                value={prefs.reminders}
                onValueChange={v => updatePref('reminders', v)}
                trackColor={{ false: colors.border, true: colors.buttonBg }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Vibrate During Class</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Switch to vibrate when a class starts, ring again when it ends
                </Text>
              </View>
              <Switch
                value={prefs.vibrate}
                onValueChange={v => updatePref('vibrate', v)}
                trackColor={{ false: colors.border, true: colors.buttonBg }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </>
      )}

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Barani Institute of Information Technology{'\n'}Version {APP_VERSION}
      </Text>
    </ScrollView>
  );
};

export default SettingScreen;

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  flex: { flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 58, height: 58, borderRadius: 29 },
  appName: { fontSize: 18, fontWeight: '800' },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionChipText: { fontSize: 12, fontWeight: '700', marginLeft: 5 },
  groupTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 28, lineHeight: 18 },
});
