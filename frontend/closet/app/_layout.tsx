import { Stack } from "expo-router";
import "react-native-reanimated";
import { UserProvider } from "../context/userContext";
import { WardrobeProvider } from "../context/wardrobeContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <WardrobeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="modal" />
          <Stack.Screen
            name="wardrobe/outfit"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="wardrobe/lookbook"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="wardrobe/add-items"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="wardrobe/item-detail"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="features/settings"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="features/analytics"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen name="settings" />
        </Stack>
      </WardrobeProvider>
    </UserProvider>
  );
}
