import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipModule } from '../membership/membership.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { IntegrationHealthService } from './health/integration-health.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OAuthService } from './oauth/oauth.service';
import { OAuthStateService } from './oauth/oauth-state.service';
import { GitHubAdapter } from './providers/github.adapter';
import { GoogleAdapter } from './providers/google.adapter';
import { MicrosoftAdapter } from './providers/microsoft.adapter';
import { NotionAdapter } from './providers/notion.adapter';
import { ProviderRegistry } from './providers/provider.registry';
import { SlackAdapter } from './providers/slack.adapter';
import { AccessTokenService } from './tokens/access-token.service';
import { TokenVaultService } from './tokens/token-vault.service';

@Module({
  imports: [WorkspaceModule, MembershipModule, AuditModule],
  controllers: [IntegrationsController],
  providers: [
    GoogleAdapter,
    MicrosoftAdapter,
    SlackAdapter,
    GitHubAdapter,
    NotionAdapter,
    ProviderRegistry,
    OAuthStateService,
    TokenVaultService,
    AccessTokenService,
    OAuthService,
    IntegrationHealthService,
    IntegrationsService,
  ],
  exports: [IntegrationsService, AccessTokenService, ProviderRegistry],
})
export class IntegrationsModule {}
