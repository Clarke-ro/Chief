import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectedAccountStatus, SyncResource } from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { SyncOrchestratorService } from './orchestrator/sync-orchestrator.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly orchestrator: SyncOrchestratorService,
  ) {}

  async getStatus(user: AuthUser, connectedAccountId: string, workspaceId: string) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    const states = await this.prisma.syncState.findMany({
      where: { connectedAccountId: account.id },
      orderBy: { resource: 'asc' },
    });
    return {
      connectedAccountId: account.id,
      provider: account.provider,
      states: states.map((s) => ({
        resource: s.resource,
        status: s.status,
        cursor: s.cursor,
        lastSyncedAt: s.lastSyncedAt,
        lastError: s.lastError,
        meta: s.meta,
      })),
    };
  }

  async triggerManual(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
    resource?: SyncResource,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    const result = await this.orchestrator.triggerManual({
      workspaceId: account.workspaceId,
      connectedAccountId: account.id,
      resource,
    });
    return { ok: true, ...result };
  }

  async triggerHistorical(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
    lookbackDays: number,
    resource?: SyncResource,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    await this.orchestrator.triggerHistorical({
      workspaceId: account.workspaceId,
      connectedAccountId: account.id,
      resource,
      lookbackDays,
    });
    return { ok: true, historical: true, lookbackDays };
  }

  async triggerRecovery(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    await this.orchestrator.triggerRecovery({
      workspaceId: account.workspaceId,
      connectedAccountId: account.id,
    });
    return { ok: true, recovery: true };
  }

  private async requireAccount(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    await this.membership.requireMembership(user.id, workspaceId);
    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: connectedAccountId,
        workspaceId,
        status: { not: ConnectedAccountStatus.revoked },
      },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }
    return account;
  }
}
