import { StyleSheet, View, ViewProps } from 'react-native';

import { palette, radii, shadow, spacing } from '@/constants/library-theme';

export function AppCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#ECEFEB',
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
});
