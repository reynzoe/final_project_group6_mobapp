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
        <View style={styles.header}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>The Public Library</Text>
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
  header: {
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: palette.primary,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 32,
  },
  subtitle: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
