import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, typography } from '@/constants/library-theme';

const coverPalettes = [
  { background: '#1E88A8', accent: '#FFE36E', text: '#FFFFFF' },
  { background: '#E45646', accent: '#FFD9A3', text: '#FFFFFF' },
  { background: '#6C5CE7', accent: '#B8F2E6', text: '#FFFFFF' },
  { background: '#F4B942', accent: '#17324D', text: '#111827' },
  { background: '#2E7D5B', accent: '#F9E79F', text: '#FFFFFF' },
  { background: '#F06C9B', accent: '#FDECEF', text: '#FFFFFF' },
  { background: '#243B53', accent: '#8EE3EF', text: '#FFFFFF' },
  { background: '#F7F1D5', accent: '#C75146', text: '#1F2933' },
];

type BookCoverProps = {
  title: string;
  author: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
};

function getCoverIndex(value: string) {
  return value.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) % coverPalettes.length;
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export function BookCover({ title, author, category, size = 'md' }: BookCoverProps) {
  const colors = coverPalettes[getCoverIndex(`${title}${author}`)];

  return (
    <View
      style={[
        styles.cover,
        styles[size],
        {
          backgroundColor: colors.background,
          borderColor: colors.accent,
        },
      ]}>
      <View style={[styles.topRule, { backgroundColor: colors.accent }]} />
      <Text style={[styles.initials, { color: colors.accent }]} numberOfLines={1}>
        {getInitials(title)}
      </Text>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={4}>
        {title}
      </Text>
      <View style={styles.bottomCopy}>
        {category ? (
          <Text style={[styles.category, { color: colors.accent }]} numberOfLines={1}>
            {category}
          </Text>
        ) : null}
        <Text style={[styles.author, { color: colors.text }]} numberOfLines={2}>
          {author}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: palette.text,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  sm: {
    width: 72,
    height: 108,
  },
  md: {
    width: 96,
    height: 144,
  },
  lg: {
    width: 118,
    height: 176,
  },
  topRule: {
    height: 5,
    width: '44%',
    borderRadius: radii.pill,
  },
  initials: {
    fontFamily: typography.heading,
    fontSize: 22,
    lineHeight: 26,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 15,
    lineHeight: 17,
  },
  bottomCopy: {
    gap: 2,
  },
  category: {
    fontFamily: typography.body,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  author: {
    fontFamily: typography.body,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    opacity: 0.9,
  },
});
