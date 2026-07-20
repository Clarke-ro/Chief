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
    const prefix = this.config.apiPrefix.replace(/^\/|\/$/g, '');
    return `${base}/${prefix}/integrations/oauth/${provider}/callback`;
  }

  async startConnect(input: {
    provider: IntegrationProvider;
    workspaceId: string;
    userId: string;
    mode?: 'connect' | 'reconnect';
    connectedAccountId?: string;
    /** App deep link Expo/native should open after provider OAuth. */
    returnTo?: string;
  }): Promise<{ authorizeUrl: string; state: string }> {
    const adapter = this.registry.requireConfigured(input.provider);
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const redirectUri = this.buildRedirectUri(input.provider);
    const returnTo = this.sanitizeReturnTo(input.returnTo);

    await this.stateStore.save(state, {
      provider: input.provider,
      workspaceId: input.workspaceId,
      userId: input.userId,
      codeVerifier: verifier,
      redirectUri,
      returnTo,
      mode: input.mode ?? 'connect',
      connectedAccountId: input.connectedAccountId,
      createdAt: new Date().toISOString(),
    });

    const authorizeUrl = adapter.getAuthorizationUrl({
      state,
      codeChallenge: challenge,
      redirectUri,
    });

    await this.safeAudit({
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
          'oauth_denied',
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

    const clientReturnTo = pending.returnTo;

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

      const account = await this.persistConnectedAccount({
        pending,
        provider: input.provider,
        profile: {
          providerAccountId: profile.providerAccountId,
          displayName: profile.displayName ?? null,
          email: profile.email ?? null,
        },
        scopes,
        encryptedTokens,
        tokenExpiresAt: tokens.expiresAt,
        metadata,
      });

      await this.safeAudit({
        action: 'integration.connect.success',
        workspaceId: pending.workspaceId,
        actorUserId: pending.userId,
        resource: account.id,
        meta: { provider: input.provider },
      });

      return {
        redirectUrl: this.successRedirect(
          account.id,
          input.provider,
          clientReturnTo,
        ),
      };
    } catch (error) {
      this.logger.error(
        { err: error, provider: input.provider },
        'OAuth callback failed',
      );
      await this.safeAudit({
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
          this.toPublicOAuthError(error),
          input.provider,
          clientReturnTo,
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

    await this.safeAudit({
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
    returnTo?: string;
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
      returnTo: input.returnTo,
    });
  }

  private async persistConnectedAccount(input: {
    pending: {
      workspaceId: string;
      userId: string;
      mode: 'connect' | 'reconnect';
      connectedAccountId?: string;
    };
    provider: IntegrationProvider;
    profile: {
      providerAccountId: string;
      displayName: string | null;
      email: string | null;
    };
    scopes: string[];
    encryptedTokens: string;
    tokenExpiresAt: Date | null | undefined;
    metadata: Prisma.InputJsonValue | undefined;
  }) {
    const sharedUpdate = {
      userId: input.pending.userId,
      displayName: input.profile.displayName,
      email: input.profile.email,
      status: ConnectedAccountStatus.active,
      scopes: input.scopes,
      encryptedTokens: input.encryptedTokens,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      metadata: input.metadata,
      revokedAt: null,
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
      lastHealthMessage: null,
    };

    if (
      input.pending.mode === 'reconnect' &&
      input.pending.connectedAccountId
    ) {
      const existing = await this.prisma.connectedAccount.findFirst({
        where: {
          id: input.pending.connectedAccountId,
          workspaceId: input.pending.workspaceId,
          provider: input.provider,
        },
      });
      if (!existing) {
        throw new BadRequestException('reconnect_target_missing');
      }
      if (existing.providerAccountId !== input.profile.providerAccountId) {
        throw new BadRequestException('provider_account_mismatch');
      }
      const updated = await this.prisma.connectedAccount.update({
        where: { id: existing.id },
        data: sharedUpdate,
      });
      await this.upsertOAuthToken({
        connectedAccountId: updated.id,
        encryptedPayload: input.encryptedTokens,
        accessTokenExpiresAt: input.tokenExpiresAt ?? null,
        scopeSnapshot: input.scopes,
      });
      return updated;
    }

    const account = await this.prisma.connectedAccount.upsert({
      where: {
        workspaceId_provider_providerAccountId: {
          workspaceId: input.pending.workspaceId,
          provider: input.provider,
          providerAccountId: input.profile.providerAccountId,
        },
      },
      create: {
        workspaceId: input.pending.workspaceId,
        provider: input.provider,
        providerAccountId: input.profile.providerAccountId,
        ...sharedUpdate,
      },
      update: sharedUpdate,
    });
    await this.upsertOAuthToken({
      connectedAccountId: account.id,
      encryptedPayload: input.encryptedTokens,
      accessTokenExpiresAt: input.tokenExpiresAt ?? null,
      scopeSnapshot: input.scopes,
    });
    return account;
  }

  private async upsertOAuthToken(input: {
    connectedAccountId: string;
    encryptedPayload: string;
    accessTokenExpiresAt: Date | null;
    scopeSnapshot: string[];
  }): Promise<void> {
    await this.prisma.oAuthToken.upsert({
      where: { connectedAccountId: input.connectedAccountId },
      create: {
        connectedAccountId: input.connectedAccountId,
        encryptedPayload: input.encryptedPayload,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        scopeSnapshot: input.scopeSnapshot,
      },
      update: {
        encryptedPayload: input.encryptedPayload,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        scopeSnapshot: input.scopeSnapshot,
      },
    });
  }

  private async safeAudit(input: {
    action: string;
    workspaceId: string;
    actorUserId: string;
    resource: string;
    meta?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.audit.append(input);
    } catch (error) {
      this.logger.warn(
        `Audit append failed for ${input.action}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private toPublicOAuthError(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response.slice(0, 64);
      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        typeof (response as { message: unknown }).message === 'string'
      ) {
        return (response as { message: string }).message.slice(0, 64);
      }
    }
    return 'oauth_failed';
  }

  /**
   * Only allow app callback deep links / web origins we control (blocks open redirects).
   * Accepts chief:// / exp:// / exps:// and http(s) origins listed in CORS_ORIGINS.
   */
  private sanitizeReturnTo(returnTo?: string): string | undefined {
    if (!returnTo || returnTo.length > 512) {
      return undefined;
    }
    try {
      const url = new URL(returnTo);
      const callbackPath = `${url.hostname}${url.pathname}`;

      if (
        url.protocol === 'chief:' ||
        url.protocol === 'exp:' ||
        url.protocol === 'exps:'
      ) {
        if (!callbackPath.includes('integrations/callback')) {
          return undefined;
        }
        return returnTo.split('#')[0];
      }

      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const allowedOrigins = this.config.corsOrigins.filter((origin) =>
          origin.startsWith('http://') || origin.startsWith('https://'),
        );
        if (!allowedOrigins.includes(url.origin)) {
          return undefined;
        }
        if (!url.pathname.includes('/integrations/callback')) {
          return undefined;
        }
        return returnTo.split('#')[0];
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  private successRedirect(
    connectedAccountId: string,
    provider: IntegrationProvider,
    returnTo?: string,
  ): string {
    const base = returnTo ?? this.config.oauth.successUrl;
    const url = new URL(base);
    url.searchParams.set('status', 'success');
    url.searchParams.set('connectedAccountId', connectedAccountId);
    url.searchParams.set('provider', provider);
    return url.toString();
  }

  private errorRedirect(
    reason: string,
    provider: IntegrationProvider,
    returnTo?: string,
  ): string {
    const base = returnTo ?? this.config.oauth.errorUrl;
    const url = new URL(base);
    url.searchParams.set('status', 'error');
    url.searchParams.set('reason', reason.slice(0, 64));
    url.searchParams.set('provider', provider);
    return url.toString();
  }
}
