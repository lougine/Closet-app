import { Stack } from 'expo-router';
import { useState } from "react";
import 'react-native-reanimated';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}