
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/help.styles';


const SUPPORT_EMAIL = 'support@closetdripp.com';

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
  const { isDarkMode } = useAppTheme();
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const theme = isDarkMode
    ? {
        screen: '#121212',
        card: '#1E1E1E',
        text: '#F2F2F2',
        subText: '#A8A8A8',
        border: '#343434',
        inputBg: '#171717',
      }
    : {
        screen: COLORS.offWhite,
        card: COLORS.white,
        text: COLORS.text,
        subText: COLORS.subText,
        border: COLORS.offWhite,
        inputBg: COLORS.offWhite,
      };

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
      style={[styles.scroll, { backgroundColor: theme.screen }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Help</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <View style={styles.cardHeader}>
          <Ionicons name="mail-outline" size={22} color={COLORS.hotPink} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Contact Us</Text>
        </View>
        <Text style={[styles.cardSub, { color: theme.subText }] }>
          Having an issue? Tell us what's going on and we'll get back to you as soon as possible. 
        </Text>

        <TextInput
          style={[styles.messageInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue here..."
          placeholderTextColor={COLORS.lightGray}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={[styles.charCount, { color: theme.subText }]}>{message.length}/1000</Text>

        <TouchableOpacity style={styles.sendBtn} onPress={handleSendEmail}>
          <Ionicons name="send" size={16} color={COLORS.white} />
          <Text style={styles.sendBtnText}>Send to support</Text>
        </TouchableOpacity>

        <Text style={[styles.emailNote, { color: theme.subText }] }>
          Or email us directly at{' '}
          <Text
            style={styles.emailLink}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Frequently Asked Questions</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        {FAQS.map((faq, i) => (
          <View key={i}>
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.faqQ, { color: theme.text }]}>{faq.q}</Text>
              <Ionicons
                name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.hotPink}
              />
            </TouchableOpacity>

            {expandedFaq === i && (
              <View style={styles.faqAnswer}>
                <Text style={[styles.faqA, { color: theme.subText }]}>{faq.a}</Text>
              </View>
            )}

            {i < FAQS.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

