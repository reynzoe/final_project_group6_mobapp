import { Platform } from 'react-native';

import { Fonts } from '@/constants/theme';

export const palette = {
  background: '#F5EFE6',
  backgroundAccent: '#E8DDCF',
  surface: '#FFFDFC',
  surfaceMuted: '#F0E7DA',
  surfaceStrong: '#E1D1BE',
  border: '#D9C8B4',
  text: '#1D2A35',
  textMuted: '#64707B',
  primary: '#123B5D',
  primaryMuted: '#D7E6F2',
  accent: '#C56A2D',
  accentSoft: '#F3DEC9',
  success: '#2F7A5F',
  successSoft: '#DDEFE8',
  danger: '#A64238',
  dangerSoft: '#F6E1DE',
  warning: '#9B6C15',
  warningSoft: '#F8E9C6',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
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
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: {
    elevation: 6,
  },
  default: {
    shadowColor: '#16212A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});
