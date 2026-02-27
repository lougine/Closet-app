import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular
  });
  const topImageHeight = 160;

  return (
    <View style={styles.container}>
          <StatusBar style="light" translucent backgroundColor="transparent" />
      
      <Image
              source={require('@/assets/images/auth.png')}
              style={[styles.topImage, { width, height: topImageHeight }]}
              resizeMode="stretch"
            />

      {/* CONTENT BELOW PNG */}
      <View style={[styles.contentContainer, { marginTop: topImageHeight }]}>
        <Text style={[styles.title, { fontFamily: 'Inter-Regular' }]}>Welcome!</Text>
        <Text style={[styles.subtitle, { fontFamily: 'Inter-Regular' }]}>
          Create an account to join Dribble
        </Text>

        {/* 3. INPUT FIELDS */}
        <InputField label="First Name" placeholder="Enter your first name" />
        <InputField label="Last Name" placeholder="Enter your last name" />
        <InputField label="Email" placeholder="Enter your email" />
        <InputField label="Password" placeholder="Enter your password" secureTextEntry />
        <InputField label="Confirm password" placeholder="Re-enter your password" secureTextEntry />

        {/* 4. SIGN UP BUTTON */}
        <TouchableOpacity style={styles.signUpButton}>
          <Text style={[styles.signUpButtonText, fontsLoaded && { fontFamily: 'Inter-Regular' }]}>Sign up</Text>
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
   contentContainer: {
    flex: 1,
    paddingHorizontal: 35,
    alignItems: 'center',
  },
  topImage: {
    position: 'absolute',
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 15,
  },
  title: {
    color: '#FFF',
    fontSize: 40, 
    alignSelf: 'flex-start',
    marginTop: -5,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 10,
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
    marginTop: -30,
    alignSelf: 'center',
    opacity: 0.9,
  },
});