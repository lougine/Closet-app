// app/settings/help.tsx
// Help page — user can describe their issue and send it directly
// to your support email via the device's native mail app.
// Also has FAQ accordion section for common questions.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
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

// TODO: replace with your actual support email
const SUPPORT_EMAIL = 'support@closetdripp.com';

// ── FAQ items ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'How do I add an outfit to my calendar?',
    a: 'Go to the Calendar tab, tap a date, then choose to add from your wardrobe, create a new outfit, or discover one.',
  },
  {
    q: 'Can I edit an outfit I already saved?',
    a: 'Tap the ••• button on the outfit in your calendar, delete it, and re-add a new one for that date.',
  },
  {
    q: 'How do streaks work?',
    a: "A streak counts how many consecutive days you've logged an outfit. Missing a day resets it to zero.",
  },
  {
    q: 'How do I delete items from my wardrobe?',
    a: 'Go to your Wardrobe tab, long-press any item, and select Delete.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your wardrobe and outfits are private to your account. Read our Privacy Policy for full details.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Opens the native mail app with pre-filled support email
  function handleSendEmail() {
    if (!message.trim()) {
      Alert.alert('Empty message', 'Please describe your issue before sending.');
      return;
    }

    const subject = encodeURIComponent('ClosetDripp Support Request');
    const body = encodeURIComponent(message.trim());
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailto).then((supported) => {
      if (supported) {
        Linking.openURL(mailto);
      } else {
        // Fallback if no mail app is set up
        Alert.alert(
          'No mail app found',
          `Please email us directly at ${SUPPORT_EMAIL}`,
          [{ text: 'OK' }]
        );
      }
    });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Help</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Contact section ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="mail-outline" size={22} color={COLORS.hotPink} />
          <Text style={styles.cardTitle}>Contact Us</Text>
        </View>
        <Text style={styles.cardSub}>
          Having an issue? Tell us what's going on and we'll get back to you as soon as possible. 💌
        </Text>

        {/* Message input */}
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue here..."
          placeholderTextColor={COLORS.lightGray}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{message.length}/1000</Text>

        {/* Send button */}
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendEmail}>
          <Ionicons name="send" size={16} color={COLORS.white} />
          <Text style={styles.sendBtnText}>Send to support</Text>
        </TouchableOpacity>

        {/* Direct email link as fallback */}
        <Text style={styles.emailNote}>
          Or email us directly at{' '}
          <Text
            style={styles.emailLink}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>
        </Text>
      </View>

      {/* ── FAQ section ── */}
      <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
      <View style={styles.card}>
        {FAQS.map((faq, i) => (
          <View key={i}>
            {/* Question row — tapping expands/collapses the answer */}
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              activeOpacity={0.7}
            >
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Ionicons
                name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.lightPink}
              />
            </TouchableOpacity>

            {/* Answer — only shown when expanded */}
            {expandedFaq === i && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqA}>{faq.a}</Text>
              </View>
            )}

            {/* Divider between questions (not after last one) */}
            {i < FAQS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.subText,
    textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 18, gap: 12,
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 13, color: COLORS.subText, lineHeight: 20 },

  messageInput: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
  },
  charCount: { fontSize: 11, color: COLORS.lightGray, textAlign: 'right', marginTop: -6 },

  sendBtn: {
    backgroundColor: COLORS.hotPink,
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  emailNote: { fontSize: 12, color: COLORS.subText, textAlign: 'center' },
  emailLink: { color: COLORS.hotPink, fontWeight: '600' },

  // FAQ
  faqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, paddingRight: 8 },
  faqAnswer: {
    paddingBottom: 12,
    paddingTop: 2,
  },
  faqA: { fontSize: 13, color: COLORS.subText, lineHeight: 20 },
  divider: { height: 1, backgroundColor: COLORS.offWhite },
});