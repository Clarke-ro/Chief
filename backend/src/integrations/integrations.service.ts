import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectedAccountStatus, IntegrationProvider } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { IntegrationHealthService } from './health/integration-health.service';
import { OAuthService } from './oauth/oauth.service';
import { ProviderRegistry } from './providers/provider.registry';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly oauth: OAuthService,
    private readonly health: IntegrationHealthService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async listCatalogAndConnections(user: AuthUser, workspaceId?: string) {
    const wsId = await this.resolveWorkspaceId(user, workspaceId, {
      allowFallback: true,
    });
    await this.membership.requireMembership(user.id, wsId);

    const providers = this.registry.listDefinitions();
    const connections = await this.prisma.connectedAccount.findMany({
      where: {
        workspaceId: wsId,
        status: { not: ConnectedAccountStatus.revoked },
      },
      orderBy: { connectedAt: 'desc' },
    });

    return {
      workspaceId: wsId,
      providers: providers.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        capabilities: p.capabilities,
        scopes: p.scopes,
        configured: p.configured,
        supportsRefresh: p.supportsRefresh,
        supportsRevoke: p.supportsRevoke,
      })),
      connections: connections.map((c) => this.toConnectionDto(c)),
    };
  }

  listProviders() {
    return this.registry.listDefinitions().map((p) => ({
      id: p.id,
      displayName: p.displayName,
      description: p.description,
      capabilities: p.capabilities,
      scopes: p.scopes,
      configured: p.configured,
      supportsRefresh: p.supportsRefresh,
      supportsRevoke: p.supportsRevoke,
    }));
  }

  async connect(
    user: AuthUser,
    providerParam: string,
    workspaceId: string,
    returnTo?: string,
  ) {
    const wsId = await this.requireWorkspaceId(user, workspaceId);
    const provider = this.registry.parseProvider(providerParam);
    return this.oauth.startConnect({
      provider,
      workspaceId: wsId,
      userId: user.id,
      returnTo,
    });
  }

  async disconnect(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    const wsId = await this.requireWorkspaceId(user, workspaceId);
    await this.oauth.disconnect({
      connectedAccountId,
      workspaceId: wsId,
      userId: user.id,
    });
    return { ok: true };
  }

  async reconnect(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
    returnTo?: string,
  ) {
    const wsId = await this.requireWorkspaceId(user, workspaceId);
    return this.oauth.startReconnect({
      connectedAccountId,
      workspaceId: wsId,
      userId: user.id,
      returnTo,
    });
  }

  async getStatus(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    const wsId = await this.requireWorkspaceId(user, workspaceId);
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: connectedAccountId, workspaceId: wsId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }
    return this.toConnectionDto(account);
  }

  async checkHealth(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    const wsId = await this.requireWorkspaceId(user, workspaceId);
    return this.health.check(connectedAccountId, wsId);
  }

  handleOAuthCallback(
    providerParam: string,
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
  ) {
    const provider = this.registry.parseProvider(providerParam);
    return this.oauth.handleCallback({
      provider,
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
    });
  }

  private isValidWorkspaceId(value: string): boolean {
    const id = value.trim();
    if (!id || id === 'default') return false;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return true;
    }
    // Prisma cuid / cuid2
    return /^c[a-z0-9]{20,}$/i.test(id);
  }

  /** Explicit workspace for mutating integration ops — never silently remap. */
  private async requireWorkspaceId(user: AuthUser, workspaceId: string) {
    if (!this.isValidWorkspaceId(workspaceId)) {
      throw new BadRequestException('Invalid workspaceId');
    }
    await this.membership.requireMembership(user.id, workspaceId.trim());
    return workspaceId.trim();
  }

  private async resolveWorkspaceId(
    user: AuthUser,
    workspaceId: string | undefined,
    options: { allowFallback: boolean },
  ) {
    if (workspaceId && this.isValidWorkspaceId(workspaceId)) {
      return workspaceId.trim();
    }
    if (workspaceId && !options.allowFallback) {
      throw new BadRequestException('Invalid workspaceId');
    }
    const list = await this.workspaces.listForUser(user.id);
    if (list[0]) {
      return list[0].id;
    }
    const created = await this.workspaces.ensureDefaultWorkspace(user);
    return created.id;
  }

  private toConnectionDto(account: {
    id: string;
    workspaceId: string;
    provider: string;
    providerAccountId: string;
    displayName: string | null;
    email: string | null;
    status: ConnectedAccountStatus;
    scopes: string[];
    tokenExpiresAt: Date | null;
    lastHealthCheckAt: Date | null;
    lastHealthOk: boolean | null;
    lastHealthMessage: string | null;
    connectedAt: Date;
    updatedAt: Date;
  }) {
    const providerDef = this.registry.get(
      account.provider as IntegrationProvider,
    ).definition;

    return {
      id: account.id,
      workspaceId: account.workspaceId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      displayName: account.displayName,
      email: account.email,
      status: account.status,
      scopes: account.scopes,
      capabilities: providerDef.capabilities,
      tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
      needsReauth: account.status === ConnectedAccountStatus.needs_reauth,
      health: {
        lastCheckedAt: account.lastHealthCheckAt?.toISOString() ?? null,
        ok: account.lastHealthOk,
        message: account.lastHealthMessage,
      },
      connectedAt: account.connectedAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}
