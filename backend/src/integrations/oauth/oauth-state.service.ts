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

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);

  constructor(private readonly redis: RedisService) {}

  async save(state: string, payload: OAuthStatePayload): Promise<void> {
    await this.redis.set(
      `${KEY_PREFIX}${state}`,
      JSON.stringify(payload),
      TTL_SECONDS,
    );
  }

  /** Atomically read+delete so concurrent callbacks cannot replay state. */
  async consume(state: string): Promise<OAuthStatePayload | null> {
    const key = `${KEY_PREFIX}${state}`;
    const raw = await this.redis.getdel(key);
    if (!raw) {
      return null;
    }
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
