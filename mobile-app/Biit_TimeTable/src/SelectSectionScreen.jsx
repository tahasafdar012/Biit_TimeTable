import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { downloadWeek, getSections } from './services/api';
import { saveSection } from './storage/sectionStorage';
import { useTheme } from './theme/ThemeContext';
import StateMessage from './components/StateMessage';

const logo = require('./assets/logo.png');

const SelectSectionScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSections()
      .then(list => setSections(list ?? []))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sections.filter(s => s.toLowerCase().includes(q)) : sections;
  }, [sections, query]);

  const confirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Download the timetable now so the app works offline from the first launch
      await downloadWeek(selected);
      await saveSection(selected);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { section: selected } }] });
    } catch (err) {
      setSaveError(
        err.response?.data?.error || "Couldn't download the timetable. Check your internet and try again.",
      );
      setSaving(false);
    }
  };

  let body;
  if (loading) {
    body = <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
  } else if (error) {
    body = (
      <StateMessage
        tone="error"
        icon="cloud-offline-outline"
        title="Couldn't load sections"
        message={error}
        actionLabel="Try again"
        onAction={load}
      />
    );
  } else if (sections.length === 0) {
    body = <StateMessage icon="school-outline" title="No sections available" />;
  } else {
    body = (
      <>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search section, e.g. BSCS-6A"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="characters"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={s => s}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.noMatch, { color: colors.textMuted }]}>No section matches "{query}"</Text>
          }
          renderItem={({ item }) => {
            const active = item === selected;
            return (
              <Pressable
                onPress={() => {
                  setSelected(item);
                  setSaveError(null);
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name="people-outline" size={18} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.optionText, { color: colors.text }, active && { fontWeight: '800' }]}>
                  {item}
                </Text>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? colors.primary : colors.border}
                />
              </Pressable>
            );
          }}
        />
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.buttonBg, paddingTop: insets.top + 24 }]}>
        <View style={styles.logoRing}>
          <Image source={logo} style={styles.logo} />
        </View>
        <Text style={styles.appName}>BIIT TimeTable</Text>
        <Text style={styles.tagline}>Barani Institute of Information Technology</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.heading, { color: colors.text }]}>Select your section</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          You can change it anytime from Settings.
        </Text>
        {body}
      </View>

      {!loading && !error && sections.length > 0 && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {!!saveError && (
            <Text style={[styles.saveError, { color: colors.danger }]}>{saveError}</Text>
          )}
          <Pressable
            onPress={confirm}
            disabled={!selected || saving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.buttonBg, opacity: !selected ? 0.45 : pressed || saving ? 0.85 : 1 },
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={[styles.buttonText, { marginLeft: 10 }]}>Downloading timetable…</Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonText}>{selected ? `Continue with ${selected}` : 'Choose a section'}</Text>
                {!!selected && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />}
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default SelectSectionScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    alignItems: 'center',
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: { width: 100, height: 100, borderRadius: 50 },
  appName: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 14 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  heading: { fontSize: 20, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 15 },
  noMatch: { textAlign: 'center', marginTop: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 10 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveError: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
