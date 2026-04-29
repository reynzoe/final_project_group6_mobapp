import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing, typography } from '@/constants/library-theme';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  action?: ReactNode;
  refreshControl?: ReactNode;
}>;

export function ScreenShell({
  title,
  subtitle,
  action,
  refreshControl,
  children,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl as never}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Library OS</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {action ? <View style={styles.action}>{action}</View> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    marginTop: spacing.md,
    backgroundColor: palette.primary,
    borderRadius: 30,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: '#C8DCEC',
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.white,
    fontFamily: typography.heading,
    fontSize: 34,
  },
  subtitle: {
    color: '#DBE9F5',
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
