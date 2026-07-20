import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { platformBrand } from '@/theme';

export type PlatformIconId =
  | 'gmail'
  | 'calendar'
  | 'drive'
  | 'docs'
  | 'slack'
  | 'github'
  | 'notion'
  | 'trello'
  | 'asana'
  | 'jira'
  | 'linear'
  | 'zoom'
  | 'teams';

type PlatformIconProps = {
  platform: PlatformIconId;
  size?: number;
};

export const platformIconLabels: Record<PlatformIconId, string> = {
  gmail: 'Gmail',
  calendar: 'Google Calendar',
  drive: 'Google Drive',
  docs: 'Google Docs',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  trello: 'Trello',
  asana: 'Asana',
  jira: 'Jira',
  linear: 'Linear',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
};

function Mark({
  platform,
  size,
  onBrand,
}: {
  platform: PlatformIconId;
  size: number;
  onBrand: string;
}) {
  const s = size * 0.55;

  switch (platform) {
    case 'gmail':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M3 6.5V18a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 18V6.5L12 13 3 6.5z"
            fill="none"
            stroke={onBrand}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M3 6.5L12 13l9-6.5" fill="none" stroke={onBrand} strokeWidth={1.8} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x={4} y={5} width={16} height={15} rx={2} fill="none" stroke={onBrand} strokeWidth={1.8} />
          <Path d="M4 10h16M8 3v4M16 3v4" stroke={onBrand} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'drive':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M8.5 4h7L19.5 12H12L8.5 4z" fill={onBrand} opacity={0.95} />
          <Path d="M4.5 14L8.5 4 12 12 8 20 4.5 14z" fill={onBrand} opacity={0.75} />
          <Path d="M12 12h7.5L16 20H8l4-8z" fill={onBrand} opacity={0.55} />
        </Svg>
      );
    case 'docs':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M7 3.5h7.5L19 8v12.5a1 1 0 01-1 1H7a1 1 0 01-1-1v-16a1 1 0 011-1z"
            fill="none"
            stroke={onBrand}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <Path d="M14.5 3.5V8H19M9 12h6M9 15h6M9 18h4" stroke={onBrand} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'slack':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M8 14a2 2 0 11-2-2h2v2zm0-6V4a2 2 0 114 0v4H8zm6 6h4a2 2 0 110 4h-4v-4zm0-6a2 2 0 112 2v-2h-2zm-6 6H4a2 2 0 110-4h4v4zm6 0V20a2 2 0 11-4 0v-4h4z"
            fill={onBrand}
          />
        </Svg>
      );
    case 'github':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0112 7.5c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .26.18.59.69.48A10.27 10.27 0 0022 12.26C22 6.58 17.52 2 12 2z"
            fill={onBrand}
          />
        </Svg>
      );
    case 'notion':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M6 4.5h9.5L18 7v12.5H6.5L6 4.5z"
            fill="none"
            stroke={onBrand}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M9 9h6M9 13h6M9 17h4" stroke={onBrand} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'trello':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x={4} y={4} width={16} height={16} rx={2.5} fill="none" stroke={onBrand} strokeWidth={1.8} />
          <Rect x={7} y={7} width={4} height={9} rx={1} fill={onBrand} />
          <Rect x={13} y={7} width={4} height={6} rx={1} fill={onBrand} />
        </Svg>
      );
    case 'asana':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx={12} cy={7} r={3} fill={onBrand} />
          <Circle cx={7} cy={16} r={3} fill={onBrand} />
          <Circle cx={17} cy={16} r={3} fill={onBrand} />
        </Svg>
      );
    case 'jira':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M12 3l7 7-7 7-7-7 7-7zm0 4.2L8.2 10 12 13.8 15.8 10 12 7.2z"
            fill={onBrand}
          />
        </Svg>
      );
    case 'linear':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M4.5 15.5L15.5 4.5A7.5 7.5 0 014.5 15.5zm4 4L19.5 8.5A7.5 7.5 0 018.5 19.5z"
            fill={onBrand}
          />
        </Svg>
      );
    case 'zoom':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M15.5 6h-11C3.67 6 3 6.67 3 7.5v9c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5zm4.5 3.25L17 11.5v-3l3-2.25v6.5z"
            fill={onBrand}
          />
        </Svg>
      );
    case 'teams':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M14 7a3 3 0 11-0.01 0H14zM8.5 9A2.5 2.5 0 108.51 9H8.5zM16 10h3a2 2 0 012 2v5a3 3 0 01-3 3h-1v-7a3 3 0 00-3-3h2zM5 11h6a2 2 0 012 2v6H7a3 3 0 01-3-3v-4a1 1 0 011-1z"
            fill={onBrand}
          />
        </Svg>
      );
    default:
      return null;
  }
}

function backgroundFor(platform: PlatformIconId, scheme: string | null | undefined): string {
  switch (platform) {
    case 'gmail':
      return platformBrand.gmail;
    case 'calendar':
      return platformBrand.calendar;
    case 'drive':
      return platformBrand.drive;
    case 'docs':
      return platformBrand.docs;
    case 'slack':
      return platformBrand.slack;
    case 'github':
      return scheme === 'dark' ? platformBrand.githubDark : platformBrand.github;
    case 'notion':
      return scheme === 'dark' ? platformBrand.notionDark : platformBrand.notion;
    case 'trello':
      return platformBrand.trello;
    case 'asana':
      return platformBrand.asana;
    case 'jira':
      return platformBrand.jira;
    case 'linear':
      return platformBrand.linear;
    case 'zoom':
      return platformBrand.zoom;
    case 'teams':
      return platformBrand.teams;
  }
}

function markColor(platform: PlatformIconId, scheme: string | null | undefined): string {
  if (platform === 'github' && scheme === 'dark') return platformBrand.github;
  if (platform === 'notion' && scheme === 'dark') return platformBrand.notion;
  return platformBrand.onBrand;
}

/** Themed platform mark with SVG glyphs for every supported integration. */
export function PlatformIcon({ platform, size = 36 }: PlatformIconProps) {
  const scheme = useResolvedColorScheme();
  const bg = backgroundFor(platform, scheme);
  const onBrand = markColor(platform, scheme);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: bg,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={platformIconLabels[platform]}
    >
      <Mark platform={platform} size={size} onBrand={onBrand} />
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
