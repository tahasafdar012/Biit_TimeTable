import { StyleSheet, Text, View, Pressable } from 'react-native';
import React from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '../theme/ThemeContext';

// Centered icon + message used for empty, error and "nothing selected" states.
const StateMessage = ({ icon, title, message, actionLabel, onAction, tone = 'normal' }) => {
  const { colors } = useTheme();
  const accent = tone === 'error' ? colors.danger : colors.primary;
  const soft = tone === 'error' ? colors.dangerSoft : colors.primarySoft;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={36} color={accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.buttonBg, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.onButton }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

export default StateMessage;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  button: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
