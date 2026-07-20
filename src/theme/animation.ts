import { Easing } from 'react-native-reanimated';

export const duration = {
  instant: 100,
  fast: 180,
  normal: 280,
  slow: 420,
} as const;

export const easing = {
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

export const spring = {
  snappy: { damping: 22, stiffness: 320, mass: 0.8 },
  gentle: { damping: 20, stiffness: 180, mass: 1 },
  soft: { damping: 24, stiffness: 120, mass: 1.1 },
} as const;
