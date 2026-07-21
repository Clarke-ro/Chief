import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type PlatformId = 'gmail' | 'calendar' | 'slack' | 'github' | 'notion' | 'asana' | 'trello';

type PlatformLogoProps = {
  platform: PlatformId;
  size?: number;
};

const PLATFORM_COLORS: Record<PlatformId, string> = {
  gmail: '#EA4335',
  calendar: '#4285F4',
  slack: '#611F69',
  github: '#24292F',
  notion: '#111113',
  asana: '#F06A6A',
  trello: '#0079BF',
};

function Mark({ platform, size }: { platform: PlatformId; size: number }) {
  const stroke = '#FFFFFF';
  const s = size * 0.55;

  switch (platform) {
    case 'gmail':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M3 6.5V18a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 18V6.5L12 13 3 6.5z"
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M3 6.5L12 13l9-6.5" fill="none" stroke={stroke} strokeWidth={1.8} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect
            x={4}
            y={5}
            width={16}
            height={15}
            rx={2}
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Path d="M4 10h16M8 3v4M16 3v4" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'slack':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M8 14a2 2 0 11-2-2h2v2zm0-6V4a2 2 0 114 0v4H8zm6 6h4a2 2 0 110 4h-4v-4zm0-6a2 2 0 112 2v-2h-2zm-6 6H4a2 2 0 110-4h4v4zm6 0V20a2 2 0 11-4 0v-4h4z"
            fill={stroke}
          />
        </Svg>
      );
    case 'github':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0112 7.5c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .26.18.59.69.48A10.27 10.27 0 0022 12.26C22 6.58 17.52 2 12 2z"
            fill={stroke}
          />
        </Svg>
      );
    case 'notion':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M6 4.5h9.5L18 7v12.5H6.5L6 4.5z"
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M9 9h6M9 13h6M9 17h4" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'asana':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx={12} cy={7} r={3} fill={stroke} />
          <Circle cx={7} cy={16} r={3} fill={stroke} />
          <Circle cx={17} cy={16} r={3} fill={stroke} />
        </Svg>
      );
    case 'trello':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect
            x={4}
            y={4}
            width={16}
            height={16}
            rx={2.5}
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Rect x={7} y={7} width={4} height={9} rx={1} fill={stroke} />
          <Rect x={13} y={7} width={4} height={6} rx={1} fill={stroke} />
        </Svg>
      );
  }
}

export function PlatformLogo({ platform, size = 36 }: PlatformLogoProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: PLATFORM_COLORS[platform],
        },
      ]}
      accessibilityLabel={`${platform} logo`}
    >
      <Mark platform={platform} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const platformLabels: Record<PlatformId, string> = {
  gmail: 'Gmail',
  calendar: 'Google Calendar',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  // Google Tasks reuse this mark until a dedicated Tasks icon ships.
  asana: 'Tasks',
  trello: 'Trello',
};
