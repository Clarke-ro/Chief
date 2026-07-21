import { Image, StyleSheet, View, type ColorValue } from 'react-native';

const CHIEF_ICON = require('../../../../assets/brand/chief-icon.png');

type ChiefLogoProps = {
  size?: number;
  /** Optional monochrome tint (e.g. tab bar active/inactive). */
  tintColor?: ColorValue;
};

/** Official Chief mark for in-app chrome (onboarding, nav, AI avatar). */
export function ChiefLogo({ size = 28, tintColor }: ChiefLogoProps) {
  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image
        source={CHIEF_ICON}
        style={[styles.image, { width: size, height: size }, tintColor ? { tintColor } : null]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
