import { Inter_400Regular, useFonts, Inter_700Bold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  
  // Loading Inter Regular and Bold
  const [fontsLoaded] = useFonts({ 
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold 
  });

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [modalKey, setModalKey] = useState<string | null>(null);

  if (!fontsLoaded) return null;

  const openModal = (key: string) => setModalKey(key);
  const closeModal = () => setModalKey(null);

  const selectOption = (key: string, value: string) => {
    setSelected(prev => ({ ...prev, [key]: value }));
    closeModal();
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

      {/* TOP WAVE IMAGE */}
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
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        {/* Form Sections */}
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

        {/* Sign up button */}
        <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.signUpText}>Sign up</Text>
        </TouchableOpacity>

        {/* BOTTOM LOGO */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.bottomLogo}
          resizeMode="contain"
        />
      </ScrollView>

      {/* Selection Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topImage: {
    position: 'absolute',
    top: 0,
    width: width,
    height: 140, // Adjusted to match your auth.png curve
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 150, // Provides space so back button appears below the wave curve
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#CCCCCC', // Light gray background as seen in your screenshot
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 2,
  },
  backText: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4, // Centers the arrow visually
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    marginTop: 12,
  },
  dropdown: {
    backgroundColor: '#000000',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  placeholder: {
    color: '#666666',
  },
  arrow: {
    color: '#ccc',
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  signUpButton: {
    backgroundColor: '#FF8CBE', // Pink pulled from your wave asset
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 30,
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: 260,
    height: 190,
    marginTop: 10,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    width: width * 0.8,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalOptionText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  modalOptionSelected: {
    color: '#E91E63',
    fontFamily: 'Inter-Bold',
  },
});