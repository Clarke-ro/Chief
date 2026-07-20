/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#F7F7F8',
          elevated: '#FFFFFF',
          subtle: '#EFEFF1',
          dark: '#0C0C0E',
          'dark-elevated': '#161618',
          'dark-subtle': '#1E1E22',
        },
        ink: {
          DEFAULT: '#111113',
          secondary: '#63636E',
          tertiary: '#8E8E98',
          dark: '#F5F5F7',
          'dark-secondary': '#A1A1AA',
          'dark-tertiary': '#71717A',
        },
        accent: {
          DEFAULT: '#5B6CFF',
          muted: 'rgba(91, 108, 255, 0.12)',
          dark: '#7B88FF',
          'dark-muted': 'rgba(123, 136, 255, 0.18)',
        },
        success: {
          DEFAULT: '#1F9D63',
          dark: '#34C78A',
        },
        warning: {
          DEFAULT: '#C47B16',
          dark: '#E0A04A',
        },
        danger: {
          DEFAULT: '#D14343',
          dark: '#F07171',
        },
        border: {
          DEFAULT: 'rgba(60, 60, 67, 0.18)',
          subtle: 'rgba(60, 60, 67, 0.08)',
          dark: 'rgba(255, 255, 255, 0.14)',
          'dark-subtle': 'rgba(255, 255, 255, 0.06)',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
