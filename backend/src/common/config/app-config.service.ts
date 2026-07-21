import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig, OAuthProviderCredentials } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get nodeEnv(): AppConfig['nodeEnv'] {
    return this.config.get('nodeEnv', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get port(): number {
    return this.config.get('port', { infer: true });
  }

  get appName(): string {
    return this.config.get('appName', { infer: true });
  }

  get apiPrefix(): string {
    return this.config.get('apiPrefix', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config.get('corsOrigins', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('databaseUrl', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('redisUrl', { infer: true });
  }

  get betterAuth() {
    return this.config.get('betterAuth', { infer: true });
  }

  get encryptionKey(): string {
    return this.config.get('encryptionKey', { infer: true });
  }

  get oauth(): AppConfig['oauth'] {
    return this.config.get('oauth', { infer: true });
  }

  getProviderCredentials(
    provider: 'google' | 'microsoft' | 'slack' | 'github' | 'notion',
  ): OAuthProviderCredentials & { tenantId?: string } {
    return this.oauth[provider];
  }

  get ai(): AppConfig['ai'] {
    return this.config.get('ai', { infer: true });
  }

  get logLevel(): AppConfig['logLevel'] {
    return this.config.get('logLevel', { infer: true });
  }

  get swaggerEnabled(): boolean {
    return this.config.get('swaggerEnabled', { infer: true });
  }
}
