import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Switch} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { useAppTheme } from '@/context/themeContext';
import { styles } from '../../Styles/settings/passwords-privacy.styles';

export default function PasswordsPrivacyScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [privateProfile, setPrivateProfile] = useState(false); 
  const [allowRecommendations, setAllowRecommendations] = useState(true);

  const theme = isDarkMode
    ? {
        screen: '#121212',
        card: '#1E1E1E',
        text: '#F2F2F2',
        subText: '#A8A8A8',
        border: '#343434',
        inputBorder: '#444444',
      }
    : {
        screen: COLORS.offWhite,
        card: COLORS.white,
        text: COLORS.text,
        subText: COLORS.subText,
        border: COLORS.offWhite,
        inputBorder: COLORS.lightGray,
      };

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
      const res = await fetch(buildApiUrl('/api/users/me/password'), {
        method: 'PUT',
        headers: {
          ...buildAuthHeaders(token),
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
    if (key === 'privateProfile') setPrivateProfile(value);
    if (key === 'allowRecommendations') setAllowRecommendations(value);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await fetch(buildApiUrl('/api/users/me/privacy'), {
        method: 'PUT',
        headers: { ...buildAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateProfile: key === 'privateProfile' ? value : privateProfile,
          allowRecommendations: key === 'allowRecommendations' ? value : allowRecommendations,
        }),
      });
    } catch {
      if (key === 'privateProfile') setPrivateProfile(!value);
      if (key === 'allowRecommendations') setAllowRecommendations(!value);
      Alert.alert('Error', 'Could not save privacy setting.');
    }
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.screen }]} contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }] }>
          <Ionicons name="chevron-back" size={22} color={COLORS.hotPink} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Passwords & Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Change Password</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
        <PasswordField
          label="Current password"
          value={currentPw}
          onChangeText={setCurrentPw}
          show={showCurrent}
          onToggleShow={() => setShowCurrent(!showCurrent)}
          theme={theme}
        />
        <Divider border={theme.border} />
        <PasswordField
          label="New password"
          value={newPw}
          onChangeText={setNewPw}
          show={showNew}
          onToggleShow={() => setShowNew(!showNew)}
          theme={theme}
        />
        <Divider border={theme.border} />
        <PasswordField
          label="Confirm new password"
          value={confirmPw}
          onChangeText={setConfirmPw}
          show={showConfirm}
          onToggleShow={() => setShowConfirm(!showConfirm)}
          theme={theme}
        />

        <Text style={[styles.pwHint, { color: theme.subText }]}>Minimum 8 characters</Text>

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

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Privacy</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Private profile</Text>
            <Text style={[styles.toggleSub, { color: theme.subText }]}>
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

        <Divider border={theme.border} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Personalised recommendations</Text>
            <Text style={[styles.toggleSub, { color: theme.subText }]}>
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

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>Danger Zone</Text>
      <View style={[styles.card, { backgroundColor: theme.card }] }>
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

function PasswordField({ label, value, onChangeText, show, onToggleShow, theme }: {
  label: string; value: string; onChangeText: (v: string) => void;
  show: boolean; onToggleShow: () => void;
  theme: {
    text: string;
    subText: string;
    inputBorder: string;
  };
}) {
  return (
    <View style={styles.pwRow}>
      <Text style={[styles.fieldLabel, { color: theme.subText }]}>{label}</Text>
      <View style={[styles.pwInputWrap, { borderBottomColor: theme.inputBorder }] }>
        <TextInput
          style={[styles.pwInput, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor={theme.subText}
        />
        <TouchableOpacity onPress={onToggleShow} style={styles.eyeBtn}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={18} color={theme.subText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Divider({ border }: { border: string }) { return <View style={[styles.divider, { backgroundColor: border }]} />; }
