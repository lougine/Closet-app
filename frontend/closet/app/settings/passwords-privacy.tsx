// app/settings/passwords-privacy.tsx
// Passwords & Privacy page — change password + privacy toggles.
// Change password: current password + new password + confirm.
// Privacy: toggle profile visibility and data sharing preferences.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const COLORS = {
  white: '#FFFFFF', offWhite: '#F6F6F6', lightGray: '#D9D9D9',
  lightPink: '#FB92BD', hotPink: '#F0507B', text: '#1A1A1A', subText: '#888888',
};

export default function PasswordsPrivacyScreen() {
  const router = useRouter();

  // ── Change password state ──────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // ── Privacy toggles state ─────────────────────────────────────────────────
  const [privateProfile, setPrivateProfile] = useState(false); // false = public
  const [allowRecommendations, setAllowRecommendations] = useState(true);

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Too short', 'New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setSavingPw(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      const res = await fetch('https://your-api.com/users/me/password', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.status === 401) {
        Alert.alert('Incorrect password', 'Your current password is wrong.');
        return;
      }
      if (!res.ok) throw new Error();
      Alert.alert('Done!', 'Your password has been updated.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      Alert.alert('Error', 'Could not update password. Try again.');
    } finally {
      setSavingPw(false);
    }
  }

  async function togglePrivacy(key: 'privateProfile' | 'allowRecommendations', value: boolean) {
    // Update locally immediately for snappy UI
    if (key === 'privateProfile') setPrivateProfile(value);
    if (key === 'allowRecommendations') setAllowRecommendations(value);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      // TODO: replace with your real API URL
      await fetch('https://your-api.com/users/me/privacy', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateProfile: key === 'privateProfile' ? value : privateProfile,
          allowRecommendations: key === 'allowRecommendations' ? value : allowRecommendations,
        }),
      });
    } catch {
      // Revert on failure
      if (key === 'privateProfile') setPrivateProfile(!value);
      if (key === 'allowRecommendations') setAllowRecommendations(!value);
      Alert.alert('Error', 'Could not save privacy setting.');
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Passwords & Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Change password card ── */}
      <Text style={styles.sectionLabel}>Change Password</Text>
      <View style={styles.card}>
        <PasswordField
          label="Current password"
          value={currentPw}
          onChangeText={setCurrentPw}
          show={showCurrent}
          onToggleShow={() => setShowCurrent(!showCurrent)}
        />
        <Divider />
        <PasswordField
          label="New password"
          value={newPw}
          onChangeText={setNewPw}
          show={showNew}
          onToggleShow={() => setShowNew(!showNew)}
        />
        <Divider />
        <PasswordField
          label="Confirm new password"
          value={confirmPw}
          onChangeText={setConfirmPw}
          show={showConfirm}
          onToggleShow={() => setShowConfirm(!showConfirm)}
        />

        <Text style={styles.pwHint}>Minimum 8 characters</Text>

        <TouchableOpacity
          style={[styles.saveBtn, savingPw && styles.saveBtnDisabled]}
          onPress={handleChangePassword}
          disabled={savingPw}
        >
          {savingPw
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.saveBtnText}>Update password</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Privacy settings card ── */}
      <Text style={styles.sectionLabel}>Privacy</Text>
      <View style={styles.card}>

        {/* Private profile toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Private profile</Text>
            <Text style={styles.toggleSub}>
              Only approved followers can see your outfits
            </Text>
          </View>
          <Switch
            value={privateProfile}
            onValueChange={(v) => togglePrivacy('privateProfile', v)}
            trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
            thumbColor={privateProfile ? COLORS.hotPink : COLORS.white}
            ios_backgroundColor={COLORS.lightGray}
          />
        </View>

        <Divider />

        {/* Outfit recommendations toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Personalised recommendations</Text>
            <Text style={styles.toggleSub}>
              Allow us to use your outfit data to suggest looks
            </Text>
          </View>
          <Switch
            value={allowRecommendations}
            onValueChange={(v) => togglePrivacy('allowRecommendations', v)}
            trackColor={{ false: COLORS.lightGray, true: COLORS.lightPink }}
            thumbColor={allowRecommendations ? COLORS.hotPink : COLORS.white}
            ios_backgroundColor={COLORS.lightGray}
          />
        </View>

      </View>

      {/* ── Delete account — destructive action at the bottom ── */}
      <Text style={styles.sectionLabel}>Danger Zone</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() =>
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all your data. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    // TODO: call DELETE /users/me then clear token and redirect to auth
                    Alert.alert('Contact support', 'To delete your account email us at support@closetdripp.com');
                  },
                },
              ]
            )
          }
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.hotPink} />
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ─── Reusable password input row with show/hide toggle ────────────────────────
function PasswordField({ label, value, onChangeText, show, onToggleShow }: {
  label: string; value: string; onChangeText: (v: string) => void;
  show: boolean; onToggleShow: () => void;
}) {
  return (
    <View style={styles.pwRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pwInputWrap}>
        <TextInput
          style={styles.pwInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor={COLORS.lightGray}
        />
        {/* Eye icon to reveal/hide password */}
        <TouchableOpacity onPress={onToggleShow} style={styles.eyeBtn}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={18} color={COLORS.subText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.offWhite },
  container: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20, gap: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.subText,
    textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginTop: 10, marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 18, gap: 14,
    shadowColor: COLORS.hotPink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  // Password field
  pwRow: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.subText, textTransform: 'uppercase', letterSpacing: 0.8 },
  pwInputWrap: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: COLORS.lightGray },
  pwInput: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 6 },
  eyeBtn: { padding: 6 },
  pwHint: { fontSize: 12, color: COLORS.subText },

  saveBtn: {
    backgroundColor: COLORS.hotPink, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // Privacy toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  toggleSub: { fontSize: 12, color: COLORS.subText, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.offWhite },

  // Delete account
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteText: { fontSize: 15, fontWeight: '600', color: COLORS.hotPink },
});