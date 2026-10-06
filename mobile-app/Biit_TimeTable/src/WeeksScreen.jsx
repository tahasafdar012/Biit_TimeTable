import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
  useWindowDimensions,
} from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from './theme/ThemeContext';
import { useTimetable } from './timetable/TimetableContext';
import ClassCard from './components/ClassCard';
import StateMessage from './components/StateMessage';
import { todayName, formatUpdatedAt } from './utils/time';

// The API pads evening slots (5 PM onward) with "No Class" entries (status "off"); hide those.
// Free slots before 5 PM (status "free") are kept so gaps between classes show.
const realClasses = list => (list ?? []).filter(item => item.status !== 'off');

// One day's classes; each day is a full-width page in the swipeable pager.
const DayPage = ({ day, classes, isToday, width, updatedAt, refreshing, onRefresh, colors }) => {
  const classCount = classes.filter(item => item.status === 'class').length;
  return (
  <FlatList
    style={{ width }}
    data={classes}
    keyExtractor={(item, i) => `${day}-${item.start}-${i}`}
    contentContainerStyle={styles.list}
    renderItem={({ item }) => <ClassCard item={item} />}
    ListHeaderComponent={
      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, { color: colors.text }]}>{day}</Text>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.todayText, { color: colors.primary }]}>Today</Text>
          </View>
        )}
        <Text style={[styles.dayCount, { color: colors.textMuted }]}>
          {classCount} {classCount === 1 ? 'class' : 'classes'}
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
      <StateMessage icon="cafe-outline" title={`No classes on ${day}`} message="Enjoy your free day!" />
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

const WeeksScreen = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { week, loading, refreshing, error, refresh, retry } = useTimetable();
  const days = week?.days;
  const updatedAt = week?.updatedAt;

  const [selectedDay, setSelectedDay] = useState(null);
  const [barWidth, setBarWidth] = useState(0);

  const pagerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pageIndex = useRef(-1);

  const dayNames = useMemo(() => Object.keys(days ?? {}), [days]);
  const today = todayName();

  // Open on today's tab (or the first day on weekends); keep the user's pick across refreshes.
  useEffect(() => {
    if (dayNames.length && !dayNames.includes(selectedDay)) {
      const day = dayNames.includes(today) ? today : dayNames[0];
      const index = dayNames.indexOf(day);
      setSelectedDay(day);
      // Start the sliding pill on this day, and jump the pager there if it's already showing
      pageIndex.current = index;
      scrollX.setValue(index * width);
      pagerRef.current?.scrollToIndex({ index, animated: false });
    }
  }, [dayNames, selectedDay, today, scrollX, width]);

  const goToDay = day => {
    setSelectedDay(day);
    pagerRef.current?.scrollToIndex({ index: dayNames.indexOf(day), animated: true });
  };

  // While swiping, switch the highlighted day as soon as the next page is more than half in view
  const onPagerScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          if (index !== pageIndex.current && dayNames[index]) {
            pageIndex.current = index;
            setSelectedDay(dayNames[index]);
          }
        },
      }),
    [scrollX, width, dayNames],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!week) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StateMessage
          tone="error"
          icon="cloud-offline-outline"
          title="Couldn't load the timetable"
          message={error}
          actionLabel="Try again"
          onAction={retry}
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

  if (!selectedDay) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  // The green pill slides under the day names in step with the swipe
  const slot = barWidth / dayNames.length;
  const pillTranslate = Animated.multiply(scrollX, width ? slot / width : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.dayBar}>
        <View style={styles.dayRow} onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
          {barWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                { width: slot - 8, backgroundColor: colors.buttonBg, transform: [{ translateX: pillTranslate }] },
              ]}
            />
          )}
          {dayNames.map(day => {
            const active = day === selectedDay;
            return (
              <Pressable key={day} onPress={() => goToDay(day)} style={styles.dayPill}>
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
      </View>

      <Animated.FlatList
        ref={pagerRef}
        data={dayNames}
        keyExtractor={day => day}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(0, dayNames.indexOf(selectedDay))}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={dayNames.length}
        windowSize={dayNames.length * 2 + 1}
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        extraData={{ refreshing, updatedAt, colors }}
        renderItem={({ item: day }) => (
          <DayPage
            day={day}
            classes={realClasses(days[day])}
            isToday={day === today}
            width={width}
            updatedAt={updatedAt}
            refreshing={refreshing}
            onRefresh={refresh}
            colors={colors}
          />
        )}
      />
    </View>
  );
};

export default WeeksScreen;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayBar: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
  dayRow: { flexDirection: 'row' },
  activePill: { position: 'absolute', left: 4, top: 0, bottom: 0, borderRadius: 14 },
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
