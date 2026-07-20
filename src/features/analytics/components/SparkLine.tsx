import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useThemeColors } from '@/hooks/useThemeColors';

type SparkLineProps = {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  showEndDot?: boolean;
};

/** Minimal Apple-style polyline for trends. */
export function SparkLine({
  points,
  width = 120,
  height = 40,
  color,
  showEndDot = true,
}: SparkLineProps) {
  const colors = useThemeColors();
  const stroke = color ?? colors.accent;

  if (points.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 4;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = padY + (1 - (p - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const end = coords[coords.length - 1];

  return (
    <Svg width={width} height={height} style={styles.svg}>
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot ? <Circle cx={end.x} cy={end.y} r={3.5} fill={stroke} /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    overflow: 'visible',
  },
});
