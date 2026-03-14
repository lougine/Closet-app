import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../Styles/auth/codeverify.styles';

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

      <Image
        source={require('@/assets/images/auth.png')}
        style={styles.topImage}
        resizeMode="stretch"
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.contentSection}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a reset link to{' '}
          <Text style={styles.emailHighlight}>contact@dscode...com</Text>
          {'\n'}enter 5 digit code that mentioned in the email
        </Text>

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

        <TouchableOpacity style={styles.verifyButton} onPress={() => router.push('/(auth)/newpass')}>
          <Text style={styles.verifyButtonText}>Verify Code</Text>
        </TouchableOpacity>

        <Text style={styles.resendText}>
          Haven't got the email yet?{' '}
          <Text style={styles.resendLink}>Resend email</Text>
        </Text>
      </View>

      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.bottomLogo}
        resizeMode="contain"
      />
    </View>
  );
}