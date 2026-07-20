import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ConnectedAccountStatus,
  IntegrationProvider,
  type Prisma,
} from '@prisma/client';
import { AppConfigService } from '../../common/config/app-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { createOAuthState, createPkcePair } from '../providers/pkce';
import { ProviderRegistry } from '../providers/provider.registry';
import { TokenVaultService } from '../tokens/token-vault.service';
import { OAuthStateService } from './oauth-state.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly stateStore: OAuthStateService,
    private readonly vault: TokenVaultService,
    private readonly audit: AuditService,
  ) {}

  buildRedirectUri(provider: IntegrationProvider): string {
    const base = this.config.oauth.redirectBaseUrl.replace(/\/$/, '');
    return `${base}/v1/integrations/oauth/${provider}/callback`;
  }

  async startConnect(input: {
    provider: IntegrationProvider;
    workspaceId: string;
    userId: string;
    mode?: 'connect' | 'reconnect';
    connectedAccountId?: string;
  }): Promise<{ authorizeUrl: string; state: string }> {
    const adapter = this.registry.requireConfigured(input.provider);
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const redirectUri = this.buildRedirectUri(input.provider);

    await this.stateStore.save(state, {
      provider: input.provider,
      workspaceId: input.workspaceId,
      userId: input.userId,
      codeVerifier: verifier,
      redirectUri,
      mode: input.mode ?? 'connect',
      connectedAccountId: input.connectedAccountId,
      createdAt: new Date().toISOString(),
    });

    const authorizeUrl = adapter.getAuthorizationUrl({
      state,
      codeChallenge: challenge,
      redirectUri,
    });

    await this.audit.append({
      action: 'integration.connect.start',
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      resource: input.provider,
      meta: { mode: input.mode ?? 'connect' },
    });

    return { authorizeUrl, state };
  }

  async handleCallback(input: {
    provider: IntegrationProvider;
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  }): Promise<{ redirectUrl: string }> {
    if (input.error || !input.code || !input.state) {
      return {
        redirectUrl: this.errorRedirect(
          input.errorDescription ?? input.error ?? 'oauth_denied',
          input.provider,
        ),
      };
    }

    const pending = await this.stateStore.consume(input.state);
    if (!pending || pending.provider !== input.provider) {
      return {
        redirectUrl: this.errorRedirect('invalid_state', input.provider),
      };
    }

    try {
      const adapter = this.registry.requireConfigured(input.provider);
      const tokens = await adapter.exchangeCode({
        code: input.code,
        codeVerifier: pending.codeVerifier,
        redirectUri: pending.redirectUri,
      });
      const profile = await adapter.fetchAccountProfile(tokens.accessToken);
      const scopes =
        tokens.scope && tokens.scope.length > 0
          ? tokens.scope
          : adapter.definition.scopes;

      const encryptedTokens = this.vault.seal(tokens);
      const metadata = (profile.metadata ?? undefined) as
        | Prisma.InputJsonValue
        | undefined;

      const account = await this.prisma.connectedAccount.upsert({
        where: {
          workspaceId_provider_providerAccountId: {
            workspaceId: pending.workspaceId,
            provider: input.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
        create: {
          workspaceId: pending.workspaceId,
          userId: pending.userId,
          provider: input.provider,
          providerAccountId: profile.providerAccountId,
          displayName: profile.displayName,
          email: profile.email,
          status: ConnectedAccountStatus.active,
          scopes,
          encryptedTokens,
          tokenExpiresAt: tokens.expiresAt,
          metadata,
          lastHealthCheckAt: new Date(),
          lastHealthOk: true,
        },
        update: {
          userId: pending.userId,
          displayName: profile.displayName,
          email: profile.email,
          status: ConnectedAccountStatus.active,
          scopes,
          encryptedTokens,
          tokenExpiresAt: tokens.expiresAt,
          metadata,
          revokedAt: null,
          lastHealthCheckAt: new Date(),
          lastHealthOk: true,
          lastHealthMessage: null,
        },
      });

      await this.audit.append({
        action: 'integration.connect.success',
        workspaceId: pending.workspaceId,
        actorUserId: pending.userId,
        resource: account.id,
        meta: { provider: input.provider },
      });

      return {
        redirectUrl: this.successRedirect(account.id, input.provider),
      };
    } catch (error) {
      this.logger.error(
        { err: error, provider: input.provider },
        'OAuth callback failed',
      );
      await this.audit.append({
        action: 'integration.connect.failure',
        workspaceId: pending.workspaceId,
        actorUserId: pending.userId,
        resource: input.provider,
        meta: {
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
      return {
        redirectUrl: this.errorRedirect(
          error instanceof Error ? error.message : 'oauth_failed',
          input.provider,
        ),
      };
    }
  }

  async disconnect(input: {
    connectedAccountId: string;
    workspaceId: string;
    userId: string;
  }): Promise<void> {
    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: input.connectedAccountId,
        workspaceId: input.workspaceId,
      },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    try {
      const adapter = this.registry.get(account.provider);
      if (adapter.definition.supportsRevoke) {
        const tokens = this.vault.open(account.encryptedTokens);
        await adapter.revoke(tokens.accessToken);
      }
    } catch (error) {
      this.logger.warn(
        `Provider revoke failed for ${account.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }

    await this.prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        status: ConnectedAccountStatus.revoked,
        revokedAt: new Date(),
        encryptedTokens: this.vault.seal({
          accessToken: 'revoked',
        }),
      },
    });

    await this.audit.append({
      action: 'integration.disconnect',
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      resource: account.id,
      meta: { provider: account.provider },
    });
  }

  async startReconnect(input: {
    connectedAccountId: string;
    workspaceId: string;
    userId: string;
  }) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: input.connectedAccountId,
        workspaceId: input.workspaceId,
      },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }
    if (account.status === ConnectedAccountStatus.revoked) {
      throw new BadRequestException('Account is revoked; connect again');
    }

    return this.startConnect({
      provider: account.provider,
      workspaceId: input.workspaceId,
      userId: input.userId,
      mode: 'reconnect',
      connectedAccountId: account.id,
    });
  }

  private successRedirect(
    connectedAccountId: string,
    provider: IntegrationProvider,
  ): string {
    const url = new URL(this.config.oauth.successUrl);
    url.searchParams.set('connectedAccountId', connectedAccountId);
    url.searchParams.set('provider', provider);
    return url.toString();
  }

  private errorRedirect(
    reason: string,
    provider: IntegrationProvider,
  ): string {
    const url = new URL(this.config.oauth.errorUrl);
    url.searchParams.set('reason', reason.slice(0, 200));
    url.searchParams.set('provider', provider);
    return url.toString();
  }
}
