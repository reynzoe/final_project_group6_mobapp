import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { BookmarksProvider } from '@/contexts/bookmarks-context';
import { LibraryProvider } from '@/contexts/library-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

function AppShell() {
  const { isDark, palette } = useTheme();

  return (
    <AuthProvider>
      <BookmarksProvider>
        <LibraryProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.background },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </LibraryProvider>
      </BookmarksProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
