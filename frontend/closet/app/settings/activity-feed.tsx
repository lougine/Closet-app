// app/settings/activity-feed.tsx
// Activity Feed page — shows a chronological log of the user's activity:
// outfits logged, streaks reached, items added to wardrobe, etc.
// Data comes from GET /users/me/activity on your backend.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const COLORS = {
  white: '#FFFFFF', offWhite: '#F6F6F6', lightGray: '#D9D9D9',
  lightPink: '#FB92BD', hotPink: '#F0507B', text: '#1A1A1A', subText: '#888888',
};

// The shape of one activity item from your backend
type ActivityItem = {
  _id: string;
  type: 'outfit_logged' | 'streak_reached' | 'item_added' | 'outfit_deleted';
  description: string;  // e.g. "You logged an outfit for March 3rd"
  date: string;         // ISO date string
};

// Maps each activity type to an icon + color
const ACTIVITY_ICONS: Record<ActivityItem['type'], { icon: string; color: string; bg: string }> = {
  outfit_logged:  { icon: 'shirt-outline',       color: COLORS.hotPink,  bg: '#FFE8EF' },
  streak_reached: { icon: 'flame-outline',        color: '#FF6B35',       bg: '#FFF0EA' },
  item_added:     { icon: 'add-circle-outline',   color: '#7C5CBF',       bg: '#F0EAFF' },
  outfit_deleted: { icon: 'trash-outline',        color: COLORS.subText,  bg: COLORS.offWhite },
};

// Groups activity items by date label (Today, Yesterday, or "March 3")
function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const groups: Record<string, ActivityItem[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  items.forEach((item) => {
    const d = new Date(item.date);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function ActivityFeedScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchActivity(); }, []);

  async function fetchActivity() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      // This endpoint should return the user's activity sorted newest first
      const res = await fetch('https://your-api.com/users/me/activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActivities(data);
    } catch (e) {
      console.error('Failed to load activity:', e);
    } finally {
      setLoading(false);
    }
  }

  const grouped = groupByDate(activities);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Activity Feed</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.pageSubtitle}>Everything you've been up to 👀</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.hotPink} style={{ marginTop: 40 }} />
      ) : activities.length === 0 ? (
        // ── Empty state ──
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={48} color={COLORS.lightPink} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySub}>
            Start logging outfits and your activity will show up here!
          </Text>
        </View>
      ) : (
        // ── Activity groups ──
        grouped.map(({ label, items }) => (
          <View key={label}>
            {/* Date group label e.g. "Today" */}
            <Text style={styles.groupLabel}>{label}</Text>

            <View style={styles.card}>
              {items.map((item, i) => {
                const iconInfo = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.outfit_logged;
                const time = new Date(item.date).toLocaleTimeString('en-GB', {
                  hour: '2-digit', minute: '2-digit',
                });

                return (
                  <View key={item._id}>
                    <View style={styles.activityRow}>
                      {/* Colored icon bubble */}
                      <View style={[styles.iconBubble, { backgroundColor: iconInfo.bg }]}>
                        <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
                      </View>

                      {/* Description + time */}
                      <View style={styles.activityText}>
                        <Text style={styles.activityDesc}>{item.description}</Text>
                        <Text style={styles.activityTime}>{time}</Text>
                      </View>
                    </View>
                    {/* Divider between items (not after last) */}
                    {i < items.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 8 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  pageSubtitle: { fontSize: 13, color: COLORS.subText, marginBottom: 8 },

  groupLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.subText,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 12, marginBottom: 6, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  iconBubble: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  activityText: { flex: 1 },
  activityDesc: { fontSize: 14, fontWeight: '500', color: COLORS.text, lineHeight: 20 },
  activityTime: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.offWhite, marginHorizontal: 16 },

  // Empty state
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 60, gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.subText, textAlign: 'center', lineHeight: 22 },
});