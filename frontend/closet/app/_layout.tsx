import { Stack } from "expo-router";
import "react-native-reanimated";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserProvider } from "../context/userContext";
import { WardrobeProvider } from "../context/wardrobeContext";
import { ThemeProvider, useAppTheme } from "../context/themeContext";

function AppShell() {
  const { isDarkMode } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" }} edges={["left", "right"]}>
      <View style={{ flex: 1, backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="modal" />
          <Stack.Screen name="wardrobe" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="features/settings" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="features/analytics" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <WardrobeProvider>
          <AppShell />
        </WardrobeProvider>
      </UserProvider>
    </ThemeProvider>
  );
}