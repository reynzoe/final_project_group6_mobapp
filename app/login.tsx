import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { BookCover } from '@/components/book-cover';
import { AppInput } from '@/components/app-input';
import { palette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { getApiBaseUrl } from '@/lib/api';
import { validateEmail, validatePassword, validateRequiredText } from '@/lib/validation';

type Mode = 'login' | 'register';

const demoAccounts = [
  {
    label: 'Librarian Demo',
    email: 'admin@libraryapp.local',
    password: 'Admin123!',
    role: 'Librarian',
  },
  {
    label: 'Student Demo',
    email: 'student@libraryapp.local',
    password: 'Student123!',
    role: 'Student',
  },
];

export default function LoginScreen() {
  const { user, login, register, isSubmitting } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  function applyDemoAccount(nextEmail: string, nextPassword: string) {
    setMode('login');
    setEmail(nextEmail);
    setPassword(nextPassword);
    setFullName('');
    setErrors({});
  }

  function validateForm() {
    const nextErrors: Record<string, string | null> = {
      email: validateEmail(email),
      password: validatePassword(password),
      fullName: mode === 'register' ? validateRequiredText('Full name', fullName) : null,
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    try {
      if (mode === 'login') {
        await login({
          email,
          password,
        });
      } else {
        await register({
          fullName,
          email,
          password,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert(mode === 'login' ? 'Sign in failed' : 'Registration failed', message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.brandLockup}>
              <Text style={styles.brand}>The Public Library</Text>
              <Text style={styles.heroTitle}>Library Management System</Text>
              <Text style={styles.heroCopy}>
                Search the shelves, manage borrowed books, and keep availability clear for every reader.
              </Text>
            </View>
            <View style={styles.coverStack}>
              <BookCover title="Reading List" author="Public Library" category="New" size="md" />
              <BookCover title="Borrowed Today" author="Library Desk" category="Ready" size="md" />
              <BookCover title="Fresh Finds" author="Collection" category="Books" size="md" />
            </View>
          </View>

          <AppCard>
            <View style={styles.modeSwitcher}>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.modeTab, mode === 'login' ? styles.modeTabActive : undefined]}>
                <Text
                  style={[
                    styles.modeTabLabel,
                    mode === 'login' ? styles.modeTabLabelActive : undefined,
                  ]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('register')}
                style={[styles.modeTab, mode === 'register' ? styles.modeTabActive : undefined]}>
                <Text
                  style={[
                    styles.modeTabLabel,
                    mode === 'register' ? styles.modeTabLabelActive : undefined,
                  ]}>
                  Register
                </Text>
              </Pressable>
            </View>

            {mode === 'register' ? (
              <AppInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                error={errors.fullName}
              />
            ) : null}

            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
            />

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              error={errors.password}
              hint={mode === 'register' ? 'Use uppercase, lowercase, and a number.' : undefined}
            />

            <AppButton
              label={mode === 'login' ? 'Sign In' : 'Create Student Account'}
              onPress={handleSubmit}
              loading={isSubmitting}
            />
          </AppCard>

          <AppCard>
            <Text style={styles.sectionTitle}>Quick Demo Access</Text>
            <Text style={styles.sectionCopy}>
              Use one of the seeded accounts below to explore both roles immediately.
            </Text>

            {demoAccounts.map((account) => (
              <View key={account.email} style={styles.demoRow}>
                <View style={styles.demoDetails}>
                  <Text style={styles.demoLabel}>{account.label}</Text>
                  <Text style={styles.demoMeta}>
                    {account.email} / {account.password}
                  </Text>
                </View>
                <AppButton
                  label={`Use ${account.role}`}
                  variant="secondary"
                  compact
                  onPress={() => applyDemoAccount(account.email, account.password)}
                />
              </View>
            ))}
          </AppCard>

          <AppCard style={styles.apiCard}>
            <Text style={styles.sectionTitle}>Development API</Text>
            <Text style={styles.apiText}>{getApiBaseUrl()}</Text>
            <Text style={styles.sectionCopy}>
              Start the backend in a second terminal with <Text style={styles.code}>npm run api</Text>.
            </Text>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  brandLockup: {
    gap: spacing.sm,
  },
  brand: {
    color: palette.primary,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 40,
    lineHeight: 43,
  },
  heroCopy: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
  },
  coverStack: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: palette.white,
  },
  modeTabLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  modeTabLabelActive: {
    color: palette.primary,
  },
  sectionTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  sectionCopy: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  demoRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  demoDetails: {
    gap: spacing.xs,
  },
  demoLabel: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  demoMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  apiCard: {
    backgroundColor: palette.surfaceMuted,
  },
  apiText: {
    color: palette.primary,
    fontFamily: typography.mono,
    fontSize: 13,
  },
  code: {
    fontFamily: typography.mono,
    color: palette.primary,
  },
});
