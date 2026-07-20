import { env } from '@/config/env';

/**
 * Pluggable AI provider id.
 * The UI talks to Chief; the backend (or local mock) selects the model stack.
 */
export type AiProviderId = 'mock' | 'openai' | 'anthropic' | 'custom';

const PROVIDERS = new Set<AiProviderId>(['mock', 'openai', 'anthropic', 'custom']);

function readProvider(): AiProviderId {
  const raw = env.aiProvider;
  if (raw && PROVIDERS.has(raw as AiProviderId)) return raw as AiProviderId;
  return env.isApiConfigured ? 'custom' : 'mock';
}

export const aiConfig = {
  get provider(): AiProviderId {
    return readProvider();
  },
  /** True when replies should hit a remote model gateway (not local mock). */
  get usesRemoteModel(): boolean {
    return this.provider !== 'mock';
  },
} as const;
