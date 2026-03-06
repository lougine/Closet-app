import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
  });

  if (!fontsLoaded) return null;

  const handleLogin = () => {
    router.replace('/(tabs)');
  };

  const topImageHeight = 160;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Image
        source={require('@/assets/images/auth.png')}
        style={[styles.topImage, { width, height: topImageHeight }]}
        resizeMode="stretch"
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={[styles.loginButtonText, { fontFamily: 'Inter-Bold' }]}>
          LOG IN
        </Text>
      </TouchableOpacity>
      
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
    alignItems: 'center',
  },
  topImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loginButton: {
    marginTop: 180,
    backgroundColor: '#FB92BD',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  bottomLogo: {
    position: 'absolute',
    bottom: 20,
    width: width * 0.8,
    height: 180,
    opacity: 0.9,
  },
});