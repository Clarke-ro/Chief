import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectedAccountStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProviderRegistry } from '../providers/provider.registry';
import { AccessTokenService } from '../tokens/access-token.service';

function looksLikeAuthFailure(message: string): boolean {
  return /invalid_grant|unauthorized|401|revoked|expired|reauth|invalid.?token/i.test(
    message,
  );
}

@Injectable()
export class IntegrationHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokens: AccessTokenService,
    private readonly registry: ProviderRegistry,
  ) {}

  async check(connectedAccountId: string, workspaceId: string) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: connectedAccountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }
    if (account.status === ConnectedAccountStatus.revoked) {
      return {
        connectedAccountId: account.id,
        provider: account.provider,
        status: account.status,
        ok: false,
        message: 'Account revoked',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const accessToken =
        await this.accessTokens.getValidAccessToken(connectedAccountId);
      const adapter = this.registry.get(account.provider);
      const result = await adapter.checkHealth(accessToken);

      const nextStatus = result.ok
        ? ConnectedAccountStatus.active
        : looksLikeAuthFailure(result.message ?? '')
          ? ConnectedAccountStatus.needs_reauth
          : account.status === ConnectedAccountStatus.needs_reauth
            ? ConnectedAccountStatus.needs_reauth
            : ConnectedAccountStatus.active;

      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          lastHealthCheckAt: new Date(),
          lastHealthOk: result.ok,
          lastHealthMessage: result.message ?? null,
          status: nextStatus,
        },
      });

      return {
        connectedAccountId: account.id,
        provider: account.provider,
        status: nextStatus,
        ok: result.ok,
        message: result.message,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Health check failed';
      const authFailure = looksLikeAuthFailure(message);
      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          lastHealthCheckAt: new Date(),
          lastHealthOk: false,
          lastHealthMessage: message,
          ...(authFailure
            ? { status: ConnectedAccountStatus.needs_reauth }
            : {}),
        },
      });

      return {
        connectedAccountId: account.id,
        provider: account.provider,
        status: authFailure
          ? ConnectedAccountStatus.needs_reauth
          : account.status,
        ok: false,
        message,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
