import { env } from '@/config/env';
import { authSession } from '@/services/api/authSession';
import { getAuthClient } from '@/services/auth/authClient';
import { getMobileAuthOrigin } from '@/services/auth/mobileOrigin';
import { Platform } from 'react-native';

export class ApiConfigError extends Error {
  constructor(message = 'API base URL is not configured.') {
    super(message);
    this.name = 'ApiConfigError';
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Network failure, abort, or unreadable JSON — distinct from HTTP ApiError. */
export class ApiNetworkError extends Error {
  constructor(message = 'Network request failed.') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

type ApiFetchOptions = RequestInit & {
  /** Skip attaching the bearer token (public endpoints). */
  skipAuth?: boolean;
};

/**
 * Authenticated fetch for the Chief backend.
 * - Base URL from `EXPO_PUBLIC_API_BASE_URL` only
 * - Bearer token from SecureStore
 * - Never logs tokens or response bodies containing credentials
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const base = env.apiBaseUrl;
  if (!base) {
    throw new ApiConfigError();
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!options.skipAuth) {
    const cookie = getAuthClient().getCookie();
    if (cookie) {
      headers.set('Cookie', cookie);
    } else {
      const token = await authSession.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (Platform.OS !== 'web') {
      headers.set('expo-origin', getMobileAuthOrigin());
    }
  }

  const { skipAuth: _skipAuth, ...init } = options;
  try {
    return await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiNetworkError(error instanceof Error ? error.message : 'Network request failed.');
  }
}

/** JSON helper — throws ApiError on non-2xx, ApiNetworkError on transport/parse failure. */
export async function apiJson<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    // Do not echo response body — may contain server details
    throw new ApiError(response.status, `Request failed (${response.status}).`);
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiNetworkError('Response was not valid JSON.');
  }
}
