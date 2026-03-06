// app/settings/personal-info.tsx
// Personal Information page — lets user fill in body/lifestyle details.
// Fields: age, height (cm), weight (kg), body type, style preference.
// All saved via PUT /users/me to your backend.
//
// Changes from previous version:
//   • Age restricted to max 3 digits (0–120)
//   • Height restricted to max 3 digits (0–999 cm, reasonable 50–250)
//   • Weight restricted to max 3 digits (0–999 kg, reasonable 20–300)
//   • "Failed to load" error now silent — shows empty fields instead of toast

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const COLORS = {
  white: '#FFFFFF', offWhite: '#F6F6F6', lightGray: '#D9D9D9',
  lightPink: '#FB92BD', hotPink: '#F0507B', text: '#1A1A1A', subText: '#888888',
};

const STYLE_OPTIONS = [
  'Casual', 'Streetwear', 'Minimalist', 'Feminine', 'Preppy',
  'Boho', 'Sporty', 'Vintage', 'Edgy', 'Romantic',
];

const BODY_TYPES = ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle'];

type PersonalInfo = {
  age: string;
  heightCm: string;
  weightKg: string;
  bodyType: string;
  stylePreferences: string[];
};

// ─── INPUT VALIDATION ─────────────────────────────────────────────────────────

// Age: max 2 digits, between 1–99
function filterAge(val: string): string {
  const digits = val.replace(/[^0-9]/g, '').slice(0, 2);
  const num = parseInt(digits);
  if (!digits) return '';
  if (num > 99) return '99';
  return digits;
}

// Height: max 3 digits, between 1–272 cm (tallest human ever was 272cm)
function filterHeight(val: string): string {
  const digits = val.replace(/[^0-9]/g, '').slice(0, 3);
  const num = parseInt(digits);
  if (!digits) return '';
  if (num > 272) return '272';
  return digits;
}

// Weight: max 3 digits, between 1–300 kg
function filterWeight(val: string): string {
  const digits = val.replace(/[^0-9]/g, '').slice(0, 3);
  const num = parseInt(digits);
  if (!digits) return '';
  if (num > 300) return '300';
  return digits;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function PersonalInfoScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<PersonalInfo>({
    age: '', heightCm: '', weightKg: '', bodyType: '', stylePreferences: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInfo(); }, []);

  async function fetchInfo() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) { setLoading(false); return; }

      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) { setLoading(false); return; } // silently show empty form

      const data = await res.json();
      setInfo({
        age: data.age?.toString() ?? '',
        heightCm: data.heightCm?.toString() ?? '',
        weightKg: data.weightKg?.toString() ?? '',
        bodyType: data.bodyType ?? '',
        stylePreferences: data.stylePreferences ?? [],
      });
    } catch (e) {
      // Network error — silently show empty form, no toast
      console.warn('PersonalInfo: could not load (offline?)');
    } finally {
      setLoading(false);
    }
  }

  function toggleStyle(style: string) {
    setInfo((prev) => ({
      ...prev,
      stylePreferences: prev.stylePreferences.includes(style)
        ? prev.stylePreferences.filter((s) => s !== style)
        : [...prev.stylePreferences, style],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: info.age ? parseInt(info.age) : null,
          heightCm: info.heightCm ? parseInt(info.heightCm) : null,
          weightKg: info.weightKg ? parseInt(info.weightKg) : null,
          bodyType: info.bodyType || null,
          stylePreferences: info.stylePreferences,
        }),
      });
      if (!res.ok) throw new Error();
      Alert.alert('Saved!', 'Your information has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Personal Information</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.pageSubtitle}>
        This helps us give you better outfit recommendations. 🎀
      </Text>

      {/* ── Basics ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Basics</Text>

        {/* Age — max 3 digits, 1–120 */}
        <InputField
          label="Age"
          value={info.age}
          onChangeText={(v) => setInfo((p) => ({ ...p, age: filterAge(v) }))}
          placeholder="e.g. 22"
          unit="yrs"
          hint="Max 99"
          maxLen={2}
        />
        <Divider />

        {/* Height — max 3 digits, 1–272 cm */}
        <InputField
          label="Height"
          value={info.heightCm}
          onChangeText={(v) => setInfo((p) => ({ ...p, heightCm: filterHeight(v) }))}
          placeholder="e.g. 165"
          unit="cm"
          hint="Max 272"
        />
        <Divider />

        {/* Weight — max 3 digits, 1–300 kg */}
        <InputField
          label="Weight"
          value={info.weightKg}
          onChangeText={(v) => setInfo((p) => ({ ...p, weightKg: filterWeight(v) }))}
          placeholder="e.g. 58"
          unit="kg"
          hint="Max 300"
        />
      </View>

      {/* ── Body type ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Type</Text>
        <Text style={styles.cardSub}>Select the one that fits you best</Text>
        <View style={styles.chipsWrap}>
          {BODY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, info.bodyType === type && styles.chipSelected]}
              onPress={() => setInfo((p) => ({ ...p, bodyType: type }))}
            >
              <Text style={[styles.chipText, info.bodyType === type && styles.chipTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Style preferences ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Style Preferences</Text>
        <Text style={styles.cardSub}>Pick all that describe you</Text>
        <View style={styles.chipsWrap}>
          {STYLE_OPTIONS.map((style) => (
            <TouchableOpacity
              key={style}
              style={[styles.chip, info.stylePreferences.includes(style) && styles.chipSelected]}
              onPress={() => toggleStyle(style)}
            >
              <Text style={[
                styles.chipText,
                info.stylePreferences.includes(style) && styles.chipTextSelected,
              ]}>
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Save button ── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.saveBtnText}>Save changes</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Reusable inline input row ─────────────────────────────────────────────────
function InputField({
  label, value, onChangeText, placeholder, unit, hint, maxLen = 3,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; unit?: string; hint?: string; maxLen?: number;
}) {
  return (
    <View style={styles.inputRow}>
      <View>
        <Text style={styles.inputLabel}>{label}</Text>
        {hint && <Text style={styles.inputHint}>{hint}</Text>}
      </View>
      <View style={styles.inputRight}>
        <TextInput
          style={styles.inlineInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={COLORS.lightGray}
          textAlign="right"
          maxLength={maxLen}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.offWhite },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  pageSubtitle: { fontSize: 13, color: COLORS.subText, marginBottom: 4 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 18, gap: 12,
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.subText, marginTop: -6 },

  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  inputHint: { fontSize: 10, color: COLORS.lightGray, marginTop: 1 },
  inputRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineInput: { fontSize: 15, color: COLORS.text, minWidth: 60, textAlign: 'right' },
  unit: { fontSize: 13, color: COLORS.subText, width: 28 },
  divider: { height: 1, backgroundColor: COLORS.offWhite },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.offWhite, borderWidth: 1.5, borderColor: COLORS.lightGray,
  },
  chipSelected: { backgroundColor: COLORS.lightPink, borderColor: COLORS.hotPink },
  chipText: { fontSize: 13, color: COLORS.subText, fontWeight: '500' },
  chipTextSelected: { color: COLORS.hotPink, fontWeight: '700' },

  saveBtn: {
    backgroundColor: COLORS.hotPink, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});