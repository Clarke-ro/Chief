import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { GitHubAdapter } from './github.adapter';
import { GoogleAdapter } from './google.adapter';
import { MicrosoftAdapter } from './microsoft.adapter';
import { NotionAdapter } from './notion.adapter';
import { ProviderAdapter } from './provider.adapter';
import type { ProviderDefinition } from './provider.types';
import { SlackAdapter } from './slack.adapter';

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly adapters = new Map<IntegrationProvider, ProviderAdapter>();

  constructor(
    private readonly google: GoogleAdapter,
    private readonly microsoft: MicrosoftAdapter,
    private readonly slack: SlackAdapter,
    private readonly github: GitHubAdapter,
    private readonly notion: NotionAdapter,
  ) {}

  onModuleInit(): void {
    for (const adapter of [
      this.google,
      this.microsoft,
      this.slack,
      this.github,
      this.notion,
    ]) {
      this.register(adapter);
    }
  }

  /** Call from tests or future dynamic registration. */
  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.definition.id, adapter);
  }

  get(provider: IntegrationProvider): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
    return adapter;
  }

  requireConfigured(provider: IntegrationProvider): ProviderAdapter {
    const adapter = this.get(provider);
    if (!adapter.isConfigured()) {
      throw new BadRequestException(
        `${adapter.definition.displayName} OAuth credentials are not configured`,
      );
    }
    return adapter;
  }

  listDefinitions(): Array<ProviderDefinition & { configured: boolean }> {
    return [...this.adapters.values()].map((adapter) => ({
      ...adapter.definition,
      configured: adapter.isConfigured(),
    }));
  }

  parseProvider(value: string): IntegrationProvider {
    if (
      !Object.values(IntegrationProvider).includes(
        value as IntegrationProvider,
      )
    ) {
      throw new BadRequestException(`Unknown provider: ${value}`);
    }
    return value as IntegrationProvider;
  }
}
