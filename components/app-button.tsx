import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/library-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  compact?: boolean;
};

const variantStyles = {
  primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
    color: palette.white,
  },
  secondary: {
    backgroundColor: palette.primaryMuted,
    borderColor: palette.primaryMuted,
    color: palette.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.border,
    color: palette.text,
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
    color: palette.white,
  },
};

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  compact = false,
  style,
  ...props
}: AppButtonProps) {
  const currentVariant = variantStyles[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      style={(state) => {
        const { pressed } = state;

        return [
          styles.button,
          compact && styles.compact,
          {
            backgroundColor: currentVariant.backgroundColor,
            borderColor: currentVariant.borderColor,
          },
          pressed && !(disabled || loading) && styles.pressed,
          (disabled || loading) && styles.disabled,
          typeof style === 'function' ? style(state) : style,
        ];
      }}
      {...props}>
      {loading ? (
        <ActivityIndicator color={currentVariant.color} />
      ) : (
        <Text style={[styles.label, { color: currentVariant.color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
