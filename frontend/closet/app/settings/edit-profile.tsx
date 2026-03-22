// app/settings/edit-profile.tsx
// Edit Profile page — lets user change their profile picture and username.
// Profile picture: choose from camera roll OR take a new photo.
// Username: text input with save button.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; // lets user pick photo or take one
import AuthenticatedImage from '@/components/AuthenticatedImage';
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from '@/constants/imageUpload';
import { COLORS } from '@/constants/theme';
import {
  fetchCurrentUserProfile,
  updateDisplayName,
  uploadProfileImage,
} from '@/services/userProfileService';
import { getUploadErrorMessage } from '@/services/uploadRequest';

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null); // current pfp URL or local URI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  // Load current user data on mount
  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const profile = await fetchCurrentUserProfile();
      setUsername(profile.name ?? profile.username ?? '');
      setProfilePicture(profile.profilePicture ?? null);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Profile picture picker ─────────────────────────────────────────────────
  // On iOS shows native action sheet, on Android shows Alert with options
  async function handleChangePfp() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take a photo', 'Choose from camera roll'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCamera();
          if (buttonIndex === 2) openGallery();
        }
      );
    } else {
      // Android fallback — simple alert
      Alert.alert('Change profile photo', '', [
        { text: 'Take a photo', onPress: openCamera },
        { text: 'Choose from camera roll', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function openCamera() {
    // Ask permission to use camera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in your settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,   // lets user crop to a square
      aspect: IMAGE_UPLOAD_ASPECT.profile,
      quality: IMAGE_UPLOAD_QUALITY.profile,
    });
    if (!result.canceled) {
      const sizeError = validateImageFileSize(result.assets[0].fileSize, 'profile');
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
        return;
      }
      setProfilePicture(result.assets[0].uri); // local URI for preview
    }
  }

  async function openGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in your settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: IMAGE_UPLOAD_ASPECT.profile,
      quality: IMAGE_UPLOAD_QUALITY.profile,
    });
    if (!result.canceled) {
      const sizeError = validateImageFileSize(result.assets[0].fileSize, 'profile');
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
        return;
      }
      setProfilePicture(result.assets[0].uri);
    }
  }

  // ── Save changes ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    setSaving(true);
    try {
      await updateDisplayName(username.trim());

      if (profilePicture && (profilePicture.startsWith('file:') || profilePicture.startsWith('content:'))) {
        setUploadingProfileImage(true);
        const updatedUser = await uploadProfileImage(profilePicture);
        setProfilePicture(updatedUser.profilePicture ?? null);
      }

      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', getUploadErrorMessage(e, 'Could not save changes. Please try again.'));
    } finally {
      setUploadingProfileImage(false);
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
      {/* ── Back button + title ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />{/* spacer to center the title */}
      </View>

      {/* ── Profile picture ── */}
      <View style={styles.pfpSection}>
        {profilePicture ? (
          <AuthenticatedImage source={{ uri: profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={COLORS.white} />
          </View>
        )}

        {/* Camera icon overlay — tapping opens the picker */}
        <TouchableOpacity style={styles.cameraBtn} onPress={handleChangePfp}>
          <Ionicons name="camera" size={16} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.changePfpText}>Change profile photo</Text>
      </View>

      {/* ── Username field ── */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Your username"
          placeholderTextColor={COLORS.lightGray}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
        />
        <Text style={styles.charCount}>{username.length}/30</Text>
      </View>

      {/* ── Save button ── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save changes</Text>
        )}
      </TouchableOpacity>

      {uploadingProfileImage ? (
        <Text style={styles.uploadStatus}>Uploading profile image...</Text>
      ) : null}
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 20 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.offWhite },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: { width: 36 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  // ── Profile picture ────────────────────────────────────────────────────────
  pfpSection: { alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: COLORS.lightPink,
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.lightPink,
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 34, right: '32%',   // sits on bottom-right of the avatar
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.hotPink,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  changePfpText: { fontSize: 13, color: COLORS.hotPink, fontWeight: '500' },

  // ── Input card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.subText, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    fontSize: 16,
    color: COLORS.text,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.lightGray,
    paddingVertical: 6,
  },
  charCount: { fontSize: 11, color: COLORS.lightGray, textAlign: 'right' },

  // ── Save button ────────────────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: COLORS.hotPink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  uploadStatus: { textAlign: 'center', color: COLORS.subText, fontSize: 13 },
});