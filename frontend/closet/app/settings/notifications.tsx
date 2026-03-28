import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/notifications.styles';

type NotifSettings = {
  dailyOutfitReminder: boolean; 
  outfitPlanning: boolean;       
  weeklyRecap: boolean;        
  streakAlerts: boolean;       
  newFeatures: boolean;        
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const [settings, setSettings] = useState<NotifSettings>({
    dailyOutfitReminder: true,
    outfitPlanning: false,
    weeklyRecap: true,
    streakAlerts: true,
    newFeatures: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const theme = getAppTheme(isDarkMode);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(buildApiUrl('/api/users/me/notifications'), {
        headers: buildAuthHeaders(token),
      });
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.warn('Could not load notification settings, using defaults');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSetting(key: keyof NotifSettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await fetch(buildApiUrl('/api/users/me/notifications'), {
        method: 'PUT',
        headers: {
          ...buildAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      setSettings(settings);
      Alert.alert('Error', 'Could not update notification setting.');
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
    <ScrollView style={[styles.scroll, { backgroundColor: theme.screen }]} contentContainerStyle={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.pageSubtitle, { color: theme.subText }]}>
        Choose what you want to be reminded about 
      </Text>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Daily</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <NotifRow
          title="Daily outfit reminder"
          subtitle="Get reminded to log today's look"
          value={settings.dailyOutfitReminder}
          onToggle={() => toggleSetting('dailyOutfitReminder')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Divider border={theme.border} />
        <NotifRow
          title="Outfit planning"
          subtitle="Plan tomorrow's outfit the night before"
          value={settings.outfitPlanning}
          onToggle={() => toggleSetting('outfitPlanning')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Weekly</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <NotifRow
          title="Weekly recap"
          subtitle="See your outfit highlights every Sunday"
          value={settings.weeklyRecap}
          onToggle={() => toggleSetting('weeklyRecap')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Activity</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <NotifRow
          title="Streak alerts"
          subtitle="Don't let your streak break!"
          value={settings.streakAlerts}
          onToggle={() => toggleSetting('streakAlerts')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Divider border={theme.border} />
        <NotifRow
          title="New features"
          subtitle="Be the first to know about updates"
          value={settings.newFeatures}
          onToggle={() => toggleSetting('newFeatures')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

    </ScrollView>
  );
}

function NotifRow({
  title, subtitle, value, onToggle, theme, isDarkMode,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  theme: { text: string; subText: string };
  isDarkMode: boolean;
}) {
  return (
    <View style={styles.notifRow}>
      <View style={styles.notifText}>
        <Text style={[styles.notifTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.notifSub, { color: theme.subText }]}>{subtitle}</Text>
      </View>
      
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
        thumbColor={isDarkMode ? COLORS.hotPink : COLORS.white}
        ios_backgroundColor={COLORS.lightGray}
      />
    </View>
  );
}

function Divider({ border }: { border: string }) {
  return <View style={[styles.divider, { backgroundColor: border }]} />;
}
