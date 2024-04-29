import { Ionicons } from '@expo/vector-icons';
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
import { AppInput } from '@/components/app-input';
import { BrandLogo } from '@/components/brand-logo';
import { palette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { validateEmail, validatePassword, validateRequiredText } from '@/lib/validation';

type Mode = 'login' | 'register';

const demoAccounts = [
  {
    label: 'Librarian Demo',
    email: 'admin@libraryapp.local',
    password: 'Admin123!',
    role: 'Librarian',
    icon: 'shield-checkmark-outline' as const,
    description: 'Full access — manage books, members, and circulation.',
  },
  {
    label: 'Student Demo',
    email: 'student@libraryapp.local',
    password: 'Student123!',
    role: 'Student',
    icon: 'school-outline' as const,
    description: 'Browse the catalogue and borrow books.',
  },
];

const features = [
  { icon: 'search-outline' as const, label: 'Browse the shelves' },
  { icon: 'bookmarks-outline' as const, label: 'Borrow with one tap' },
  { icon: 'time-outline' as const, label: 'Track your loans' },
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
        await login({ email, password });
      } else {
        await register({ fullName, email, password });
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <BrandLogo size="lg" tone="light" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Your library, in your pocket.</Text>
              <Text style={styles.heroSubtitle}>
                Discover new reads, borrow with a tap, and keep your reading life on track.
              </Text>
            </View>
            <View style={styles.featureRow}>
              {features.map((feature) => (
                <View key={feature.label} style={styles.featureChip}>
                  <Ionicons name={feature.icon} size={14} color={palette.white} />
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.formArea}>
            <AppCard style={styles.formCard}>
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

              <Text style={styles.formHeader}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={styles.formSubheader}>
                {mode === 'login'
                  ? 'Sign in to continue reading.'
                  : 'Join Shelby’s in seconds — it’s free for students.'}
              </Text>

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
                label={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={handleSubmit}
                loading={isSubmitting}
              />
            </AppCard>

            <AppCard style={styles.demoCard}>
              <View style={styles.demoHeader}>
                <Ionicons name="flash-outline" size={18} color={palette.primary} />
                <Text style={styles.demoTitle}>Quick Demo Access</Text>
              </View>
              <Text style={styles.demoCopy}>
                Try Shelby&rsquo;s instantly with a pre-seeded account.
              </Text>

              {demoAccounts.map((account) => (
                <Pressable
                  key={account.email}
                  onPress={() => applyDemoAccount(account.email, account.password)}
                  style={({ pressed }) => [
                    styles.demoRow,
                    pressed ? styles.demoRowPressed : undefined,
                  ]}>
                  <View style={styles.demoIcon}>
                    <Ionicons name={account.icon} size={20} color={palette.primary} />
                  </View>
                  <View style={styles.demoDetails}>
                    <Text style={styles.demoLabel}>{account.label}</Text>
                    <Text style={styles.demoMeta}>{account.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                </Pressable>
              ))}
            </AppCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  logoWrap: {
    alignItems: 'flex-start',
  },
  heroCopy: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroTitle: {
    color: palette.white,
    fontFamily: typography.heading,
    fontSize: 36,
    lineHeight: 40,
  },
  heroSubtitle: {
    color: '#C9CDD3',
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  featureLabel: {
    color: palette.white,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '700',
  },
  formArea: {
    backgroundColor: palette.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    marginTop: -spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  formCard: {
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
  formHeader: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 26,
    marginTop: spacing.xs,
  },
  formSubheader: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -spacing.sm,
  },
  demoCard: {
    gap: spacing.md,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  demoCopy: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -spacing.xs,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  demoRowPressed: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.primary,
  },
  demoIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoDetails: {
    flex: 1,
    gap: 2,
  },
  demoLabel: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  demoMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
});
