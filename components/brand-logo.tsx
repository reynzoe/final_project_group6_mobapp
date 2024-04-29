import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { lightPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

// brand-logo sits on the login hero (always dark background), so we resolve
// palette per render to support theming but keep light defaults for the logo tones.
const palette = lightPalette; // used only for static fallback below

type LogoSize = 'sm' | 'md' | 'lg';

type BrandLogoProps = {
  size?: LogoSize;
  showWordmark?: boolean;
  tone?: 'dark' | 'light';
};

const sizeMap: Record<LogoSize, { mark: number; icon: number; word: number; tag: number; gap: number }> = {
  sm: { mark: 36, icon: 20, word: 22, tag: 10, gap: spacing.sm },
  md: { mark: 56, icon: 30, word: 32, tag: 11, gap: spacing.md },
  lg: { mark: 80, icon: 44, word: 44, tag: 13, gap: spacing.md },
};

export function BrandLogo({ size = 'md', showWordmark = true, tone = 'dark' }: BrandLogoProps) {
  const { palette: themePalette } = useTheme();
  const dimensions = sizeMap[size];
  const isDark = tone === 'dark';
  const p = themePalette;

  return (
    <View style={[styles.row, { gap: dimensions.gap }]}>
      <View
        style={[
          styles.mark,
          {
            width: dimensions.mark,
            height: dimensions.mark,
            backgroundColor: isDark ? p.primary : p.white,
          },
        ]}>
        <Ionicons
          name="book"
          size={dimensions.icon}
          color={isDark ? p.white : p.primary}
        />
      </View>
      {showWordmark ? (
        <View style={styles.lockup}>
          <Text
            style={[
              styles.wordmark,
              { fontSize: dimensions.word, color: isDark ? p.text : p.white },
            ]}>
            Shelby&rsquo;s
          </Text>
          <Text
            style={[
              styles.tagline,
              { fontSize: dimensions.tag, color: isDark ? p.textMuted : p.surfaceMuted },
            ]}>
            LIBRARY · READ MORE
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    gap: 2,
  },
  wordmark: {
    fontFamily: typography.heading,
    letterSpacing: -0.6,
    lineHeight: undefined,
  },
  tagline: {
    fontFamily: typography.body,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
