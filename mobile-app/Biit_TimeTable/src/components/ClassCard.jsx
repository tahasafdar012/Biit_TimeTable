import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '../theme/ThemeContext';

// One timetable slot. Slots whose status isn't "class" (breaks, free periods) render muted.
// `current` gives the card a green border (the class happening right now).
const ClassCard = ({ item, current = false }) => {
  const { colors } = useTheme();
  const isClass = !item.status || item.status === 'class';
  const isFree = item.status === 'free';
  const teachers = (item.teachers ?? []).join(', ');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isFree && styles.freeCard,
        current && { borderColor: colors.primary, borderWidth: 2 },
      ]}
    >
      <View style={[styles.timeCol, { backgroundColor: isClass ? colors.primarySoft : colors.background }]}>
        <Text style={[styles.time, { color: isClass ? colors.primary : colors.textMuted }]}>{item.start}</Text>
        <View style={[styles.timeLine, { backgroundColor: isClass ? colors.primary : colors.border }]} />
        <Text style={[styles.timeEnd, { color: colors.textMuted }]}>{item.end}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.subject, { color: isClass ? colors.text : colors.textMuted }]} numberOfLines={2}>
          {item.subject}
        </Text>
        {isFree && (
          <Text style={[styles.freeNote, { color: colors.textMuted }]}>No class in this period</Text>
        )}
        {isClass && !!teachers && (
          <View style={styles.row}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>{teachers}</Text>
          </View>
        )}
        {isClass && !!item.room && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>{item.room}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ClassCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  freeNote: { fontSize: 13, marginTop: 3 },
  freeCard: { borderStyle: 'dashed', elevation: 0, shadowOpacity: 0 },
  timeCol: { width: 76, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  time: { fontSize: 14, fontWeight: '800' },
  timeLine: { width: 2, height: 12, borderRadius: 1, marginVertical: 4 },
  timeEnd: { fontSize: 12, fontWeight: '600' },
  body: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, justifyContent: 'center' },
  subject: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  meta: { fontSize: 13, marginLeft: 6, flexShrink: 1 },
});
