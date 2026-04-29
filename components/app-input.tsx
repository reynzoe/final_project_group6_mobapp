import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/library-theme';

type AppInputProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function AppInput({ label, hint, error, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textMuted}
        style={[styles.input, error ? styles.inputError : undefined, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 16,
  },
  inputError: {
    borderColor: palette.danger,
  },
  hint: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  error: {
    color: palette.danger,
    fontFamily: typography.body,
    fontSize: 12,
  },
});
