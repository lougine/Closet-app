// app/(tabs)/settings.tsx
// Main Settings screen — wavy pink header, profile card, settings list.
// Logout clears JWT from SecureStore and redirects to auth screen.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

type UserProfile = {
  _id: string;
  username: string;
  profilePicture: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => { fetchUser(); }, []);

  async function fetchUser() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error('Failed to fetch user:', e);
    }
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          // TODO: replace with your actual auth/login screen path
          router.replace('/C:\Users\Gaming Store\OneDrive\Desktop\closetdripp\frontend\closet\app\(tabs)\signup.tsx/login');
        },
      },
    ]);
  }

  function handleRateUs() {
    // TODO: replace with your real App Store URL once published
    Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID');
  }

  // ── Reusable row ────────────────────────────────────────────────────────
  function SettingsRow({
    label, subtitle, onPress, isDestructive = false, hideChevron = false,
  }: {
    label: string; subtitle?: string; onPress: () => void;
    isDestructive?: boolean; hideChevron?: boolean;
  }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowLabel, isDestructive && styles.destructiveText]}>
            {label}
          </Text>
          {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
        </View>
        {!hideChevron && (
          <Ionicons name="chevron-forward" size={18}
            color={isDestructive ? COLORS.hotPink : COLORS.lightGray} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>

      {/* ── Clean pink header block with rounded bottom corners ── */}
      <View style={styles.headerBg}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* ── Profile card — overlaps the wave slightly ── */}
      <View style={styles.profileCard}>
        {user?.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={28} color={COLORS.white} />
          </View>
        )}
        <Text style={styles.username}>{user?.username ?? '...'}</Text>
      </View>

      {/* ── Account Settings section ── */}
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
        <SettingsRow label="Activity Feed"
          onPress={() => router.push('/settings/activity-feed')} />
      </View>

      {/* ── More section ── */}
      <Text style={styles.sectionLabel}>More</Text>
      <View style={styles.section}>
        <SettingsRow label="Rate Us" onPress={handleRateUs} />
        <Separator />
        <SettingsRow label="Help"
          onPress={() => router.push('/settings/help')} />
        <Separator />
        <SettingsRow label="Privacy & Policy"
          onPress={() => router.push('/settings/privacy-policy')} />
        <Separator />
        <SettingsRow label="Log out" onPress={handleLogout}
          isDestructive hideChevron={false} />
      </View>

    </ScrollView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingBottom: 60 },

  // ── Pink header block ──────────────────────────────────────────────────────
  headerBg: {
    backgroundColor: COLORS.lightPink,  // light pink, not hot pink
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,   // rounded bottom corners instead of wave
    borderBottomRightRadius: 28,
    marginBottom: 0,
  },
  pageTitle: {
    fontSize: 28, fontWeight: '800',
    color: COLORS.white, letterSpacing: 0.3,
  },

  // ── Profile card ───────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginTop: -8,   // slight overlap with wave
    marginBottom: 28,
    gap: 12,
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: COLORS.lightPink,
  },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.lightPink,
    justifyContent: 'center', alignItems: 'center',
  },
  username: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },

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
});