// app/settings/_layout.tsx
// This file tells Expo Router that the /settings folder is a valid route group.
// All sub-pages (edit-profile, personal-info, etc.) slide in from the right
// as standard stack screens with no bottom tab bar showing.

import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* headerShown: false because each sub-page has its own custom back button */}
    </Stack>
  );
}