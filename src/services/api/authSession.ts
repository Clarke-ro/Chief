import { secureStorage } from '@/services/secureStorage';

const ACCESS_TOKEN_KEY = 'chief.auth.accessToken';
const REFRESH_TOKEN_KEY = 'chief.auth.refreshToken';

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

/**
 * Auth tokens live only in SecureStore — never MMKV, never logs, never route params.
 */
export const authSession = {
  async getAccessToken(): Promise<string | null> {
    return secureStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await secureStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      await secureStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } else {
      await secureStorage.deleteItem(REFRESH_TOKEN_KEY);
    }
  },

  async clear(): Promise<void> {
    await secureStorage.deleteItem(ACCESS_TOKEN_KEY);
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY);
  },

  async isSignedIn(): Promise<boolean> {
    const token = await authSession.getAccessToken();
    return Boolean(token);
  },
};
