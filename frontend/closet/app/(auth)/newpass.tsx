import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Dimensions, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

const { width } = Dimensions.get('window');

export default function SetNewPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* 1. TOP WAVE IMAGE */}
      <Image
        source={require('@/assets/images/auth.png')}
        style={styles.topImage}
        resizeMode="stretch"
      />

      {/* 2. BACK BUTTON */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      {/* 3. CONTENT */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Create a new password. Ensure it differs from previous ones for security
        </Text>

        {/* 4. PASSWORD INPUT */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#555"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* 5. CONFIRM PASSWORD INPUT */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            placeholder="Re-enter your password"
            placeholderTextColor="#555"
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {/* 6. UPDATE PASSWORD BUTTON */}
        <TouchableOpacity style={styles.updateButton}>
          <Text style={styles.updateButtonText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* 7. BOTTOM LOGO */}
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.bottomLogo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topImage: {
    width: width,
    height: 160,
    position: 'absolute',
    top: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    backgroundColor: '#CCCCCC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 170,
    marginLeft: 25,
  },
  backText: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '300',
    marginTop: -3,
  },
  contentSection: {
    paddingHorizontal: 30,
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 25,
    lineHeight: 22,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  updateButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: width,
    height: 200,
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    opacity: 0.9,
  },
});