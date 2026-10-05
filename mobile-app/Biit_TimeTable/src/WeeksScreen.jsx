import { StyleSheet, Text, View, ActivityIndicator, FlatList, Pressable, RefreshControl } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { getWeek } from './services/api';
import { useTheme } from './theme/ThemeContext';
import ClassCard from './components/ClassCard';
import StateMessage from './components/StateMessage';
import useAutoRefresh, { formatUpdatedAt } from './hooks/useAutoRefresh';

const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

const WeeksScreen = ({ route }) => {
  const { section } = route.params ?? {};
  const { colors } = useTheme();

  const [days, setDays] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!section) {
      setError('No section selected');
      return;
    }
    try {
      const data = await getWeek(section);
      setDays(data?.days ?? {});
      setUpdatedAt(data?.updatedAt ?? null);
      setError(null);
    } catch (err) {
      // A server error means the old data is no longer valid (e.g. section removed)
      if (err.response) setDays(null);
      setError(err.response?.data?.error || err.message);
    }
  }, [section]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useAutoRefresh(load);

  const dayNames = useMemo(() => Object.keys(days ?? {}), [days]);
  const today = todayName();

  // Open on today's tab (or the first day on weekends); keep the user's pick across refreshes.
  useEffect(() => {
    if (dayNames.length && !dayNames.includes(selectedDay)) {
      setSelectedDay(dayNames.includes(today) ? today : dayNames[0]);
    }
  }, [dayNames, selectedDay, today]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !days) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StateMessage
          tone="error"
          icon="cloud-offline-outline"
          title="Couldn't load the timetable"
          message={error}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </View>
    );
  }

  if (dayNames.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StateMessage icon="calendar-outline" title="No classes this week" message="Your weekly timetable is empty." />
      </View>
    );
  }

  // The API pads evening slots (5 PM onward) with "No Class" entries (status "off"); only show real classes there.
  const classes = (days?.[selectedDay] ?? []).filter(item => item.status !== 'off');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.dayBar}>
        {dayNames.map(day => {
          const active = day === selectedDay;
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[styles.dayPill, active && { backgroundColor: colors.buttonBg }]}
            >
              <Text style={[styles.dayText, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                {day.slice(0, 3).toUpperCase()}
              </Text>
              {/* small dot marks today when it isn't the selected tab */}
              <View
                style={[
                  styles.todayDot,
                  { backgroundColor: day === today && !active ? colors.primary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item, i) => `${selectedDay}-${item.start}-${i}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ClassCard item={item} />}
        ListHeaderComponent={
          <View style={styles.dayHeader}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{selectedDay}</Text>
            {selectedDay === today && (
              <View style={[styles.todayBadge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.todayText, { color: colors.primary }]}>Today</Text>
              </View>
            )}
            <Text style={[styles.dayCount, { color: colors.textMuted }]}>
              {classes.length} {classes.length === 1 ? 'slot' : 'slots'}
            </Text>
          </View>
        }
        ListFooterComponent={
          formatUpdatedAt(updatedAt) ? (
            <View style={styles.updated}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.updatedText, { color: colors.textMuted }]}>
                Timetable updated {formatUpdatedAt(updatedAt)}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <StateMessage icon="cafe-outline" title={`No classes on ${selectedDay}`} message="Enjoy your free day!" />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
      />
    </View>
  );
};

export default WeeksScreen;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 14,
  },
  dayText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  list: { paddingBottom: 24, flexGrow: 1 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dayTitle: { fontSize: 18, fontWeight: '800' },
  todayBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  todayText: { fontSize: 11, fontWeight: '800' },
  dayCount: { marginLeft: 'auto', fontSize: 12, fontWeight: '600' },
  updated: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 },
  updatedText: { fontSize: 12, marginLeft: 5 },
});
