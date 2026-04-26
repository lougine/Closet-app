import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, fetchApiWithFallback } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/context/themeContext';

const STYLE_OPTIONS = [
  'Casual', 'Streetwear', 'Minimalist', 'Feminine', 'Preppy',
  'Boho', 'Sporty', 'Vintage', 'Edgy', 'Romantic',
];

const BODY_TYPES = ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle'];
const GENDER_OPTIONS = ['Male', 'Female'];
const CLOTHING_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOES_SIZE_OPTIONS = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const OUTFIT_FORMULA_OPTIONS = ['Casual & comfortable', 'Smart casual', 'Formal & professional', 'Sporty & active', 'Trendy & bold'];
const STYLE_WORD_OPTIONS = ['Minimalist', 'Classic', 'Bohemian', 'Streetwear', 'Elegant', 'Edgy'];
const CLOSET_GOAL_OPTIONS = ['Build a capsule wardrobe', 'Stay on trend', 'Shop more sustainably', 'Organize my outfits', 'Save money'];
const SHOPPING_FREQUENCY_OPTIONS = ['Weekly', 'Monthly', 'Every few months', 'Rarely', 'Only on sale'];

type PersonalInfo = {
  gender: string;
  clothingSize: string;
  shoesSize: string;
  heightCm: string;
  weightKg: string;
  bodyType: string;
  outfitFormula: string;
  styleWords: string[];
  closetGoal: string;
  shoppingFrequency: string;
  stylePreferences: string[];
};

function filterHeight(val: string): string {
  const digits = val.replace(/[^0-9]/g, '').slice(0, 3);
  const num = parseInt(digits);
  if (!digits) return '';
  if (num > 272) return '272';
  return digits;
}

function filterWeight(val: string): string {
  const digits = val.replace(/[^0-9]/g, '').slice(0, 3);
  const num = parseInt(digits);
  if (!digits) return '';
  if (num > 300) return '300';
  return digits;
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const [info, setInfo] = useState<PersonalInfo>({
    gender: '',
    clothingSize: '',
    shoesSize: '',
    heightCm: '',
    weightKg: '',
    bodyType: '',
    outfitFormula: '',
    styleWords: [],
    closetGoal: '',
    shoppingFrequency: '',
    stylePreferences: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const baseTheme = getAppTheme(isDarkMode);
  const theme = {
    ...baseTheme,
    chipBg: isDarkMode ? '#171717' : COLORS.offWhite,
    chipBorder: isDarkMode ? '#3D3D3D' : COLORS.lightGray,
  };

  useEffect(() => { fetchInfo(); }, []);

  async function fetchInfo() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) { setLoading(false); return; }

      const res = await fetchApiWithFallback('/api/users/me', {
        headers: buildAuthHeaders(token),
      }, { timeoutMs: 12000, retries: 1 });

      if (!res.ok) { setLoading(false); return; } 

      const data = await res.json();
      setInfo({
        gender: data.gender ?? '',
        clothingSize: data.clothingSize ?? '',
        shoesSize: data.shoesSize ?? '',
        heightCm: data.heightCm?.toString() ?? '',
        weightKg: data.weightKg?.toString() ?? '',
        bodyType: data.bodyType ?? '',
        outfitFormula: data.outfitFormula ?? '',
        styleWords: data.styleWords ?? [],
        closetGoal: data.closetGoal ?? '',
        shoppingFrequency: data.shoppingFrequency ?? '',
        stylePreferences: data.stylePreferences ?? [],
      });
    } catch (e) {
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

  function toggleStyleWord(styleWord: string) {
    setInfo((prev) => ({
      ...prev,
      styleWords: prev.styleWords.includes(styleWord)
        ? prev.styleWords.filter((s) => s !== styleWord)
        : [...prev.styleWords, styleWord],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetchApiWithFallback('/api/users/me', {
        method: 'PUT',
        headers: {
          ...buildAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gender: info.gender || null,
          clothingSize: info.clothingSize || null,
          shoesSize: info.shoesSize || null,
          heightCm: info.heightCm ? parseInt(info.heightCm) : null,
          weightKg: info.weightKg ? parseInt(info.weightKg) : null,
          bodyType: info.bodyType || null,
          outfitFormula: info.outfitFormula || null,
          styleWords: info.styleWords,
          closetGoal: info.closetGoal || null,
          shoppingFrequency: info.shoppingFrequency || null,
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
      <View style={[styles.loadingWrap, { backgroundColor: theme.screen }]}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.screen }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Personal Information</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.pageSubtitle, { color: theme.subText }]}>
        This helps us give you better outfit recommendations. 
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.inputLabel, { color: theme.text }]}>Gender</Text>
        <View style={styles.chipsWrap}>
          {GENDER_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.gender === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, gender: p.gender === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.gender === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Clothing Size</Text>
        <View style={styles.chipsWrap}>
          {CLOTHING_SIZE_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.clothingSize === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, clothingSize: p.clothingSize === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.clothingSize === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Shoes Size</Text>
        <View style={styles.chipsWrap}>
          {SHOES_SIZE_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.shoesSize === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, shoesSize: p.shoesSize === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.shoesSize === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <InputField
          label="Height"
          value={info.heightCm}
          onChangeText={(v) => setInfo((p) => ({ ...p, heightCm: filterHeight(v) }))}
          placeholder="e.g. 165"
          unit="cm"
          hint="Max 272"
          theme={theme}
        />
        <Divider border={theme.border} />

        <InputField
          label="Weight"
          value={info.weightKg}
          onChangeText={(v) => setInfo((p) => ({ ...p, weightKg: filterWeight(v) }))}
          placeholder="e.g. 58"
          unit="kg"
          hint="Max 300"
          theme={theme}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Body Type</Text>
        <Text style={[styles.cardSub, { color: theme.subText }]}>Select the one that fits you best</Text>
        <View style={styles.chipsWrap}>
          {BODY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.bodyType === type && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, bodyType: type }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.bodyType === type && styles.chipTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Style Preferences</Text>
        <Text style={[styles.cardSub, { color: theme.subText }]}>Pick all that describe you and your shopping habits</Text>
        <View style={styles.chipsWrap}>
          {STYLE_OPTIONS.map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.stylePreferences.includes(style) && styles.chipSelected,
              ]}
              onPress={() => toggleStyle(style)}
            >
              <Text style={[
                styles.chipText,
                { color: theme.subText },
                info.stylePreferences.includes(style) && styles.chipTextSelected,
              ]}>
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Go-to Outfit Formula</Text>
        <View style={styles.chipsWrap}>
          {OUTFIT_FORMULA_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.outfitFormula === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, outfitFormula: p.outfitFormula === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.outfitFormula === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Style Words</Text>
        <View style={styles.chipsWrap}>
          {STYLE_WORD_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.styleWords.includes(value) && styles.chipSelected,
              ]}
              onPress={() => toggleStyleWord(value)}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.styleWords.includes(value) && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Primary Closet Goal</Text>
        <View style={styles.chipsWrap}>
          {CLOSET_GOAL_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.closetGoal === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, closetGoal: p.closetGoal === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.closetGoal === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider border={theme.border} />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Shopping Frequency</Text>
        <View style={styles.chipsWrap}>
          {SHOPPING_FREQUENCY_OPTIONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg, borderColor: theme.chipBorder },
                info.shoppingFrequency === value && styles.chipSelected,
              ]}
              onPress={() => setInfo((p) => ({ ...p, shoppingFrequency: p.shoppingFrequency === value ? '' : value }))}
            >
              <Text style={[styles.chipText, { color: theme.subText }, info.shoppingFrequency === value && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

function InputField({
  label, value, onChangeText, placeholder, unit, hint, maxLen = 3, theme,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; unit?: string; hint?: string; maxLen?: number;
  theme: { text: string; subText: string };
}) {
  return (
    <View style={styles.inputRow}>
      <View>
        <Text style={[styles.inputLabel, { color: theme.text }]}>{label}</Text>
        {hint && <Text style={[styles.inputHint, { color: theme.subText }]}>{hint}</Text>}
      </View>
      <View style={styles.inputRight}>
        <TextInput
          style={[styles.inlineInput, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={theme.subText}
          textAlign="right"
          maxLength={maxLen}
        />
        {unit && <Text style={[styles.unit, { color: theme.subText }]}>{unit}</Text>}
      </View>
    </View>
  );
}

function Divider({ border }: { border: string }) { return <View style={[styles.divider, { backgroundColor: border }]} />; }

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.offWhite },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  headerSpacer: { width: 36 },
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