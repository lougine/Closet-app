import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator, ActionSheetIOS, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; 
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { IMAGE_UPLOAD_ASPECT, IMAGE_UPLOAD_QUALITY, validateImageFileSize} from '@/constants/imageUpload';
import { COLORS } from '@/constants/theme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/edit-profile.styles';
import { fetchCurrentUserProfile, updateProfileDetails, uploadBannerImage, uploadProfileImage } from '../../services/userProfileService';
import { getUploadErrorMessage } from '@/services/uploadRequest';

export default function EditProfileScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const theme = isDarkMode
    ? {
        screen: '#121212',
        card: '#1E1E1E',
        text: '#F2F2F2',
        subText: '#A8A8A8',
        border: '#343434',
        inputBorder: '#444444',
      }
    : {
        screen: COLORS.offWhite,
        card: COLORS.white,
        text: COLORS.text,
        subText: COLORS.subText,
        border: COLORS.offWhite,
        inputBorder: COLORS.lightGray,
      };

  useEffect(() => {
    fetchUser();
  }, []);

  function splitName(fullName: string) {
    const trimmed = fullName.trim();
    if (!trimmed) return { first: '', last: '' };

    const parts = trimmed.split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    return { first, last };
  }

  async function fetchUser() {
    try {
      const profile = await fetchCurrentUserProfile();
      const fullName = profile.name ?? profile.username ?? '';
      const nameParts = splitName(fullName);
      setUsername(fullName);
      setFirstName(nameParts.first);
      setLastName(nameParts.last);
      setEmail(profile.email ?? '');
      setProfilePicture(profile.profilePicture ?? null);
      setBannerUri(profile.bannerImage ?? null);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }

  async function uploadBannerPhoto(uri: string) {
    setUploadingBanner(true);
    try {
      const updated = await uploadBannerImage(uri);
      setBannerUri(updated.bannerImage ?? null);
    } finally {
      setUploadingBanner(false);
    }
  }

  async function openBannerGallery() {
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
        await uploadBannerPhoto(result.assets[0].uri);
      } catch (error) {
        Alert.alert('Upload failed', getUploadErrorMessage(error, 'Unable to upload banner image.'));
      }
    }
  }

  async function openBannerCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in your settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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
        await uploadBannerPhoto(result.assets[0].uri);
      } catch (error) {
        Alert.alert('Upload failed', getUploadErrorMessage(error, 'Unable to upload banner image.'));
      }
    }
  }

  function handleBannerPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take a photo', 'Choose from camera roll'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openBannerCamera();
          if (buttonIndex === 2) openBannerGallery();
        }
      );
    } else {
      Alert.alert('Change background', '', [
        { text: 'Take a photo', onPress: openBannerCamera },
        { text: 'Choose from camera roll', onPress: openBannerGallery },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

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

      Alert.alert('Change profile photo', '', [
        { text: 'Take a photo', onPress: openCamera },
        { text: 'Choose from camera roll', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in your settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
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

  async function handleSave() {
    const normalizedUsername = username.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    if (!normalizedEmail) {
      Alert.alert('Email required', 'Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await updateProfileDetails({
        name: normalizedUsername,
        email: normalizedEmail,
      });
      const updatedName = updatedProfile.name ?? updatedProfile.username ?? normalizedUsername;
      const updatedNameParts = splitName(updatedName);

      setUsername(updatedName);
      setFirstName(updatedNameParts.first);
      setLastName(updatedNameParts.last);
      setEmail(updatedProfile.email ?? normalizedEmail);

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
        <Text style={[styles.pageTitle, { color: theme.text }]}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.fieldLabel, { color: theme.subText }]}>Background</Text>
        <TouchableOpacity style={styles.banner} onPress={handleBannerPress} activeOpacity={0.85}>
          {bannerUri ? (
            <AuthenticatedImage source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover" />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: theme.inputBorder }]}>
              <Ionicons name="image-outline" size={26} color={theme.subText} />
            </View>
          )}
          <View style={styles.bannerCameraBtn}>
            <Ionicons name="camera" size={14} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.pfpOverlay}>
          <View style={styles.avatarWrap}>
            {profilePicture ? (
              <AuthenticatedImage source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.white} />
              </View>
            )}

            <TouchableOpacity style={styles.cameraBtn} onPress={handleChangePfp}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {uploadingBanner ? <Text style={[styles.uploadStatus, { color: theme.subText }]}>Uploading background image...</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.fieldLabel, { color: theme.subText }]}>Username</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderBottomColor: theme.inputBorder }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={theme.subText}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
        />
        <Text style={[styles.charCount, { color: theme.subText }]}>{username.length}/30</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.fieldLabel, { color: theme.subText }]}>First Name</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderBottomColor: theme.inputBorder }]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={theme.subText}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={30}
        />
        <Text style={[styles.charCount, { color: theme.subText }]}>{firstName.length}/30</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.fieldLabel, { color: theme.subText }]}>Last Name</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderBottomColor: theme.inputBorder }]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={theme.subText}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={40}
        />
        <Text style={[styles.charCount, { color: theme.subText }]}>{lastName.length}/40</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <Text style={[styles.fieldLabel, { color: theme.subText }]}>Email</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderBottomColor: theme.inputBorder }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={theme.subText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          maxLength={80}
        />
        <Text style={[styles.charCount, { color: theme.subText }]}>{email.length}/80</Text>
      </View>

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
        <Text style={[styles.uploadStatus, { color: theme.subText }]}>Uploading profile image...</Text>
      ) : null}
    </ScrollView>
  );
}
