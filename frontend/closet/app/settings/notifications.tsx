// app/settings/notifications.tsx
// Notifications & Reminders page — toggle switches for different notification types.
// Settings are saved locally AND sent to backend so push notifications
// can be enabled/disabled server-side too.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
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

type NotifSettings = {
  dailyOutfitReminder: boolean;  // "Don't forget to log today's outfit!"
  outfitPlanning: boolean;       // reminder the night before to plan tomorrow
  weeklyRecap: boolean;          // weekly summary of your logged outfits
  streakAlerts: boolean;         // alert when streak is about to break
  newFeatures: boolean;          // app updates and new feature announcements
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotifSettings>({
    dailyOutfitReminder: true,
    outfitPlanning: false,
    weeklyRecap: true,
    streakAlerts: true,
    newFeatures: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      // If fetch fails just use the defaults above — not critical
      console.warn('Could not load notification settings, using defaults');
    } finally {
      setLoading(false);
    }
  }

  // Toggle one setting and auto-save immediately (no save button needed)
  async function toggleSetting(key: keyof NotifSettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      await fetch('https://your-api.com/users/me/notifications', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      // Revert the toggle if save fails
      setSettings(settings);
      Alert.alert('Error', 'Could not update notification setting.');
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.pageSubtitle}>
        Choose what you want to be reminded about 🔔
      </Text>

      {/* ── Daily reminders section ── */}
      <Text style={styles.sectionLabel}>Daily</Text>
      <View style={styles.card}>
        <NotifRow
          icon="shirt-outline"
          title="Daily outfit reminder"
          subtitle="Get reminded to log today's look"
          value={settings.dailyOutfitReminder}
          onToggle={() => toggleSetting('dailyOutfitReminder')}
        />
        <Divider />
        <NotifRow
          icon="moon-outline"
          title="Outfit planning"
          subtitle="Plan tomorrow's outfit the night before"
          value={settings.outfitPlanning}
          onToggle={() => toggleSetting('outfitPlanning')}
        />
      </View>

      {/* ── Weekly section ── */}
      <Text style={styles.sectionLabel}>Weekly</Text>
      <View style={styles.card}>
        <NotifRow
          icon="bar-chart-outline"
          title="Weekly recap"
          subtitle="See your outfit highlights every Sunday"
          value={settings.weeklyRecap}
          onToggle={() => toggleSetting('weeklyRecap')}
        />
      </View>

      {/* ── Streaks & activity ── */}
      <Text style={styles.sectionLabel}>Activity</Text>
      <View style={styles.card}>
        <NotifRow
          icon="flame-outline"
          title="Streak alerts"
          subtitle="Don't let your streak break!"
          value={settings.streakAlerts}
          onToggle={() => toggleSetting('streakAlerts')}
        />
        <Divider />
        <NotifRow
          icon="sparkles-outline"
          title="New features"
          subtitle="Be the first to know about updates"
          value={settings.newFeatures}
          onToggle={() => toggleSetting('newFeatures')}
        />
      </View>

    </ScrollView>
  );
}

// ─── Reusable notification toggle row ─────────────────────────────────────────
function NotifRow({
  icon, title, subtitle, value, onToggle,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.notifRow}>
      <View style={styles.notifIconWrap}>
        <Ionicons name={icon as any} size={20} color={COLORS.hotPink} />
      </View>
      <View style={styles.notifText}>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifSub}>{subtitle}</Text>
      </View>
      {/* The pink toggle switch */}
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
        thumbColor={value ? COLORS.hotPink : COLORS.white}
        ios_backgroundColor={COLORS.lightGray}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 10 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.offWhite },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  pageSubtitle: { fontSize: 13, color: COLORS.subText, marginBottom: 8 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.subText,
    textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  notifIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.offWhite,
    justifyContent: 'center', alignItems: 'center',
  },
  notifText: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  notifSub: { fontSize: 12, color: COLORS.subText, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.offWhite, marginHorizontal: 16 },
});