import { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { AppPalette, radii, shadow, spacing } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadow,
    },
  });
}

export function AppCard({ style, ...props }: ViewProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return <View style={[styles.card, style]} {...props} />;
}
