import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { AppConfigService } from '../common/config/app-config.service';
import { GeminiService } from './gemini.service';

export type ChiefLlmProvider = 'openai' | 'gemini';

export type ChiefLlmResult = {
  content: string;
  provider: ChiefLlmProvider;
  model: string;
};

/**
 * Primary OpenAI path with Gemini fallback when OpenAI is unset or fails.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly gemini: GeminiService,
  ) {}

  isConfigured(): boolean {
    return this.isOpenAiConfigured() || this.gemini.isConfigured();
  }

  isOpenAiConfigured(): boolean {
    return (
      this.config.ai.provider !== 'mock' &&
      Boolean(this.config.ai.apiKey.trim())
    );
  }

  private getOpenAiClient(): OpenAI {
    if (!this.isOpenAiConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (missing OPENAI_API_KEY).',
      );
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.config.ai.apiKey });
    }
    return this.client;
  }

  private async completeWithOpenAi(input: {
    instructions: string;
    userPayload: string;
  }): Promise<ChiefLlmResult> {
    const client = this.getOpenAiClient();
    const model = this.config.ai.model;

    const response = await client.responses.create({
      model,
      instructions: input.instructions,
      input: input.userPayload,
    });

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error('OpenAI response missing output_text');
    }

    return { content: text, provider: 'openai', model };
  }

  /**
   * Try OpenAI first when configured; on failure (or if unset), use Gemini.
   */
  async completeChiefReply(input: {
    instructions: string;
    userPayload: string;
  }): Promise<ChiefLlmResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (set OPENAI_API_KEY and/or GEMINI_API_KEY).',
      );
    }

    if (this.isOpenAiConfigured()) {
      try {
        return await this.completeWithOpenAi(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
        this.logger.warn(`OpenAI failed — attempting Gemini fallback: ${message}`);
        if (!this.gemini.isConfigured()) {
          throw new ServiceUnavailableException(
            'Chief could not reach OpenAI and no Gemini fallback is configured.',
          );
        }
      }
    } else if (!this.gemini.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (missing OPENAI_API_KEY and GEMINI_API_KEY).',
      );
    } else {
      this.logger.log('OpenAI unset — using Gemini for Chief chat');
    }

    const content = await this.gemini.completeChiefReply(input);
    return {
      content,
      provider: 'gemini',
      model: this.config.ai.geminiModel,
    };
  }
}
