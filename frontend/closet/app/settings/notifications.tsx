import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, fetchApiWithFallback } from '@/constants/api';
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
  styledOutfitShares: boolean;
};

type StyledInboxItem = {
  _id: string;
  type: string;
  message: string;
  createdAt: string;
  actor: {
    _id: string;
    name?: string;
    username?: string;
    profilePicture?: string | null;
  } | null;
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
    styledOutfitShares: true,
  });
  const [styledInbox, setStyledInbox] = useState<StyledInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = getAppTheme(isDarkMode);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetchApiWithFallback('/api/users/me/notifications', {
        headers: buildAuthHeaders(token),
      }, { timeoutMs: 12000, retries: 1 });
      const data = await res.json();
      setSettings({
        dailyOutfitReminder: Boolean(data?.dailyOutfitReminder),
        outfitPlanning: Boolean(data?.outfitPlanning),
        weeklyRecap: Boolean(data?.weeklyRecap),
        streakAlerts: Boolean(data?.streakAlerts),
        newFeatures: Boolean(data?.newFeatures),
        styledOutfitShares: Boolean(data?.styledOutfitShares ?? true),
      });
      const incoming = Array.isArray(data?.notifications) ? data.notifications : [];
      setStyledInbox(incoming.filter((entry: any) => entry?.type === 'styled_outfit_shared'));
    } catch (e) {
      console.warn('Could not load notification settings, using defaults');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSetting(key: keyof NotifSettings) {
    const previous = { ...settings };
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await fetchApiWithFallback('/api/users/me/notifications', {
        method: 'PUT',
        headers: {
          ...buildAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      }, { timeoutMs: 12000, retries: 1 });
    } catch (e) {
      setSettings(previous);
      Alert.alert('Error', 'Could not update notification setting.');
    }
  }

  const openStylistProfile = (stylistId?: string) => {
    if (!stylistId) return;
    router.push({ pathname: '/features/user-profile', params: { userId: stylistId } } as any);
  };

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
        <Divider border={theme.border} />
        <NotifRow
          title="Styled outfit shares"
          subtitle="Notify me when someone styles a look for me"
          value={settings.styledOutfitShares}
          onToggle={() => toggleSetting('styledOutfitShares')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Styled for You</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        {styledInbox.length === 0 ? (
          <View style={styles.notifRow}>
            <View style={styles.notifText}>
              <Text style={[styles.notifTitle, { color: theme.text }]}>No styled looks yet</Text>
              <Text style={[styles.notifSub, { color: theme.subText }]}>When someone shares a styled outfit for you, it appears here.</Text>
            </View>
          </View>
        ) : (
          styledInbox.map((item, index) => (
            <View key={item._id}>
              <TouchableOpacity
                style={styles.notifRow}
                activeOpacity={0.75}
                onPress={() => openStylistProfile(item.actor?._id)}
              >
                <View style={styles.notifText}>
                  <Text style={[styles.notifTitle, { color: theme.text }]}>{item.message}</Text>
                  <Text style={[styles.notifSub, { color: theme.subText }]}>
                    {item.actor?.username ? `From @${item.actor.username}` : 'From another stylist'} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.subText} />
              </TouchableOpacity>
              {index < styledInbox.length - 1 && <Divider border={theme.border} />}
            </View>
          ))
        )}
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
