import { StyleSheet, Text, View, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from './theme/ThemeContext';
import { useTimetable } from './timetable/TimetableContext';
import ClassCard from './components/ClassCard';
import StateMessage from './components/StateMessage';
import { toMinutes, nowMinutes, todayName, todayLabel, formatUpdatedAt } from './utils/time';

// Ticks every 30 s so the highlight moves to the next class without a reload
function useNowMinutes() {
  const [now, setNow] = useState(nowMinutes);
  useEffect(() => {
    const timer = setInterval(() => setNow(nowMinutes()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const HomeScreen = () => {
  const { colors } = useTheme();
  const { section, week, loading, refreshing, error, refresh, retry } = useTimetable();
  const now = useNowMinutes();
  const today = todayName();

  // Today's slots: classes and free slots. Evening "No Class" padding (status "off") is hidden.
  const entries = useMemo(
    () => (week?.days?.[today] ?? []).filter(item => item.status !== 'off'),
    [week, today],
  );
  const classes = entries.filter(item => item.status === 'class');

  // Green border on one card: the class on right now, or else the next class today
  const highlighted =
    classes.find(item => now >= toMinutes(item.start) && now < toMinutes(item.end)) ??
    classes.find(item => toMinutes(item.start) > now);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!week) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <StateMessage
          tone="error"
          icon="cloud-offline-outline"
          title="Couldn't load today's classes"
          message={error}
          actionLabel="Try again"
          onAction={retry}
        />
      </View>
    );
  }

  const header = (
    <View style={[styles.banner, { backgroundColor: colors.buttonBg }]}>
      <View style={styles.bannerRow}>
        <Text style={styles.bannerTitle}>
          {classes.length === 0
            ? 'No classes today'
            : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'} today`}
        </Text>
        <View style={styles.chip}>
          <Ionicons name="school-outline" size={12} color="#FFFFFF" />
          <Text style={styles.chipText} numberOfLines={1}>{section}</Text>
        </View>
      </View>
      <Text style={styles.bannerSub} numberOfLines={1}>
        {todayLabel()}
        {formatUpdatedAt(week.updatedAt) ? ` · Updated ${formatUpdatedAt(week.updatedAt)}` : ''}
      </Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={(item, i) => `${item.start}-${i}`}
      ListHeaderComponent={header}
      extraData={highlighted}
      renderItem={({ item }) => <ClassCard item={item} current={item === highlighted} />}
      ListEmptyComponent={
        <StateMessage
          icon="cafe-outline"
          title="Enjoy your free day!"
          message="There are no classes scheduled for today."
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.card}
        />
      }
    />
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24, flexGrow: 1 },
  banner: { marginHorizontal: 16, marginTop: 12, marginBottom: 14, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 5, flexShrink: 1 },
});
