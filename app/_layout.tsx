import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { palette } from '@/constants/library-theme';
import { AuthProvider } from '@/contexts/auth-context';
import { LibraryProvider } from '@/contexts/library-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: palette.background,
            },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </LibraryProvider>
    </AuthProvider>
  );
}
