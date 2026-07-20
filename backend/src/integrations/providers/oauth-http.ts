import {
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error_description' in body &&
      typeof (body as { error_description: unknown }).error_description ===
        'string'
        ? (body as { error_description: string }).error_description
        : typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
          ? (body as { error: string }).error
          : `HTTP ${response.status}`;

    if (response.status >= 500) {
      throw new InternalServerErrorException(
        `Provider request failed: ${message}`,
      );
    }
    throw new BadGatewayException(`Provider request failed: ${message}`);
  }

  return body as T;
}

export function parseExpiresIn(expiresIn?: number | string): Date | undefined {
  if (expiresIn === undefined || expiresIn === null || expiresIn === '') {
    return undefined;
  }
  const seconds =
    typeof expiresIn === 'string' ? Number.parseInt(expiresIn, 10) : expiresIn;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return new Date(Date.now() + seconds * 1000);
}

export function splitScopes(scope?: string | string[]): string[] {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope.filter(Boolean);
  return scope.split(/[\s,]+/).filter(Boolean);
}
