import { Platform, type TextStyle } from 'react-native';

/**
 * Plus Jakarta Sans — loaded via expo-font on native; CSS family on web.
 * Avoid Inter / system defaults for a clearer product voice on PWA + mobile.
 */
const webStack = Platform.select({
  web: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  default: undefined,
});

export const fontFamily = {
  regular: Platform.OS === 'web' ? (webStack as string) : 'PlusJakartaSans_400Regular',
  medium: Platform.OS === 'web' ? (webStack as string) : 'PlusJakartaSans_500Medium',
  semibold: Platform.OS === 'web' ? (webStack as string) : 'PlusJakartaSans_600SemiBold',
  bold: Platform.OS === 'web' ? (webStack as string) : 'PlusJakartaSans_700Bold',
  sans: Platform.OS === 'web' ? (webStack as string) : 'PlusJakartaSans_400Regular',
} as const;

export type TypographyVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

/** Slightly roomier scale for readability on web and mobile. */
export const typography: Record<
  TypographyVariant,
  Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'fontFamily'>
> = {
  display: {
    fontFamily: fontFamily.semibold,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '600',
    letterSpacing: -0.7,
  },
  title1: {
    fontFamily: fontFamily.semibold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  title2: {
    fontFamily: fontFamily.semibold,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  title3: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  callout: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.15,
  },
  subhead: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
};
