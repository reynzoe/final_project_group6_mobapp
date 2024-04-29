import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

type StatCardProps = {
  label: string;
  value: string;
  accent?: 'primary' | 'accent' | 'success' | 'warning';
  caption?: string;
};

function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 150,
      backgroundColor: palette.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    label: { color: palette.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    value: { color: palette.text, fontFamily: typography.heading, fontSize: 30 },
    caption: { color: palette.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  });
}

export function StatCard({ label, value, accent = 'primary', caption }: StatCardProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const accentColor = accent === 'accent' ? palette.accent
    : accent === 'success' ? palette.success
    : accent === 'warning' ? palette.warning
    : palette.primary;

  return (
    <View style={styles.card}>
      <View style={{ width: 46, height: 5, borderRadius: radii.pill, backgroundColor: accentColor }} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}
