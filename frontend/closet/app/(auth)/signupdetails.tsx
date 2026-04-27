import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Dimensions, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { buildApiUrl, buildAuthHeaders, fetchApiWithFallback } from '@/constants/api';
import styles from '../../Styles/auth/signupdetails.styles';

const { width } = Dimensions.get('window');

const OPTIONS = {
  gender: ['Male', 'Female'],
  clothingSize: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  shoesSize: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  height: ['150cm', '155cm', '160cm', '165cm', '170cm', '175cm', '180cm', '185cm', '190cm'],
  weight: ['45kg', '50kg', '55kg', '60kg', '65kg', '70kg', '75kg', '80kg', '85kg', '90kg+'],
  outfitFormula: ['Casual & comfortable', 'Smart casual', 'Formal & professional', 'Sporty & active', 'Trendy & bold'],
  styleWords: ['Minimalist', 'Classic', 'Bohemian', 'Streetwear', 'Elegant', 'Edgy'],
  closetGoal: ['Build a capsule wardrobe', 'Stay on trend', 'Shop more sustainably', 'Organize my outfits', 'Save money'],
  shoppingFrequency: ['Weekly', 'Monthly', 'Every few months', 'Rarely', 'Only on sale'],
};

export default function ProfileSetupScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold
  });

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!fontsLoaded) return null;

  const openModal = (key: string) => setModalKey(key);
  const closeModal = () => setModalKey(null);

  const selectOption = (key: string, value: string) => {
    setSelected(prev => ({ ...prev, [key]: value }));
    closeModal();
  };

  const parseNumericValue = (raw: string | undefined) => {
    if (!raw) return null;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return null;
    return parseInt(digits, 10);
  };

  const persistSignupDetails = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) return;

    const styleWord = selected.styleWords?.trim();
    const payload = {
      gender: selected.gender || null,
      clothingSize: selected.clothingSize || null,
      shoesSize: selected.shoesSize || null,
      heightCm: parseNumericValue(selected.height),
      weightKg: parseNumericValue(selected.weight),
      outfitFormula: selected.outfitFormula || null,
      styleWords: styleWord ? [styleWord] : [],
      closetGoal: selected.closetGoal || null,
      shoppingFrequency: selected.shoppingFrequency || null,
    };

    const res = await fetchApiWithFallback('/api/users/me', {
      method: 'PUT',
      headers: {
        ...buildAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }, { timeoutMs: 15000, retries: 1 });

    if (!res.ok) {
      throw new Error('Failed to save signup details');
    }
  };

  const handleContinue = async () => {
    try {
      setSaving(true);
      await persistSignupDetails();
    } catch (error) {
      console.warn('Failed to persist signup details:', error);
    } finally {
      setSaving(false);
      router.push('/(tabs)');
    }
  };

  const Dropdown = ({ optionKey }: { optionKey: string }) => (
    <TouchableOpacity style={styles.dropdown} onPress={() => openModal(optionKey)}>
      <Text style={[styles.dropdownText, !selected[optionKey] && styles.placeholder]}>
        {selected[optionKey] || 'Selects'}
      </Text>
      <Text style={styles.arrow}>▼</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Image
        source={require('@/assets/images/auth.png')}
        style={styles.topImage}
        resizeMode="stretch"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Gender</Text>
        <Dropdown optionKey="gender" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Clothing size</Text>
            <Dropdown optionKey="clothingSize" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Shoes size</Text>
            <Dropdown optionKey="shoesSize" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Height</Text>
            <Dropdown optionKey="height" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Weight</Text>
            <Dropdown optionKey="weight" />
          </View>
        </View>

        <Text style={styles.label}>What is your go-to outfit formula?</Text>
        <Dropdown optionKey="outfitFormula" />

        <Text style={styles.label}>Best words to describe your style?</Text>
        <Dropdown optionKey="styleWords" />

        <Text style={styles.label}>Primary goal for your closet?</Text>
        <Dropdown optionKey="closetGoal" />

        <Text style={styles.label}>How often do you buy new clothes?</Text>
        <Dropdown optionKey="shoppingFrequency" />

        <TouchableOpacity style={styles.signUpButton} onPress={handleContinue} disabled={saving}>
          <Text style={styles.signUpText}>{saving ? 'Saving...' : 'Sign up'}</Text>
        </TouchableOpacity>

        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.bottomLogo}
          resizeMode="contain"
        />

      </ScrollView>

      <Modal visible={!!modalKey} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={closeModal} activeOpacity={1}>
          <View style={styles.modalBox}>
            <ScrollView>
              {modalKey &&
                OPTIONS[modalKey as keyof typeof OPTIONS].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOption}
                    onPress={() => selectOption(modalKey, option)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selected[modalKey] === option && styles.modalOptionSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}