import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/library-theme';

type StatCardProps = {
  label: string;
  value: string;
  accent?: 'primary' | 'accent' | 'success' | 'warning';
  caption?: string;
};

const accentMap = {
  primary: palette.primary,
  accent: palette.accent,
  success: palette.success,
  warning: palette.warning,
};

export function StatCard({
  label,
  value,
  accent = 'primary',
  caption,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.bar, { backgroundColor: accentMap[accent] }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  bar: {
    width: 46,
    height: 5,
    borderRadius: radii.pill,
  },
  label: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 30,
  },
  caption: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
