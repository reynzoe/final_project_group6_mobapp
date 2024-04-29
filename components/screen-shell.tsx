import { PropsWithChildren, ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPalette, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';
import { ThemeToggle } from '@/components/theme-toggle';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  action?: ReactNode;
  refreshControl?: ReactNode;
}>;

function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.background },
    eyebrow: { color: palette.primary, fontFamily: typography.body, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    title: { color: palette.text, fontFamily: typography.heading, fontSize: 32 },
    subtitle: { color: palette.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
    border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  });
}

export function ScreenShell({ title, subtitle, action, refreshControl, children }: ScreenShellProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={staticStyles.scroll}
        contentContainerStyle={staticStyles.content}
        refreshControl={refreshControl as never}>
        <View style={[staticStyles.header, styles.border]}>
          {/* eyebrow row with coin toggle */}
          <View style={staticStyles.eyebrowRow}>
            <Text style={styles.eyebrow}>Shelby&rsquo;s</Text>
            <ThemeToggle />
          </View>
          <View style={staticStyles.heroCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {action ? <View style={staticStyles.action}>{action}</View> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const staticStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 36, gap: spacing.lg },
  header: { marginTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCopy: { gap: spacing.sm },
  action: { alignSelf: 'flex-start' },
});
