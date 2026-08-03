import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

function isQuotaOrReadonlyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /max requests limit exceeded|OOM command not allowed|READONLY/i.test(
    message,
  );
}

function createProbeClient(url: string): Redis {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 8_000,
    commandTimeout: 5_000,
    ...(url.startsWith('rediss://') ? { tls: {} } : {}),
  });
}

/**
 * Try REDIS_URL, then REDIS_URL1 / REDIS_URL2.
 * Probes with PING + a short-lived SET so Upstash quota failures are detected
 * (connection can succeed while writes are rejected).
 */
export async function resolveWorkingRedisUrl(
  urls: string[],
  logger = new Logger('RedisUrlResolve'),
): Promise<string> {
  const candidates = urls.map((u) => u.trim()).filter(Boolean);
  if (candidates.length === 0) {
    throw new Error('No Redis URLs configured (REDIS_URL / REDIS_URL1 / REDIS_URL2)');
  }

  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const url = candidates[i]!;
    const label = i === 0 ? 'REDIS_URL' : `REDIS_URL${i}`;
    const client = createProbeClient(url);
    try {
      await client.connect();
      await client.ping();
      const probeKey = `chief:redis-probe:${Date.now()}`;
      await client.set(probeKey, '1', 'EX', 5);
      await client.del(probeKey);
      logger.log(`Using ${label} (candidate ${i + 1}/${candidates.length})`);
      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hint = isQuotaOrReadonlyError(error) ? ' (quota/readonly)' : '';
      errors.push(`${label}: ${message.split('\n')[0]}${hint}`);
      logger.warn(
        `${label} unavailable — trying next fallback (${message.split('\n')[0]})`,
      );
    } finally {
      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    }
  }

  throw new Error(
    `All Redis URLs failed (${candidates.length}): ${errors.join(' | ')}`,
  );
}

/** Deduped ordered list: primary then numbered fallbacks. */
export function collectRedisUrls(
  primary: string,
  ...fallbacks: Array<string | undefined>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [primary, ...fallbacks]) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}
