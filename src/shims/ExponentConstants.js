/**
 * Wrap ExponentConstants: use native when available, otherwise a JS fallback
 * so expo-linking / expo-router can resolve schemes without crashing.
 *
 * Important: do NOT set hostUri here. A fake hostUri makes createURL produce
 * paths like `127.0.0.1:8081/` which expo-router treats as unmatched routes.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

const FALLBACK_MANIFEST = {
  name: 'Chief',
  slug: 'chief',
  scheme: 'chief',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: true },
  android: {},
  extra: {},
};

const fallback = {
  appOwnership: null,
  // bare + scheme → createURL uses `chief://…` with no host path segment
  executionEnvironment: 'bare',
  experienceUrl: 'chief://',
  linkingUri: 'chief://',
  installationId: 'chief-fallback-installation',
  sessionId: 'chief-fallback-session',
  statusBarHeight: 0,
  deviceYearClass: null,
  deviceName: null,
  systemFonts: [],
  isDevice: true,
  platform: { ios: {} },
  get manifest() {
    return FALLBACK_MANIFEST;
  },
  get manifestString() {
    return JSON.stringify(FALLBACK_MANIFEST);
  },
};

const native = requireOptionalNativeModule('ExponentConstants');

export default native ?? fallback;
