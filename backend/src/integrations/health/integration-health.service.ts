import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectedAccountStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProviderRegistry } from '../providers/provider.registry';
import { AccessTokenService } from '../tokens/access-token.service';

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

      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          lastHealthCheckAt: new Date(),
          lastHealthOk: result.ok,
          lastHealthMessage: result.message ?? null,
          status: result.ok
            ? ConnectedAccountStatus.active
            : ConnectedAccountStatus.needs_reauth,
        },
      });

      return {
        connectedAccountId: account.id,
        provider: account.provider,
        status: result.ok
          ? ConnectedAccountStatus.active
          : ConnectedAccountStatus.needs_reauth,
        ok: result.ok,
        message: result.message,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Health check failed';
      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          lastHealthCheckAt: new Date(),
          lastHealthOk: false,
          lastHealthMessage: message,
          status: ConnectedAccountStatus.needs_reauth,
        },
      });

      return {
        connectedAccountId: account.id,
        provider: account.provider,
        status: ConnectedAccountStatus.needs_reauth,
        ok: false,
        message,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
