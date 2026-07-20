import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppConfigService } from '../config/app-config.service';

/** AES-256-GCM helper for OAuth tokens and other secrets at rest. */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm' as const;

  constructor(private readonly config: AppConfigService) {}

  encrypt(plaintext: string): string {
    const key = this.keyBuffer();
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const key = this.keyBuffer();
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted payload format');
    }
    const decipher = createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }

  decryptJson<T>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }

  /**
   * Derive a 32-byte AES key from ENCRYPTION_KEY without changing the
   * historical UTF-8 prefix behavior (keeps existing sealed tokens valid).
   */
  private keyBuffer(): Buffer {
    const raw = Buffer.from(this.config.encryptionKey, 'utf8');
    if (raw.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 UTF-8 bytes');
    }
    return raw.subarray(0, 32);
  }
}
