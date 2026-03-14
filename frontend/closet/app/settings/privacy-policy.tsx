// app/settings/privacy-policy.tsx
// Privacy & Policy page — shows the app's privacy policy text.
// If you have an external URL for the policy, you can swap the text
// for a WebView or just a link. For now it's a readable scrollable text page.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

// TODO: If you have a hosted privacy policy URL, replace the text sections
// below with a WebView pointing to that URL instead.
// import { WebView } from 'react-native-webview';
// const PRIVACY_URL = 'https://closetdripp.com/privacy';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Privacy & Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.lastUpdated}>Last updated: February 2026</Text>

      {/* ── Policy sections ── */}
      <View style={styles.card}>
        <PolicySection
          title="1. Information We Collect"
          body="We collect information you provide when creating an account, including your username, profile picture, and personal preferences such as age, height, weight, and style preferences. We also collect outfit data you log within the app."
        />
        <Divider />
        <PolicySection
          title="2. How We Use Your Information"
          body="Your information is used solely to provide and improve ClosetDripp's features — including outfit recommendations, calendar tracking, and analytics. We do not sell your personal data to third parties."
        />
        <Divider />
        <PolicySection
          title="3. Data Storage"
          body="Your data is stored securely on our servers. Profile pictures and outfit images are stored in encrypted cloud storage. JWT authentication tokens are stored securely on your device."
        />
        <Divider />
        <PolicySection
          title="4. Your Rights"
          body="You can edit or delete your personal information at any time from the Settings screen. To request full account deletion, contact us at support@closetdripp.com."
        />
        <Divider />
        <PolicySection
          title="5. Third-Party Services"
          body="ClosetDripp uses secure third-party infrastructure for cloud storage and push notifications. These services are bound by their own privacy policies and do not have access to your outfit or wardrobe data."
        />
        <Divider />
        <PolicySection
          title="6. Contact"
          body="If you have any questions about this Privacy Policy, please contact us:"
        />
        {/* Tappable email */}
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@closetdripp.com')}
        >
          <Text style={styles.emailLink}>support@closetdripp.com</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ─── Reusable section ─────────────────────────────────────────────────────────
function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.policyTitle}>{title}</Text>
      <Text style={styles.policyBody}>{body}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  lastUpdated: { fontSize: 12, color: COLORS.subText },

  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 20, gap: 16,
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  policySection: { gap: 6 },
  policyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  policyBody: { fontSize: 13, color: COLORS.subText, lineHeight: 21 },
  divider: { height: 1, backgroundColor: COLORS.offWhite },
  emailLink: { fontSize: 13, color: COLORS.hotPink, fontWeight: '600' },
});