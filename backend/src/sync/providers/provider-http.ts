/** Shared provider HTTP with light retry — used by sync fetchers. */

export class ProviderApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    readonly bodySnippet?: string,
  ) {
    super(message);
    this.name = 'ProviderApiError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function providerFetchJson<T = Record<string, unknown>>(
  url: string,
  opts: {
    accessToken: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    maxAttempts?: number;
    /** Override Authorization header value (e.g. Slack uses bare token). */
    authScheme?: 'Bearer' | 'raw';
  },
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4;
  let lastError: unknown;
  const auth =
    opts.authScheme === 'raw'
      ? opts.accessToken
      : `Bearer ${opts.accessToken}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: {
          Authorization: auth,
          Accept: 'application/json',
          ...opts.headers,
        },
        body: opts.body,
      });

      if (response.ok) {
        if (response.status === 204) return {} as T;
        return (await response.json()) as T;
      }

      const body = await response.text();
      const snippet = body.slice(0, 400);

      if (response.status === 401) {
        throw new ProviderApiError(
          'Provider access token rejected (401)',
          401,
          false,
          snippet,
        );
      }

      if (response.status === 403 || response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '0');
        const delayMs =
          (retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1)) +
          Math.floor(Math.random() * 250);
        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        }
        throw new ProviderApiError(
          `Provider rate limited (${response.status})`,
          response.status,
          true,
          snippet,
        );
      }

      if (response.status >= 500 && attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }

      throw new ProviderApiError(
        `Provider API error (${response.status})`,
        response.status,
        response.status >= 500,
        snippet,
      );
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderApiError && !error.retryable) {
        throw error;
      }
      if (attempt >= maxAttempts) break;
      await sleep(400 * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Provider API request failed');
}
