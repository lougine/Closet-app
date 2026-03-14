import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../Styles/auth/authStyles";

const { width, height } = Dimensions.get("window");

export default function Authenication() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
  });
  const topImageHeight = 650;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Image
        source={require("@/assets/images/authy.png")}
        style={[styles.topImage, { width, height: topImageHeight }]}
        resizeMode="stretch"
      />

      <View style={[styles.logoContainer, { height: topImageHeight }]}>
        <Image
          source={require("@/assets/images/Icon.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View
        style={[styles.contentContainer, { marginTop: topImageHeight - 50 }]}
      >
        <Text style={[styles.title, { fontFamily: "Inter-Regular" }]}>
          Dribble
        </Text>
        <Text style={[styles.subtitle, { fontFamily: "Inter-Regular" }]}>
          {" "}
          Sign in to be inspired by the works of stylists
        </Text>
        <View style={styles.lineRow}>
          <View style={styles.pinkLine} />
          <Text style={[styles.description, { fontFamily: "Inter-Regular" }]}>
            {" "}
            or to inspire others with your style
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/signup")}
        >
          <Text
            style={[styles.createButtonText, { fontFamily: "Inter-Regular" }]}
          >
            {" "}
            CREATE ACCOUNT{" "}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push("/login")}
        >
          <Text style={[styles.loginText, { fontFamily: "Inter-Regular" }]}>
            LOG IN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}