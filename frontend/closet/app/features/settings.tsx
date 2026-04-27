import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { COLORS } from '@/constants/theme';
import { useAppTheme } from '@/context/themeContext';
import { fetchCurrentUserProfile, type UserProfile } from '../../services/userProfileService';

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const { isDarkMode, setDarkMode } = useAppTheme();

  const profileDisplayName = useMemo(() => {
    const rawName = user?.username || user?.name || '';
    return rawName.trim().toUpperCase();
  }, [user]);

  const themeColors = isDarkMode
    ? {
        topArea: '#3B3B3B',
        sheet: '#181818',
        card: '#242424',
        text: '#F3F3F3',
        subText: '#A9A9A9',
        chevron: '#8F8F8F',
        divider: '#343434',
      }
    : {
        topArea: '#8B8B8B',
        sheet: COLORS.offWhite,
        card: COLORS.white,
        text: COLORS.text,
        subText: COLORS.subText,
        chevron: COLORS.lightGray,
        divider: COLORS.lightGray,
      };

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const profile = await fetchCurrentUserProfile();
      setUser(profile);
    } catch {
      console.warn('Settings: could not load user profile.');
    } finally {
      setIsProfileLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          router.replace('/(auth)/authentication');
        },
      },
    ]);
  }

  function handleRateUs() {
    Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID');
  }

  function handleInviteFriends() {
    Alert.alert('Add friends', 'Connect this action to your invite flow.');
  }

  function handleShareProfile() {
    Alert.alert('Share profile', 'Connect this action to your share flow.');
  }

  function SettingsRow({
    label,
    onPress,
    isDestructive = false,
  }: {
    label: string;
    onPress: () => void;
    isDestructive?: boolean;
  }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.65}>
        <Text style={[styles.rowLabel, { color: themeColors.text }, isDestructive && styles.destructiveText]}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDestructive ? COLORS.hotPink : themeColors.chevron}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.topArea }]}>
      <View style={[styles.topArea, { backgroundColor: themeColors.topArea }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="settings" size={26} color={COLORS.white} />
          <Text style={styles.pageTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView
        style={[styles.sheet, { backgroundColor: themeColors.sheet }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileRow}>
          <View style={styles.profileLeft}>
            {user?.profilePicture ? (
              <AuthenticatedImage source={{ uri: user.profilePicture }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.profileAvatarPlaceholder}>
                <Ionicons name="person" size={18} color={COLORS.white} />
              </View>
            )}
            <Text style={[styles.profileName, { color: themeColors.text }]}>
              {isProfileLoading ? ' ' : profileDisplayName}
            </Text>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity onPress={handleInviteFriends} hitSlop={8}>
              <Ionicons name="person-add" size={20} color={themeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareProfile} hitSlop={8}>
              <Ionicons name="paper-plane" size={20} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionSpacing} />
        <Text style={[styles.sectionTitle, { color: themeColors.subText }]}>Account Settings</Text>
        <View style={[styles.listBlock, { backgroundColor: themeColors.card }]}> 
          <SettingsRow label="Edit profile" onPress={() => router.push('/settings/edit-profile')} />
          <SettingsRow label="Personal Information" onPress={() => router.push('/settings/personal-info')} />
          <SettingsRow label="Passwords & privacy" onPress={() => router.push('/settings/passwords-privacy')} />
          <SettingsRow label="Notifications & reminders" onPress={() => router.push('/settings/notifications')} />
          <TouchableOpacity style={styles.row} onPress={() => setDarkMode(!isDarkMode)} activeOpacity={0.65}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Dark mode</Text>
              <Text style={[styles.rowSub, { color: themeColors.subText }]}>Switch the app appearance</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
              thumbColor={isDarkMode ? COLORS.hotPink : COLORS.white}
              ios_backgroundColor={COLORS.lightGray}
            />
          </TouchableOpacity>
          <SettingsRow label="Activity Feed" onPress={() => router.push('/settings/activity-feed')} />
        </View>

        <View style={[styles.fullDivider, { backgroundColor: themeColors.divider }]} />
        <Text style={[styles.sectionTitle, { color: themeColors.subText }]}>More</Text>
        <View style={[styles.listBlock, { backgroundColor: themeColors.card }]}> 
          <SettingsRow label="Rate Us" onPress={handleRateUs} />
          <SettingsRow label="Help" onPress={() => router.push('/settings/help')} />
          <SettingsRow label="Privacy & Policy" onPress={() => router.push('/settings/privacy-policy')} />
          <SettingsRow label="Log out" onPress={handleLogout} isDestructive />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#8B8B8B' },
  topArea: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 34,
    backgroundColor: '#8B8B8B',
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  container: { paddingBottom: 60 },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: { fontSize: 30, fontWeight: '800', color: COLORS.white, letterSpacing: 0.2 },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  profileAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.hotPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  sectionSpacing: { height: 10 },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.subText,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  listBlock: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fullDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginTop: 4,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowTextWrap: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.subText },
  destructiveText: { color: COLORS.hotPink, fontWeight: '600' },
});
