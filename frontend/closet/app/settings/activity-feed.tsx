import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, fetchApiWithFallback } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/activity-feed.styles';

type ActivityItem = {
  _id: string;
  type: 'outfit_logged' | 'streak_reached' | 'item_added' | 'outfit_deleted';
  description: string; 
  date: string;        
};

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
  const { isDarkMode } = useAppTheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = getAppTheme(isDarkMode);

  useEffect(() => { fetchActivity(); }, []);

  async function fetchActivity() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetchApiWithFallback('/api/users/me/activity', {
        headers: buildAuthHeaders(token),
      }, { timeoutMs: 12000, retries: 1 });
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
    <ScrollView style={[styles.scroll, { backgroundColor: theme.screen }]} contentContainerStyle={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Activity Feed</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.pageSubtitle, { color: theme.subText }]}>Everything you've been up to </Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.hotPink} style={styles.loadingIndicator} />
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={48} color={COLORS.lightPink} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No activity yet</Text>
          <Text style={[styles.emptySub, { color: theme.subText }] }>
            Start logging outfits and your activity will show up here!
          </Text>
        </View>
      ) : (
        grouped.map(({ label, items }) => (
          <View key={label}>
            <Text style={[styles.groupLabel, { color: theme.subText }]}>{label}</Text>

            <View style={[styles.card, { backgroundColor: theme.card }] }>
              {items.map((item, i) => {
                const time = new Date(item.date).toLocaleTimeString('en-GB', {
                  hour: '2-digit', minute: '2-digit',
                });

                return (
                  <View key={item._id}>
                    <View style={styles.activityRow}>
                      <View style={styles.activityText}>
                        <Text style={[styles.activityDesc, { color: theme.text }]}>{item.description}</Text>
                        <Text style={[styles.activityTime, { color: theme.subText }]}>{time}</Text>
                      </View>
                    </View>
                    {i < items.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
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
