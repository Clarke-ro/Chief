import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConnectedAccountStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ProviderRegistry } from '../providers/provider.registry';
import { TokenVaultService } from './token-vault.service';

const EXPIRY_SKEW_MS = 60_000;
const REFRESH_LOCK_TTL_SEC = 20;

/**
 * Resolves a valid access token for a connected account, refreshing when needed.
 * Exported for Sync / Actions phases.
 */
@Injectable()
export class AccessTokenService {
  private readonly logger = new Logger(AccessTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly vault: TokenVaultService,
    private readonly redis: RedisService,
  ) {}

  async getValidAccessToken(connectedAccountId: string): Promise<string> {
    const account = await this.prisma.connectedAccount.findUnique({
      where: { id: connectedAccountId },
    });
    if (!account || account.status === ConnectedAccountStatus.revoked) {
      throw new NotFoundException('Connected account not found');
    }

    const bundle = this.vault.open(account.encryptedTokens);
    const adapter = this.registry.get(account.provider);
    const expiresSoon =
      account.tokenExpiresAt != null &&
      account.tokenExpiresAt.getTime() <= Date.now() + EXPIRY_SKEW_MS;

    if (!expiresSoon) {
      return bundle.accessToken;
    }

    if (!bundle.refreshToken || !adapter.definition.supportsRefresh) {
      await this.markNeedsReauth(account.id, 'Access token expired');
      throw new UnauthorizedException({
        message: 'Reauthentication required',
        code: 'NEEDS_REAUTH',
        connectedAccountId: account.id,
      });
    }

    const lockKey = `token:refresh:${account.id}`;
    const acquired = await this.redis.setNx(lockKey, '1', REFRESH_LOCK_TTL_SEC);
    if (!acquired) {
      // Another refresh is in flight — reload; if still expired, fail soft.
      const reloaded = await this.prisma.connectedAccount.findUnique({
        where: { id: account.id },
      });
      if (
        reloaded &&
        reloaded.tokenExpiresAt &&
        reloaded.tokenExpiresAt.getTime() > Date.now() + EXPIRY_SKEW_MS
      ) {
        return this.vault.open(reloaded.encryptedTokens).accessToken;
      }
      throw new UnauthorizedException({
        message: 'Token refresh in progress; retry shortly',
        code: 'REFRESH_IN_PROGRESS',
        connectedAccountId: account.id,
      });
    }

    try {
      const refreshed = await adapter.refreshAccessToken(bundle.refreshToken);
      const merged = this.vault.mergeRefresh(bundle, refreshed);
      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          encryptedTokens: this.vault.seal(merged),
          tokenExpiresAt: merged.expiresAt,
          status: ConnectedAccountStatus.active,
          lastHealthMessage: null,
        },
      });
      return merged.accessToken;
    } catch (error) {
      this.logger.warn(
        `Token refresh failed for ${account.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      await this.markNeedsReauth(
        account.id,
        error instanceof Error ? error.message : 'Refresh failed',
      );
      throw new UnauthorizedException({
        message: 'Reauthentication required',
        code: 'NEEDS_REAUTH',
        connectedAccountId: account.id,
      });
    } finally {
      await this.redis.del(lockKey).catch(() => 0);
    }
  }

  private async markNeedsReauth(id: string, message: string) {
    await this.prisma.connectedAccount.update({
      where: { id },
      data: {
        status: ConnectedAccountStatus.needs_reauth,
        lastHealthOk: false,
        lastHealthMessage: message,
        lastHealthCheckAt: new Date(),
      },
    });
  }
}
