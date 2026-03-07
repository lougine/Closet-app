import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Dimensions, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

const { width } = Dimensions.get('window');

export default function VerifyCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '']);
  const inputs = useRef<Array<any>>([]);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 4) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

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
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a reset link to{' '}
          <Text style={styles.emailHighlight}>contact@dscode...com</Text>
          {'\n'}enter 5 digit code that mentioned in the email
        </Text>

        {/* 4. CODE INPUT BOXES */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputs.current[index] = ref; }}
              style={[styles.codeBox, digit ? styles.codeBoxFilled : null, { textAlign: 'center' }]}
              value={digit}
              onChangeText={text => handleChange(text.slice(-1), index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectionColor="#FB92BD"
            />
          ))}
        </View>

        {/* 5. VERIFY BUTTON */}
<TouchableOpacity style={styles.verifyButton} onPress={() => router.push('/(auth)/newpass')}>
  <Text style={styles.verifyButtonText}>Verify Code</Text>
</TouchableOpacity>

        {/* 6. RESEND EMAIL */}
        <Text style={styles.resendText}>
          Haven't got the email yet?{' '}
          <Text style={styles.resendLink}>Resend email</Text>
        </Text>
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
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 30,
    lineHeight: 22,
    alignSelf: 'flex-start',
  },
  emailHighlight: {
    color: '#FB92BD',
    fontFamily: 'Inter-Regular',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    gap: 10,
  },
  codeBox: {
    flex: 1,
    height: 55,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  codeBoxFilled: {
    borderColor: '#FB92BD',
  },
  verifyButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  resendText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  resendLink: {
    color: '#F0507B',
    fontFamily: 'Inter-Regular',
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