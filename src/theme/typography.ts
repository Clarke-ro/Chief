import { TextStyle } from 'react-native';

/** Inter font family names registered via @expo-google-fonts/inter */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  sans: 'Inter_400Regular',
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

export const typography: Record<
  TypographyVariant,
  Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'fontFamily'>
> = {
  display: {
    fontFamily: fontFamily.semibold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  title1: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  title2: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  title3: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  callout: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  subhead: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
};
