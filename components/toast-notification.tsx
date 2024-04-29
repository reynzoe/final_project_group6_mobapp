import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

type Props = {
  message: string;
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ToastNotification({ message, visible, icon = 'bookmark' }: Props) {
  const { palette } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.inner, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.primary }]}>
          <Ionicons name={icon} size={16} color={palette.white} />
        </View>
        <Text style={[styles.message, { color: palette.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
