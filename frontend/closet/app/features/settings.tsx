// app/(tabs)/settings.tsx
// Main Settings screen — pink header, profile banner card, settings list.
//
// Profile card (matches the reference pic):
//   • Full-width banner image at the top of the card (like Instagram)
//   • User taps the banner → action sheet → pick a preset color/gradient
//     OR upload their own photo from camera roll
//   • Circular avatar overlapping the bottom edge of the banner
//   • Username + "Edit profile" link below
//
// Other notes:
//   • "Failed to fetch" errors are caught silently — no toast shown
//   • Activity Feed row replaced with Dark Mode toggle switch
//   • Logout router path is fixed (was a Windows absolute path)

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, Linking, Switch,
  Modal, Platform, ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

// ─── BANNER PRESETS ───────────────────────────────────────────────────────────
// Color presets the user can choose for their profile banner.
// Each preset has two colors — displayed as a top/bottom split to simulate a gradient.
// To add real gradients: install expo-linear-gradient and swap the bannerFill View
// for a <LinearGradient colors={[preset.colors[0], preset.colors[1]]} style={...} />
const BANNER_PRESETS = [
  { id: 'pink',     label: 'Pink',      colors: ['#FB92BD', '#F0507B'] },
  { id: 'rose',     label: 'Rose',      colors: ['#FFB3C6', '#FF6B9D'] },
  { id: 'lavender', label: 'Lavender',  colors: ['#D4A5FF', '#9B59B6'] },
  { id: 'mint',     label: 'Mint',      colors: ['#A8EDDB', '#4ECDC4'] },
  { id: 'peach',    label: 'Peach',     colors: ['#FFD4A3', '#FF8C69'] },
  { id: 'sky',      label: 'Sky Blue',  colors: ['#A8D8EA', '#4A9FD5'] },
  { id: 'blush',    label: 'Blush',     colors: ['#FDE8F2', '#FB92BD'] },
  { id: 'charcoal', label: 'Charcoal',  colors: ['#888888', '#2C2C2C'] },
];

type UserProfile = {
  _id: string;
  username: string;
  profilePicture: string;
  bannerImage?: string;   // URL of a user-uploaded banner photo
  bannerPreset?: string;  // id of a chosen preset (e.g. 'pink')
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Banner — either a local/remote URI or a preset color id
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerPreset, setBannerPreset] = useState<string>('pink');
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => { fetchUser(); }, []);

  async function fetchUser() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // silently show placeholder — no toast
      const data = await res.json();
      setUser(data);
      if (data.bannerImage) setBannerUri(data.bannerImage);
      if (data.bannerPreset) setBannerPreset(data.bannerPreset);
    } catch {
      // Network error — silently degrade, no toast
      console.warn('Settings: could not load user (offline?)');
    }
  }

  // ── Banner tap — shows action sheet with preset vs upload options ──────────
  function handleBannerPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Choose color / gradient', 'Upload a photo'], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) setPickerVisible(true);
          if (i === 2) pickBannerPhoto();
        }
      );
    } else {
      Alert.alert('Change banner', '', [
        { text: 'Choose color / gradient', onPress: () => setPickerVisible(true) },
        { text: 'Upload a photo', onPress: pickBannerPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  // Opens the camera roll cropped to a 16:7 banner aspect ratio
  async function pickBannerPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });
    if (!result.canceled) {
      setBannerUri(result.assets[0].uri);
      setBannerPreset('');
      // TODO: upload banner photo to backend
      // await uploadBanner(result.assets[0].uri);
    }
  }

  // Selects a preset and clears any custom photo
  function selectPreset(id: string) {
    setBannerPreset(id);
    setBannerUri(null);
    setPickerVisible(false);
    // TODO: save preference to backend
    // await fetch('https://your-api.com/users/me', { method: 'PUT', body: { bannerPreset: id } })
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          // TODO: update path to match your actual login screen route
          router.replace('/login');
        },
      },
    ]);
  }

  function handleRateUs() {
    Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID');
  }

  const activePreset = BANNER_PRESETS.find((p) => p.id === bannerPreset);

  // ── Reusable row ──────────────────────────────────────────────────────────
  function SettingsRow({
    label, subtitle, onPress, isDestructive = false,
    hideChevron = false, rightElement,
  }: {
    label: string; subtitle?: string; onPress: () => void;
    isDestructive?: boolean; hideChevron?: boolean; rightElement?: React.ReactNode;
  }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowLabel, isDestructive && styles.destructiveText]}>
            {label}
          </Text>
          {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
        </View>
        {rightElement ?? (!hideChevron && (
          <Ionicons name="chevron-forward" size={18}
            color={isDestructive ? COLORS.hotPink : COLORS.lightGray} />
        ))}
      </TouchableOpacity>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>

      {/* ── Pink page header ── */}
      <View style={styles.headerBg}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* ══════════════════════════════════════════════════════
          PROFILE CARD
          Top: full-width banner (tap to change)
          Middle: circular avatar overlapping the banner
          Bottom: @username + "Edit profile" link
          ══════════════════════════════════════════════════════ */}
      <View style={styles.profileCard}>

        {/* ── Banner — tap to change ── */}
        <TouchableOpacity
          style={styles.banner}
          onPress={handleBannerPress}
          activeOpacity={0.85}
        >
          {bannerUri ? (
            // Custom uploaded photo
            <Image source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover" />
          ) : (
            // Two-tone preset color (top color + bottom color faking a gradient)
            // Swap for LinearGradient if expo-linear-gradient is installed
            <View style={styles.bannerFill}>
              <View style={[styles.bannerHalf, { backgroundColor: activePreset?.colors[0] ?? COLORS.lightPink }]} />
              <View style={[styles.bannerHalf, { backgroundColor: activePreset?.colors[1] ?? COLORS.hotPink }]} />
            </View>
          )}
          {/* Small camera icon badge so user knows banner is tappable */}
          <View style={styles.bannerCameraBtn}>
            <Ionicons name="camera" size={13} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* ── Avatar — floats up over the banner ── */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarBorder}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={30} color={COLORS.white} />
              </View>
            )}
          </View>
        </View>

        {/* ── @username + edit link ── */}
        <View style={styles.profileBottom}>
          <Text style={styles.username}>@{user?.username ?? '...'}</Text>
          <TouchableOpacity onPress={() => router.push('/settings/edit-profile')}>
            <Text style={styles.editLink}>Edit profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Account Settings ── */}
      <Text style={styles.sectionLabel}>Account Settings</Text>
      <View style={styles.section}>
        <SettingsRow label="Edit profile"
          onPress={() => router.push('/settings/edit-profile')} />
        <Separator />
        <SettingsRow label="Personal information"
          onPress={() => router.push('/settings/personal-info')} />
        <Separator />
        <SettingsRow label="Passwords & privacy"
          onPress={() => router.push('/settings/passwords-privacy')} />
        <Separator />
        <SettingsRow label="Notifications & reminders"
          onPress={() => router.push('/settings/notifications')} />
        <Separator />
        <SettingsRow
          label="Dark mode" subtitle="Switch the app appearance"
          onPress={() => setDarkMode(!darkMode)} hideChevron
          rightElement={
            <Switch value={darkMode} onValueChange={setDarkMode}
              trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
              thumbColor={darkMode ? COLORS.hotPink : COLORS.white}
              ios_backgroundColor={COLORS.lightGray} />
          }
        />
      </View>

      {/* ── More ── */}
      <Text style={styles.sectionLabel}>More</Text>
      <View style={styles.section}>
        <SettingsRow label="Rate Us" onPress={handleRateUs} />
        <Separator />
        <SettingsRow label="Help" onPress={() => router.push('/settings/help')} />
        <Separator />
        <SettingsRow label="Privacy & Policy" onPress={() => router.push('/settings/privacy-policy')} />
        <Separator />
        <SettingsRow label="Log out" onPress={handleLogout} isDestructive />
      </View>

      {/* ══════════════════════════════════════════════════════
          BANNER PRESET PICKER — slides up from the bottom
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        {/* Tap outside to close */}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Choose a banner style</Text>

            {/* Color swatch grid */}
            <View style={styles.swatchGrid}>
              {BANNER_PRESETS.map((preset) => {
                const isSelected = bannerPreset === preset.id && !bannerUri;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.swatch, isSelected && styles.swatchSelected]}
                    onPress={() => selectPreset(preset.id)}
                  >
                    {/* Two-tone preview of this preset */}
                    <View style={[styles.swatchHalf, { backgroundColor: preset.colors[0] }]} />
                    <View style={[styles.swatchHalf, { backgroundColor: preset.colors[1] }]} />
                    {/* Checkmark if selected */}
                    {isSelected && (
                      <View style={styles.swatchCheck}>
                        <Ionicons name="checkmark" size={11} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.orText}>or</Text>

            {/* Upload photo button */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => { setPickerVisible(false); pickBannerPhoto(); }}
            >
              <Ionicons name="image-outline" size={18} color={COLORS.hotPink} />
              <Text style={styles.uploadBtnText}>Upload your own photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingBottom: 60 },

  // ── Page header ────────────────────────────────────────────────────────────
  headerBg: {
    backgroundColor: COLORS.lightPink,
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },

  // ── Profile card ───────────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20, marginTop: -8, marginBottom: 28,
    overflow: 'hidden',
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },

  // ── Banner ─────────────────────────────────────────────────────────────────
  banner: { width: '100%', height: 110, position: 'relative', overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%' },
  bannerFill: { flex: 1, flexDirection: 'column' },
  bannerHalf: { flex: 1 },
  bannerCameraBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Avatar row — pulls avatar up over the banner ───────────────────────────
  avatarRow: {
    paddingHorizontal: 16,
    marginTop: -30,          // overlap with banner
  },
  avatarBorder: {
    borderWidth: 3, borderColor: COLORS.white,
    borderRadius: 38, alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
  },
  avatar: { width: 68, height: 68, borderRadius: 34 },
  avatarPlaceholder: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.lightPink,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Username + edit link ───────────────────────────────────────────────────
  profileBottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16,
  },
  username: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  editLink: { fontSize: 13, color: COLORS.hotPink, fontWeight: '500' },

  // ── Section label ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.subText,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, marginLeft: 24,
  },

  // ── Section card ───────────────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.white, borderRadius: 20,
    marginHorizontal: 20, marginBottom: 24, overflow: 'hidden',
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  // ── Row ────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  rowTextWrap: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.subText },
  destructiveText: { color: COLORS.hotPink, fontWeight: '600' },
  separator: { height: 1, backgroundColor: COLORS.offWhite, marginHorizontal: 18 },

  // ── Banner preset picker modal ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 16,
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.lightGray, alignSelf: 'center',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  swatchGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
  },
  swatch: {
    width: 64, height: 40, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
    flexDirection: 'column',
  },
  swatchSelected: { borderColor: COLORS.hotPink },
  swatchHalf: { flex: 1 },
  swatchCheck: {
    position: 'absolute', bottom: 3, right: 3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.hotPink,
    justifyContent: 'center', alignItems: 'center',
  },

  orText: { textAlign: 'center', fontSize: 13, color: COLORS.subText },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.lightPink,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.hotPink },
});