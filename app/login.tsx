import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
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
import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { validateEmail, validatePassword, validateRequiredText } from '@/lib/validation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, login, register, isSubmitting } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [demoOpen, setDemoOpen] = useState(false);

  // Scroll ref for the "Get Started" reveal animation
  const scrollRef = useRef<ScrollView>(null);

  // Demo dropdown animation
  const demoAnim = useRef(new Animated.Value(0)).current;

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  function handleStart() {
    scrollRef.current?.scrollTo({ y: SCREEN_HEIGHT, animated: true });
  }

  function toggleDemo() {
    const opening = !demoOpen;
    setDemoOpen(opening);
    Animated.spring(demoAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      speed: 16,
      bounciness: 3,
    }).start();
  }

  function applyDemoAccount(demoEmail: string, demoPassword: string) {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFullName('');
    setErrors({});
    // Close demo panel and scroll to form
    setDemoOpen(false);
    Animated.timing(demoAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  function validateForm() {
    const nextErrors: Record<string, string | null> = {
      email: validateEmail(email),
      password: validatePassword(password),
      fullName: mode === 'register' ? validateRequiredText('Username', fullName) : null,
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSubmit() {
    if (!validateForm()) return;
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

  // Demo panel height: 2 cards × ~90px + padding ≈ 220
  const demoPanelHeight = demoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 224],
  });
  const demoOpacity = demoAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <SafeAreaView style={[styles.safeArea]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}>

          {/* ── PAGE 1: Landing ───────────────────────────────────────── */}
          <View style={styles.landingPage}>
            {/* Logo centred in upper half */}
            <View style={styles.landingCenter}>
              <View style={styles.landingLogo}>
                <BrandLogo size="lg" tone="light" />
              </View>
              <Text style={styles.landingTagline}>
                Your library,{'\n'}in your pocket.
              </Text>
              <View style={styles.featureRow}>
                {features.map((f) => (
                  <View key={f.label} style={styles.featureChip}>
                    <Ionicons name={f.icon} size={13} color={palette.white} />
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Get Started pinned to bottom */}
            <View style={styles.landingBottom}>
              <Pressable style={styles.getStartedBtn} onPress={handleStart}>
                <Text style={styles.getStartedLabel}>Get Started</Text>
                <Ionicons name="arrow-down" size={18} color={palette.primary} />
              </Pressable>
              <Text style={styles.landingHint}>Scroll to sign in or register</Text>
            </View>
          </View>

          {/* ── PAGE 2: Sign-in / Register form ──────────────────────── */}
          <View style={styles.formPage}>
            {/* Header strip that continues the hero colour */}
            <View style={styles.formHeroStrip}>
              <BrandLogo size="sm" tone="light" showWordmark={false} />
              <Text style={styles.formHeroTitle}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
            </View>

            <View style={styles.formBody}>
              {/* Mode switcher */}
              <View style={styles.modeSwitcher}>
                <Pressable
                  onPress={() => setMode('login')}
                  style={[styles.modeTab, mode === 'login' ? styles.modeTabActive : undefined]}>
                  <Text style={[styles.modeTabLabel, mode === 'login' ? styles.modeTabLabelActive : undefined]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('register')}
                  style={[styles.modeTab, mode === 'register' ? styles.modeTabActive : undefined]}>
                  <Text style={[styles.modeTabLabel, mode === 'register' ? styles.modeTabLabelActive : undefined]}>
                    Register
                  </Text>
                </Pressable>
              </View>

              {mode === 'register' ? (
                <AppInput
                  label="Username"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your username"
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

              {/* ── Quick Demo Access ──────────────────────────────────── */}
              <View style={styles.demoDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable style={styles.demoToggleBtn} onPress={toggleDemo}>
                <Ionicons name="flash-outline" size={16} color={palette.primary} />
                <Text style={styles.demoToggleLabel}>Quick Demo Access</Text>
                <Ionicons
                  name={demoOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={palette.primary}
                />
              </Pressable>

              {/* Animated demo cards dropdown */}
              <Animated.View style={[styles.demoPanel, { height: demoPanelHeight, opacity: demoOpacity }]}>
                {demoAccounts.map((account) => (
                  <Pressable
                    key={account.email}
                    onPress={() => applyDemoAccount(account.email, account.password)}
                    style={({ pressed }) => [
                      styles.demoRow,
                      { borderColor: pressed ? palette.primary : palette.border,
                        backgroundColor: pressed ? palette.primaryMuted : palette.surface },
                    ]}>
                    <View style={styles.demoIcon}>
                      <Ionicons name={account.icon} size={20} color={palette.primary} />
                    </View>
                    <View style={styles.demoDetails}>
                      <Text style={styles.demoLabel}>{account.label}</Text>
                      <Text style={styles.demoMeta}>{account.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                  </Pressable>
                ))}
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.primary,
    },
    keyboardShell: {
      flex: 1,
    },
    scrollContent: {
      // Two full-height pages stacked
    },

    // ── Landing page ──────────────────────────────────────────────────────────
    landingPage: {
      height: SCREEN_HEIGHT,
      backgroundColor: palette.primary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      justifyContent: 'space-between',
    },
    landingCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: spacing.xl,
    },
    landingLogo: {
      // just spacing around the logo
    },
    landingTagline: {
      color: palette.white,
      fontFamily: typography.heading,
      fontSize: 42,
      lineHeight: 48,
    },
    featureRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    featureChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 7,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255,255,255,0.13)',
    },
    featureLabel: {
      color: palette.white,
      fontFamily: typography.body,
      fontSize: 12,
      fontWeight: '700',
    },
    landingBottom: {
      gap: spacing.sm,
      alignItems: 'center',
    },
    getStartedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: palette.white,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.pill,
      width: '100%',
      justifyContent: 'center',
    },
    getStartedLabel: {
      color: palette.primary,
      fontFamily: typography.body,
      fontSize: 16,
      fontWeight: '800',
    },
    landingHint: {
      color: 'rgba(255,255,255,0.45)',
      fontFamily: typography.body,
      fontSize: 12,
    },

    // ── Form page ─────────────────────────────────────────────────────────────
    formPage: {
      minHeight: SCREEN_HEIGHT,
      backgroundColor: palette.background,
    },
    formHeroStrip: {
      backgroundColor: palette.primary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    formHeroTitle: {
      color: palette.white,
      fontFamily: typography.heading,
      fontSize: 28,
    },
    formBody: {
      marginTop: -spacing.xl,
      backgroundColor: palette.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },

    // Mode switcher
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
      backgroundColor: palette.surface,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
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

    // Demo section
    demoDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
    },
    dividerLabel: {
      color: palette.textMuted,
      fontFamily: typography.body,
      fontSize: 13,
    },
    demoToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.pill,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: palette.surface,
    },
    demoToggleLabel: {
      flex: 1,
      color: palette.primary,
      fontFamily: typography.body,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    demoPanel: {
      overflow: 'hidden',
      gap: spacing.sm,
    },
    demoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: radii.md,
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
      fontSize: 14,
      fontWeight: '700',
    },
    demoMeta: {
      color: palette.textMuted,
      fontFamily: typography.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
