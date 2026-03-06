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
          <Stack.Screen
            name="item-detail"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="features/add-items"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="features/settings"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="features/analytics"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="outfit"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="lookbook"
            options={{ animation: "slide_from_bottom" }}
          />
        </Stack>
      </WardrobeProvider>
    </UserProvider>
  );
}
