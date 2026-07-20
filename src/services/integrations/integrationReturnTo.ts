import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const APP_CALLBACK_PATH = 'integrations/callback';

/**
 * Where the API should send the browser after provider OAuth.
 * Web must use the live HTTPS origin (Vercel); native keeps the app scheme.
 */
export function getIntegrationReturnTo(nextPath?: string): string {
  const next =
    typeof nextPath === 'string' &&
    nextPath.startsWith('/') &&
    !nextPath.startsWith('//')
      ? nextPath
      : undefined;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const url = new URL(`/${APP_CALLBACK_PATH}`, window.location.origin);
    if (next) url.searchParams.set('next', next);
    return url.toString();
  }

  try {
    const created = Linking.createURL(APP_CALLBACK_PATH, {
      queryParams: next ? { next } : undefined,
    });
    if (
      created.startsWith('chief:') ||
      created.startsWith('exp:') ||
      created.startsWith('exps:') ||
      created.startsWith('http:') ||
      created.startsWith('https:')
    ) {
      return created;
    }
  } catch {
    // Fall through to scheme default.
  }

  const fallback = `chief://${APP_CALLBACK_PATH}`;
  return next ? `${fallback}?next=${encodeURIComponent(next)}` : fallback;
}
