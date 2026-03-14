import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Dimensions, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../Styles/auth/newpass.styles';

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

      <Image
        source={require('@/assets/images/auth.png')}
        style={styles.topImage}
        resizeMode="stretch"
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.contentSection}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Create a new password. Ensure it differs from previous ones for security
        </Text>

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

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.updateButtonText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.bottomLogo}
        resizeMode="contain"
      />
    </View>
  );
}