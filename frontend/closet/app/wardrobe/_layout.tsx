import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WardrobeLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="add-items" />
        <Stack.Screen name="search-garment-image" />
        <Stack.Screen name="item-detail" />
        <Stack.Screen name="outfit" />
        <Stack.Screen name="outfit-detail" />
        <Stack.Screen name="lookbook" />
        <Stack.Screen name="lookbook-detail" />
      </Stack>
    </SafeAreaView>
  );
}