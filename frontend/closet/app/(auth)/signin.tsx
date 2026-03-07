import React from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Dimensions, ScrollView, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

const { width } = Dimensions.get('window');

export default function SignInScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* 1. TOP WAVE IMAGE */}
      <Image
        source={require('@/assets/images/auth.png')}
        style={styles.topImage}
        resizeMode="stretch"
      />

      <View style={styles.contentSection}>

        {/* 2. HEADER */}
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>
          Welcome back!
        </Text>
        <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
          Log in to style more items!
        </Text>

        {/* 3. EMAIL INPUT */}
        <View style={styles.inputWrapper}>
          <Text style={[styles.label, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#555"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* 4. PASSWORD INPUT */}
        <View style={styles.inputWrapper}>
          <Text style={[styles.label, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#555"
            style={styles.input}
            secureTextEntry
          />
        </View>

        {/* 5. FORGOT PASSWORD */}
<TouchableOpacity style={styles.forgotContainer} onPress={() => router.push('/(auth)/forgotpass')}>
  <Text style={[styles.forgotText, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
    Forgot password?
  </Text>
</TouchableOpacity>

        {/* 6. SIGN IN BUTTON */}
        <TouchableOpacity style={styles.signInButton}>
          <Text style={[styles.signInButtonText, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>
            Sign in
          </Text>
        </TouchableOpacity>

        {/* 7. DIVIDER */}
        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        {/* 8. GOOGLE SIGN IN */}
        <TouchableOpacity style={styles.googleButton}>
          <View style={styles.googleContent}>
            <Image
              source={require('@/assets/images/google.png')}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={[styles.googleButtonText, fontsLoaded && { fontFamily: 'Inter-Bold' }]}>
              Sign in with google
            </Text>
          </View>
        </TouchableOpacity>

        {/* 9. JOIN NOW LINK */}
        <TouchableOpacity onPress={() => router.push('/signup')}>
  <Text style={[styles.footerText, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>
    New to Dribble? <Text style={styles.joinLink}>Join now</Text>
  </Text>
</TouchableOpacity>

        {/* 10. BOTTOM LOGO */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.bottomLogo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
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
  topImage: {
    width: width,
    height: 160,
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontSize: 14,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
  },
  forgotText: {
    color: '#FB92BD',
    fontSize: 13,
  },
  signInButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 45,
    borderRadius: 25,
    marginBottom: 15,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
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
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
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
    color: '#FFFFFF',
    fontSize: 15,
  },
  footerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
  },
  joinLink: {
    color: '#FB92BD',
  },
  bottomLogo: {
    width: width * 1.0,
    height: 220,
    marginTop: 10,
    alignSelf: 'center',
    opacity: 0.9,
  },
});