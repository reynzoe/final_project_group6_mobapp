import { Platform } from 'react-native';

import { Fonts } from '@/constants/theme';

export const lightPalette = {
  background: '#F7F7F4',
  backgroundAccent: '#ECEFED',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2EF',
  surfaceStrong: '#E4E7E3',
  border: '#D9DDD7',
  text: '#171B1F',
  textMuted: '#626A70',
  primary: '#111827',
  primaryMuted: '#E8ECF7',
  accent: '#007F9F',
  accentSoft: '#DFF5F8',
  success: '#2C7A4B',
  successSoft: '#E3F2E8',
  danger: '#B33A3A',
  dangerSoft: '#F8E5E5',
  warning: '#9A6A13',
  warningSoft: '#F8EBC9',
  white: '#FFFFFF',
};

export const darkPalette = {
  background: '#0F1118',
  backgroundAccent: '#161B24',
  surface: '#1C2132',
  surfaceMuted: '#232A3C',
  surfaceStrong: '#2B3350',
  border: '#333D58',
  text: '#DDE3F2',
  textMuted: '#8892B0',
  primary: '#3B7BF0',
  primaryMuted: '#18285E',
  accent: '#22C4DE',
  accentSoft: '#0C2F3C',
  success: '#35C47A',
  successSoft: '#0D2C1C',
  danger: '#E05C5C',
  dangerSoft: '#2E1212',
  warning: '#D4A830',
  warningSoft: '#2E2108',
  white: '#FFFFFF',
};

export type AppPalette = typeof lightPalette;

/** Static export kept for legacy imports — always returns light palette.
 *  Prefer useTheme() in components so dark mode applies. */
export const palette = lightPalette;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 8,
  pill: 999,
};

export const typography = {
  heading: Fonts.serif,
  body: Fonts.sans,
  mono: Fonts.mono,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#16212A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 2,
  },
  default: {
    shadowColor: '#16212A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
