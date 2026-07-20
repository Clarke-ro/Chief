import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type ChiefLogoProps = {
  size?: number;
};

/** Spark mark for Chief — the only intentional gradient in the product chrome. */
export function ChiefLogo({ size = 28 }: ChiefLogoProps) {
  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient
            id="chiefSpark"
            x1="4"
            y1="2"
            x2="20"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#A8B0FF" />
            <Stop offset="55%" stopColor="#5B6CFF" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
        </Defs>
        <Path
          d="M12 2l1.2 6.3L19 8l-4.4 3.6L16.2 18 12 14.8 7.8 18l1.6-6.4L5 8l5.8.3L12 2z"
          fill="url(#chiefSpark)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
