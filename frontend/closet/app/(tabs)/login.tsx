import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router'; // 1. Added this import

// Font Imports
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter(); 

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* 1. TOP SECTION: Pink Background + Logo */}
      <View style={styles.topSection}>
        <Image 
          source={require('@/assets/images/Icon.jpeg')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* 2. DECORATIVE WAVE: The transition between pink and dark */}
      <View style={styles.waveContainer}>
        <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <Path
            fill="#121212"
            d="M0,64L80,101.3C160,139,320,213,480,213.3C640,213,800,139,960,112C1120,85,1280,107,1360,117.3L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
          />
          
        </Svg>
      </View>

      {/* 3. BOTTOM SECTION: Dark Background + Text & Buttons */}
      <View style={styles.bottomSection}>
        <Text style={[styles.welcomeText, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
          Dribble
        </Text>
        
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
            Sign in to be inspired by the works of stylists
          </Text>
          
          <View style={styles.lineRow}>
            {/* The Pink Line from Figma */}
            <View style={styles.pinkLine} /> 
            <Text style={[styles.description, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
              or to inspire others with your style
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => router.push('/signup')} 
        >
          <Text style={[styles.createButtonText, fontsLoaded && { fontFamily: 'Inter-ExtraBold' }]}>
            CREATE ACCOUNT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink}>
          <Text style={[styles.loginText, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>
            LOG IN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FB92BD', 
  },
  topSection: {
    height: height * 0.45, 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    width: 220,
    height: 220,
  },
  waveContainer: {
    position: 'absolute',
    top: height * 0.32, 
    width: width,
    height: 160, 
    zIndex: 10,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#121212', 
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 40,
    zIndex: 3,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 42,
    marginBottom: 15,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  description: {
    color: '#D9D9D9',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pinkLine: {
    width: 65,            
    height: 2,          
    backgroundColor: '#FB92BD', 
    marginRight: 8,
    borderRadius: 1,
  },
  createButton: {
    backgroundColor: '#FB92BD', 
    paddingVertical: 18,
    borderRadius: 35,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 25,
  },
  loginText: {
    color: '#F0507B', 
    fontSize: 16,
  },
});