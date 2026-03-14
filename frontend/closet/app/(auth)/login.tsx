import {
  Inter_400Regular,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { buildApiUrl } from "../api";
import { styles } from "../../Styles/auth/login.styles";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Bold": Inter_700Bold,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message = err?.message || 'Login failed';
        Alert.alert('Login failed', message);
        return;
      }

      const data = await res.json();
      await SecureStore.setItemAsync('userToken', data.token);
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      Alert.alert('Login failed', 'Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:
      "441160248309-5io4gv5g2gnmsufpv5rqg8vtnge8fets.apps.googleusercontent.com",
    androidClientId:
      "441160248309-6ks3f21nj0614d11hgl1biq913orclal.apps.googleusercontent.com",
    iosClientId:
      "441160248309-lo594apa54pj6r70j0od0jete9p0r906.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      fetchUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (token: string | undefined) => {
    if (!token) return;
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      console.log("Google user:", user);

      router.push("/(auth)/signupdetails");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Image
        source={require("@/assets/images/auth.png")}
        style={styles.topImage}
        resizeMode="stretch"
      />

      <View style={styles.contentSection}>
        <Text
          style={[styles.title, fontsLoaded && { fontFamily: "Inter-Bold" }]}
        >
          Welcome back!
        </Text>
        <Text
          style={[
            styles.subtitle,
            fontsLoaded && { fontFamily: "Inter-Regular" },
          ]}
        >
          Log in to style more items!
        </Text>

        <View style={styles.inputWrapper}>
          <Text
            style={[
              styles.label,
              fontsLoaded && { fontFamily: "Inter-Regular" },
            ]}
          >
            Email
          </Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#555"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text
            style={[
              styles.label,
              fontsLoaded && { fontFamily: "Inter-Regular" },
            ]}
          >
            Password
          </Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#555"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.forgotContainer}
          onPress={() => router.push("/(auth)/forgotpass")}
        >
          <Text
            style={[
              styles.forgotText,
              fontsLoaded && { fontFamily: "Inter-Regular" },
            ]}
          >
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={[styles.loginButtonText, { fontFamily: "Inter-Bold" }]}> 
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
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
              source={require("@/assets/images/google.png")}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text
              style={[styles.googleButtonText, { fontFamily: "Inter-Bold" }]}
            >
              Sign In with google
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text
            style={[
              styles.footerText,
              fontsLoaded && { fontFamily: "Inter-Regular" },
            ]}
          >
            New to Dribble? <Text style={styles.joinLink}>Join now</Text>
          </Text>
        </TouchableOpacity>

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.bottomLogo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}
