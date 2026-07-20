import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { RedisService } from '../../common/redis/redis.service';

export type OAuthStatePayload = {
  provider: IntegrationProvider;
  workspaceId: string;
  userId: string;
  codeVerifier: string;
  redirectUri: string;
  mode: 'connect' | 'reconnect';
  connectedAccountId?: string;
  createdAt: string;
};

const TTL_SECONDS = 60 * 15;
const KEY_PREFIX = 'oauth:state:';

@Injectable()
export class OAuthStateService {
  constructor(private readonly redis: RedisService) {}

  async save(state: string, payload: OAuthStatePayload): Promise<void> {
    await this.redis.set(
      `${KEY_PREFIX}${state}`,
      JSON.stringify(payload),
      TTL_SECONDS,
    );
  }

  async consume(state: string): Promise<OAuthStatePayload | null> {
    const key = `${KEY_PREFIX}${state}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    await this.redis.del(key);
    return JSON.parse(raw) as OAuthStatePayload;
  }
}
