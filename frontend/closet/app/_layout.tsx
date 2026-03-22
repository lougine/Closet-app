import { Stack } from "expo-router";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserProvider } from "../context/userContext";
import { WardrobeProvider } from "../context/wardrobeContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <WardrobeProvider>
        <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="modal" />
            <Stack.Screen name="wardrobe" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="features/settings" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="features/analytics" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="settings" />
          </Stack>
        </SafeAreaView>
      </WardrobeProvider>
    </UserProvider>
  );
}