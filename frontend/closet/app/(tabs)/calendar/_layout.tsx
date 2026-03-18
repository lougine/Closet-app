import { Stack } from 'expo-router';

export default function CalendarLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="calendar-index" />
      <Stack.Screen name="day" />
      <Stack.Screen name="month" />
    </Stack>
  );
}