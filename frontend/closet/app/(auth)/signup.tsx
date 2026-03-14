import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Dimensions, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../Styles/auth/signup.styles';

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

          <InputField label="First Name" placeholder="Enter your first name" />
          <InputField label="Last Name" placeholder="Enter your last name" />
          <InputField label="Email" placeholder="Enter your email" />
          <InputField label="Password" placeholder="Enter your password" secureTextEntry />
          <InputField label="Confirm password" placeholder="Re-enter your password" secureTextEntry />

          <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/(auth)/signupdetails')} >
            <Text style={styles.signUpButtonText}>Sign up</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

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

          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.signInLink}>SIGN IN</Text>
            </Text>
          </TouchableOpacity>

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