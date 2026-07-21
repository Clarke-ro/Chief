import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { AppConfigService } from '../common/config/app-config.service';

export type LlmChatTurn = {
  role: 'user' | 'chief';
  content: string;
};

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return (
      this.config.ai.provider === 'openai' && Boolean(this.config.ai.apiKey.trim())
    );
  }

  private getClient(): OpenAI {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (missing OPENAI_API_KEY).',
      );
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.config.ai.apiKey });
    }
    return this.client;
  }

  /**
   * Responses API — stable `instructions` first; variable payload as `input`.
   */
  async completeChiefReply(input: {
    instructions: string;
    userPayload: string;
  }): Promise<string> {
    const client = this.getClient();
    const model = this.config.ai.model;

    try {
      const response = await client.responses.create({
        model,
        instructions: input.instructions,
        input: input.userPayload,
      });

      const text = response.output_text?.trim();
      if (text) return text;

      this.logger.warn('OpenAI response missing output_text');
      throw new ServiceUnavailableException('Chief returned an empty reply.');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.logger.error(`OpenAI request failed: ${message}`);
      throw new ServiceUnavailableException(
        'Chief could not reach the language model. Try again shortly.',
      );
    }
  }
}
