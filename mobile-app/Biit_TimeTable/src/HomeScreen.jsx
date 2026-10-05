import { StyleSheet, Text, View, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { getWeek } from './services/api';
import { useTheme } from './theme/ThemeContext';
import ClassCard from './components/ClassCard';
import StateMessage from './components/StateMessage';
import useAutoRefresh, { formatUpdatedAt } from './hooks/useAutoRefresh';

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

const HomeScreen = ({ route }) => {
  const { section } = route.params ?? {};
  const { colors } = useTheme();
  const [entries, setEntries] = useState([]);
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
      // Same week data as the Schedule tab (saved for offline); pick out today's classes.
      // Evening "No Class" padding (status "off") isn't a class, so it's left out.
      const data = await getWeek(section);
      setEntries((data?.days?.[todayName()] ?? []).filter(item => item.status !== 'off'));
      setUpdatedAt(data?.updatedAt ?? null);
      setError(null);
    } catch (err) {
      // A server error means the old data is no longer valid (e.g. section removed)
      if (err.response) setEntries([]);
      setError(err.response?.data?.error || err.message);
    }
  }, [section]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useAutoRefresh(load);

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

  if (error && entries.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StateMessage
          tone="error"
          icon="cloud-offline-outline"
          title="Couldn't load today's classes"
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

  const header = (
    <View style={[styles.banner, { backgroundColor: colors.buttonBg }]}>
      <Text style={styles.bannerDate}>{todayLabel()}</Text>
      <Text style={styles.bannerTitle}>
        {entries.length === 0
          ? 'No classes today'
          : `${entries.length} ${entries.length === 1 ? 'class' : 'classes'} today`}
      </Text>
      <View style={styles.chip}>
        <Ionicons name="school-outline" size={14} color="#FFFFFF" />
        <Text style={styles.chipText}>{section}</Text>
      </View>
      {!!formatUpdatedAt(updatedAt) && (
        <Text style={styles.updated}>Timetable updated {formatUpdatedAt(updatedAt)}</Text>
      )}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={(item, i) => `${item.day}-${item.start}-${i}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => <ClassCard item={item} />}
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
          onRefresh={onRefresh}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24, flexGrow: 1 },
  banner: { margin: 16, marginBottom: 20, padding: 20, borderRadius: 18 },
  bannerDate: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  bannerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  updated: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 12 },
});
