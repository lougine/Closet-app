import React from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, ScrollView, Image 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

// Font Imports
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="light" />

      {/* 1. TOP WAVE DESIGN */}
      <View style={styles.topWaveContainer}>
        <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <Path
            fill="#FB92BD"
            d="M0,160 C400,0 600,400 1440,100 L1440,0 L0,0 Z"
          />
        </Svg>
      </View>

      <View style={styles.contentSection}>
        {/* 2. WELCOME HEADER - Set to 48px per Figma */}
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>Welcome!</Text>
        <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
          Create an account to join dribble
        </Text>

        {/* 3. INPUT FIELDS */}
        <InputField label="First Name" placeholder="Enter your first name" />
        <InputField label="Last Name" placeholder="Enter your last name" />
        <InputField label="Email" placeholder="Enter your email" />
        <InputField label="Password" placeholder="Enter your password" secureTextEntry />
        <InputField label="Confirm password" placeholder="Re-enter your password" secureTextEntry />

        {/* 4. SIGN UP BUTTON */}
        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => router.push('/(auth)/signupdetials')}
        >
          <Text style={[styles.signUpButtonText, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>Sign up</Text>
        </TouchableOpacity>

        {/* 5. DIVIDER SECTION */}
        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        {/* 6. GOOGLE SIGN UP WITH LOGO */}
        <TouchableOpacity style={styles.googleButton}>
          <View style={styles.googleContent}>
            <Image 
              source={require('@/assets/images/google.png')} 
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={[styles.googleButtonText, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>
              Sign up with google
            </Text>
          </View>
        </TouchableOpacity>

        {/* 7. SIGN IN LINK */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.signInLink}>SIGN IN</Text>
          </Text>
        </TouchableOpacity>

        {/* 8. BIG BOTTOM LOGO */}
        <Image 
          source={require('@/assets/images/logo.png')} 
          style={styles.bottomLogo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}

function InputField({ label, placeholder, secureTextEntry = false }: any) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        placeholder={placeholder} 
        placeholderTextColor="#555"
        style={styles.input}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topWaveContainer: {
    height: 100,
    width: width,
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 48, 
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  signUpButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 45,
    borderRadius: 25,
    marginTop: 10,
  },
  signUpButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FB92BD',
    opacity: 0.5,
  },
  orText: {
    color: '#888',
    marginHorizontal: 15,
  },
  googleButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 15,
  },
  footerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 5,
  },
  signInLink: {
    color: '#F0507B',
  },
  bottomLogo: {
    width: width * 1.0,
    height: 220,
    marginTop: 10,
    alignSelf: 'center',
    opacity: 0.9,
  },
});