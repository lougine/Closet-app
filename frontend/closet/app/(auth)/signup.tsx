import * as Google from 'expo-auth-session/providers/google';
import { Inter_400Regular, useFonts, Inter_700Bold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '441160248309-5io4gv5g2gnmsufpv5rqg8vtnge8fets.apps.googleusercontent.com',
    androidClientId: '441160248309-6ks3f21nj0614d11hgl1biq913orclal.apps.googleusercontent.com',
    iosClientId: '441160248309-lo594apa54pj6r70j0od0jete9p0r906.apps.googleusercontent.com',
  });

  // Handle Google Auth Navigation
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetchUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (token: string | undefined) => {
    if (!token) return;
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      console.log('Google user:', user);
      
      // Navigate to setup details after successful Google Login
      router.push('/(auth)/signupdetials'); 
    } catch (e) {
      console.error(e);
    }
  };

  const topImageHeight = 160;

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      {/* 1. WAVE IMAGE (Fixed to top) */}
      <Image
        source={require('@/assets/images/auth.png')}
        style={[styles.topImage, { width, height: topImageHeight }]}
        resizeMode="stretch"
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topImageHeight }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Create an account to join Dribble
          </Text>

          {/* 3. INPUT FIELDS */}
          <InputField label="First Name" placeholder="Enter your first name" />
          <InputField label="Last Name" placeholder="Enter your last name" />
          <InputField label="Email" placeholder="Enter your email" />
          <InputField label="Password" placeholder="Enter your password" secureTextEntry />
          <InputField label="Confirm password" placeholder="Re-enter your password" secureTextEntry />

          {/* 4. MAIN SIGN UP BUTTON (Navigates directly) */}
          <TouchableOpacity 
  style={styles.signUpButton} 
  onPress={() => router.push('/(auth)/signupdetials')}
>
            <Text style={styles.signUpButtonText}>Sign up</Text>
          </TouchableOpacity>

          {/* 5. DIVIDER */}
          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          {/* 6. GOOGLE SIGN UP */}
          <TouchableOpacity
            style={styles.googleButton}
            disabled={!request}
            onPress={() => promptAsync()}
          >
            <View style={styles.googleContent}>
              <Image 
                source={require('@/assets/images/google.png')} 
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>
                Sign up with google
              </Text>
            </View>
          </TouchableOpacity>

          {/* 7. SIGN IN LINK */}
          <TouchableOpacity onPress={() => console.log('Go to Login')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.signInLink}>SIGN IN</Text>
            </Text>
          </TouchableOpacity>

          {/* 8. BOTTOM LOGO */}
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.bottomLogo}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </View>
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
  topImage: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  contentContainer: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 40, 
    alignSelf: 'flex-start',
    fontFamily: 'Inter-Bold',
    marginTop: 10,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    alignSelf: 'flex-start',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontFamily: 'Inter-Regular',
  },
  signUpButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 15,
  },
  signUpButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FB92BD',
    opacity: 0.3,
  },
  orText: {
    color: '#888',
    marginHorizontal: 15,
    fontFamily: 'Inter-Regular',
  },
  googleButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  footerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  signInLink: {
    color: '#F0507B',
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: 180,
    height: 180,
    marginTop: 10,
    alignSelf: 'center',
  },
});