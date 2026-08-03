import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { z } from 'zod';
import { RedisService } from '../../common/redis/redis.service';

const oauthStateSchema = z.object({
  provider: z.nativeEnum(IntegrationProvider),
  workspaceId: z.string().min(8),
  userId: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
  returnTo: z.string().optional(),
  mode: z.enum(['connect', 'reconnect']),
  connectedAccountId: z.string().optional(),
  createdAt: z.string(),
});

export type OAuthStatePayload = z.infer<typeof oauthStateSchema>;

const TTL_SECONDS = 60 * 15;
const KEY_PREFIX = 'oauth:state:';

type MemoryEntry = {
  payload: string;
  expiresAt: number;
};

function isRedisQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /max requests limit exceeded|OOM command not allowed|READONLY/i.test(
    message,
  );
}

/**
 * OAuth PKCE state store. Prefers Redis; falls back to process memory when
 * Redis is quota-exhausted so Connect does not hard-fail on a single API replica.
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly redis: RedisService) {}

  async save(state: string, payload: OAuthStatePayload): Promise<void> {
    const key = `${KEY_PREFIX}${state}`;
    const value = JSON.stringify(payload);
    try {
      await this.redis.set(key, value, TTL_SECONDS);
      this.memory.delete(key);
    } catch (error) {
      if (!isRedisQuotaError(error)) throw error;
      this.logger.warn(
        'Redis unavailable for OAuth state — using in-process fallback',
      );
      this.memory.set(key, {
        payload: value,
        expiresAt: Date.now() + TTL_SECONDS * 1000,
      });
    }
  }

  /** Atomically read+delete so concurrent callbacks cannot replay state. */
  async consume(state: string): Promise<OAuthStatePayload | null> {
    const key = `${KEY_PREFIX}${state}`;
    try {
      const raw = await this.redis.getdel(key);
      if (raw) {
        this.memory.delete(key);
        return this.parse(raw);
      }
    } catch (error) {
      if (!isRedisQuotaError(error)) throw error;
      this.logger.warn(
        'Redis unavailable for OAuth state consume — checking memory fallback',
      );
    }

    const entry = this.memory.get(key);
    this.memory.delete(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) return null;
    return this.parse(entry.payload);
  }

  private parse(raw: string): OAuthStatePayload | null {
    try {
      return oauthStateSchema.parse(JSON.parse(raw));
    } catch (error) {
      this.logger.warn(
        `Corrupt OAuth state discarded: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return null;
    }
  }
}
