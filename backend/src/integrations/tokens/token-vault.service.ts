import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../../common/encryption/encryption.service';
import type { OAuthTokenSet } from '../providers/provider.types';

export type StoredTokenBundle = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string[];
};

@Injectable()
export class TokenVaultService {
  constructor(private readonly encryption: EncryptionService) {}

  seal(tokens: OAuthTokenSet): string {
    const bundle: StoredTokenBundle = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      scope: tokens.scope,
    };
    return this.encryption.encryptJson(bundle);
  }

  open(encrypted: string): StoredTokenBundle {
    return this.encryption.decryptJson<StoredTokenBundle>(encrypted);
  }

  mergeRefresh(
    previous: StoredTokenBundle,
    refreshed: OAuthTokenSet,
  ): OAuthTokenSet {
    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? previous.refreshToken,
      tokenType: refreshed.tokenType ?? previous.tokenType,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope ?? previous.scope,
    };
  }
}
