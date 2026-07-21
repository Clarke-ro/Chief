import Svg, { Path, Polygon } from 'react-native-svg';

/** Official-style multicolor Gmail mark (M + envelope flaps). */
export function GmailMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#4CAF50" d="M45 16.2l-5 2.75-5 4.75V40h10c1.657 0 3-1.343 3-3V16.2z" />
      <Path fill="#1E88E5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z" />
      <Polygon fill="#E53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <Path fill="#C62828" d="M3 12.65L13 19v4.7l-6.386-5.79L3 16.2v-3.55z" />
      <Path fill="#FBC02D" d="M45 12.65L35 19v4.7l7.386-5.79L45 16.2v-3.55z" />
      <Path
        fill="#E53935"
        d="M35 11.2l-4.5-3.35C29.55 7.05 28.3 6.5 27 6.5H21c-1.3 0-2.55.55-3.5 1.35L13 11.2l11 8.25L35 11.2z"
      />
    </Svg>
  );
}
