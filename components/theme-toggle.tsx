import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/contexts/theme-context';

export function ThemeToggle() {
  const { isDark, toggleTheme, palette } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(spin, {
      toValue: isDark ? 1 : 0,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [isDark, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPress={toggleTheme}
      style={[styles.coin, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
      hitSlop={8}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={18}
          color={isDark ? '#D4A830' : '#F59E0B'}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  coin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
