import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppPalette, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

type EmptyStateProps = { title: string; message: string };

function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: 'dashed',
      borderRadius: 24,
      padding: spacing.xl,
      backgroundColor: palette.surfaceMuted,
      gap: spacing.sm,
    },
    title: { color: palette.text, fontFamily: typography.heading, fontSize: 22 },
    message: { color: palette.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  });
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
