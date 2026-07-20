export type ThemeColors = {
  bg: string;
  bgElevated: string;
  bgSubtle: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  accent: string;
  accentMuted: string;
  success: string;
  warning: string;
  danger: string;
  priority: {
    high: string;
    medium: string;
    low: string;
  };
  confidence: {
    high: string;
    medium: string;
    low: string;
  };
};

export const lightColors: ThemeColors = {
  bg: '#F7F7F8',
  bgElevated: '#FFFFFF',
  bgSubtle: '#EFEFF1',
  text: '#111113',
  textSecondary: '#63636E',
  textTertiary: '#8E8E98',
  border: 'rgba(60, 60, 67, 0.18)',
  borderSubtle: 'rgba(60, 60, 67, 0.08)',
  accent: '#5B6CFF',
  accentMuted: 'rgba(91, 108, 255, 0.12)',
  success: '#1F9D63',
  warning: '#C47B16',
  danger: '#D14343',
  priority: {
    high: '#D14343',
    medium: '#C47B16',
    low: '#63636E',
  },
  confidence: {
    high: '#1F9D63',
    medium: '#C47B16',
    low: '#8E8E98',
  },
};

export const darkColors: ThemeColors = {
  bg: '#0C0C0E',
  bgElevated: '#161618',
  bgSubtle: '#1E1E22',
  text: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  border: 'rgba(255, 255, 255, 0.14)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  accent: '#7B88FF',
  accentMuted: 'rgba(123, 136, 255, 0.18)',
  success: '#34C78A',
  warning: '#E0A04A',
  danger: '#F07171',
  priority: {
    high: '#F07171',
    medium: '#E0A04A',
    low: '#A1A1AA',
  },
  confidence: {
    high: '#34C78A',
    medium: '#E0A04A',
    low: '#71717A',
  },
};
