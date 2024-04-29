import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type PillBadgeProps = { label: string; tone?: BadgeTone };

function makeBadgeColors(palette: AppPalette) {
  return {
    primary:  { backgroundColor: palette.primaryMuted, color: palette.primary },
    success:  { backgroundColor: palette.successSoft,  color: palette.success },
    warning:  { backgroundColor: palette.warningSoft,  color: palette.warning },
    danger:   { backgroundColor: palette.dangerSoft,   color: palette.danger },
    info:     { backgroundColor: palette.accentSoft,   color: palette.accent },
    neutral:  { backgroundColor: palette.surfaceMuted, color: palette.textMuted },
  };
}

export function PillBadge({ label, tone = 'neutral' }: PillBadgeProps) {
  const { palette } = useTheme();
  const colors = useMemo(() => makeBadgeColors(palette)[tone] ?? makeBadgeColors(palette).neutral, [palette, tone]);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.label, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  label: { fontFamily: typography.body, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
