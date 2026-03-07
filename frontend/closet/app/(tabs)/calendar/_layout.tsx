// app/(tabs)/calendar/_layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CalendarProvider wraps ALL screens in this folder so that both
// day.tsx and month.tsx share the same state without prop drilling.
//
// Screens in this folder:
//   index.tsx  → default screen shown when Calendar tab is tapped (day view)
//   day.tsx    → day view (same as index, kept for explicit routing)
//   month.tsx  → full month grid view
//
// calendar-context.tsx is a utility file, NOT a screen — hidden via href:null
// ─────────────────────────────────────────────────────────────────────────────

import { Stack } from 'expo-router';
import { CalendarProvider } from './calendar-context';

export default function CalendarLayout() {
  return (
    <CalendarProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="calendar-index" />
        <Stack.Screen name="day" />
        <Stack.Screen name="month" />
        {/* Hide context file — it's a utility, not a screen */}
        <Stack.Screen name="calendar-context" options={{ href: null } as any} />
      </Stack>
    </CalendarProvider>
  );
}