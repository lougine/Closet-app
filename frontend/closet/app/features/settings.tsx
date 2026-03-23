import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { IMAGE_UPLOAD_ASPECT, IMAGE_UPLOAD_QUALITY, validateImageFileSize} from '@/constants/imageUpload';
import { COLORS } from '@/constants/theme';
import {fetchCurrentUserProfile, saveBannerPreset, type UserProfile, uploadBannerImage} from '@/services/userProfileService';
import { getUploadErrorMessage } from '@/services/uploadRequest';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';

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

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerPreset, setBannerPreset] = useState<string>('pink');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => { fetchUser();}, []);

  async function fetchUser() {
    try {
      const profile = await fetchCurrentUserProfile();
      setUser(profile);
      if (profile.bannerImage) setBannerUri(profile.bannerImage);
      if (profile.bannerPreset) setBannerPreset(profile.bannerPreset);
    } catch {
      console.warn('Settings: could not load user (offline?)');
    }
  }

  async function uploadBannerPhoto(uri: string) {
    setUploadingBanner(true);
    const updated = await uploadBannerImage(uri);
    const updatedBanner = updated.bannerImage;
    const updatedProfile = updated.profilePicture;

    setUser((prev) => (prev ? {
      ...prev,
      bannerImage: updatedBanner ?? null,
      profilePicture: updatedProfile ?? prev.profilePicture,
    } : prev));
    setBannerUri(updatedBanner);
    setUploadingBanner(false);
  }
  
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
      aspect: IMAGE_UPLOAD_ASPECT.banner,
      quality: IMAGE_UPLOAD_QUALITY.banner,
    });
    if (!result.canceled) {
      const sizeError = validateImageFileSize(result.assets[0].fileSize, 'banner');
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
        return;
      }

      try {
        setBannerUri(result.assets[0].uri);
        setBannerPreset('');
        await uploadBannerPhoto(result.assets[0].uri);
      } catch (error: any) {
        setUploadingBanner(false);
        Alert.alert('Upload failed', getUploadErrorMessage(error, 'Unable to upload banner image.'));
      }
    }
  }

  // Selects a preset and clears any custom photo
  async function selectPreset(id: string) {
    setBannerPreset(id);
    setBannerUri(null);
    setPickerVisible(false);

    try {
      const updated = await saveBannerPreset(id);
      setUser((prev) => (prev ? { ...prev, bannerPreset: updated.bannerPreset } : prev));
    } catch (error: any) {
      Alert.alert('Save failed', error.message || 'Unable to save banner preset.');
    }
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
          router.replace('/(auth)/authentication');
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
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={styles.rowTextWrap}>
          <Text
            style={[styles.rowLabel, isDestructive && styles.destructiveText]}
          >
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
            <AuthenticatedImage source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover" />
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
              <AuthenticatedImage source={{ uri: user.profilePicture }} style={styles.avatar} />
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
          {uploadingBanner ? <Text style={styles.bannerUploadStatus}>Uploading banner image...</Text> : null}
        </View>
      </View>

      {/* ── Account Settings ── */}
      <Text style={styles.sectionLabel}>Account Settings</Text>
      <View style={styles.section}>
        <SettingsRow
          label="Edit profile"
          onPress={() => router.push("/settings/edit-profile")}
        />
        <Separator />
        <SettingsRow
          label="Personal information"
          onPress={() => router.push("/settings/personal-info")}
        />
        <Separator />
        <SettingsRow
          label="Passwords & privacy"
          onPress={() => router.push("/settings/passwords-privacy")}
        />
        <Separator />
        <SettingsRow
          label="Notifications & reminders"
          onPress={() => router.push("/settings/notifications")}
        />
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
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Username + edit link ───────────────────────────────────────────────────
  profileBottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16,
  },
  username: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  editLink: { fontSize: 13, color: COLORS.hotPink, fontWeight: '500' },
  bannerUploadStatus: { fontSize: 12, color: COLORS.subText },

  // ── Section label ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.subText,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 24,
  },

  // ── Section card ───────────────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Row ────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowTextWrap: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: COLORS.text },
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
