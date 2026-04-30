import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/library-theme';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

type PillBadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const badgeColors = {
  primary: {
    backgroundColor: palette.primaryMuted,
    color: palette.primary,
  },
  success: {
    backgroundColor: palette.successSoft,
    color: palette.success,
  },
  warning: {
    backgroundColor: palette.warningSoft,
    color: palette.warning,
  },
  danger: {
    backgroundColor: palette.dangerSoft,
    color: palette.danger,
  },
  neutral: {
    backgroundColor: palette.surfaceMuted,
    color: palette.textMuted,
  },
};

export function PillBadge({ label, tone = 'neutral' }: PillBadgeProps) {
  const colors = badgeColors[tone] ?? badgeColors.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.label, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  label: {
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
