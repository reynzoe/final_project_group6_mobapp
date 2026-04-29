import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/constants/library-theme';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: spacing.xl,
    backgroundColor: palette.surfaceMuted,
    gap: spacing.sm,
  },
  title: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  message: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
