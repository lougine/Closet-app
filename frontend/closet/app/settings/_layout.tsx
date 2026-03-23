import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </SafeAreaView>
  );
}