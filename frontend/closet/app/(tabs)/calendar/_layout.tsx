import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="calendar-index" />
        <Stack.Screen name="day" />
        <Stack.Screen name="month" />
      </Stack>
    </SafeAreaView>
  );
}