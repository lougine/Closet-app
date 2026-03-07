import { Stack } from 'expo-router';
import { CalendarProvider } from '../../../context/calendar-context';

export default function CalendarLayout() {
  return (
    <CalendarProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="calendar-index" />
        <Stack.Screen name="day" />
        <Stack.Screen name="month" />
        <Stack.Screen name="calendar-context" options={{ href: null } as any} />
      </Stack>
    </CalendarProvider>
  );
}