import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/privacy-policy.styles';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const theme = getAppTheme(isDarkMode);

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.screen }]} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Privacy & Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.lastUpdated, { color: theme.subText }]}>Last updated: February 2026</Text>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <PolicySection
          title="1. Information We Collect"
          body="We collect information you provide when creating an account, including your username, profile picture, and personal preferences such as age, height, weight, and style preferences. We also collect outfit data you log within the app."
          theme={theme}
        />
        <Divider border={theme.border} />
        <PolicySection
          title="2. How We Use Your Information"
          body="Your information is used solely to provide and improve ClosetDripp's features — including outfit recommendations, calendar tracking, and analytics. We do not sell your personal data to third parties."
          theme={theme}
        />
        <Divider border={theme.border} />
        <PolicySection
          title="3. Data Storage"
          body="Your data is stored securely on our servers. Profile pictures and outfit images are stored in encrypted cloud storage. JWT authentication tokens are stored securely on your device."
          theme={theme}
        />
        <Divider border={theme.border} />
        <PolicySection
          title="4. Your Rights"
          body="You can edit or delete your personal information at any time from the Settings screen. To request full account deletion, contact us at support@closetdripp.com."
          theme={theme}
        />
        <Divider border={theme.border} />
        <PolicySection
          title="5. Third-Party Services"
          body="ClosetDripp uses secure third-party infrastructure for cloud storage and push notifications. These services are bound by their own privacy policies and do not have access to your outfit or wardrobe data."
          theme={theme}
        />
        <Divider border={theme.border} />
        <PolicySection
          title="6. Contact"
          body="If you have any questions about this Privacy Policy, please contact us:"
          theme={theme}
        />
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@closetdripp.com')}
        >
          <Text style={styles.emailLink}>support@closetdripp.com</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

function PolicySection({ title, body, theme }: { title: string; body: string; theme: { text: string; subText: string } }) {
  return (
    <View style={styles.policySection}>
      <Text style={[styles.policyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.policyBody, { color: theme.subText }]}>{body}</Text>
    </View>
  );
}

function Divider({ border }: { border: string }) {
  return <View style={[styles.divider, { backgroundColor: border }]} />;
}
