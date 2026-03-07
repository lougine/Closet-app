import { Stack } from "expo-router";

export default function IndexLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-items" />
      <Stack.Screen name="item-detail" />
      <Stack.Screen name="outfit" />
      <Stack.Screen name="lookbook" />
    </Stack>
  );
}
