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

export type ChiefLlmStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; content: string; provider: ChiefLlmProvider; model: string };

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

  private async *streamWithOpenAi(input: {
    instructions: string;
    userPayload: string;
  }): AsyncGenerator<ChiefLlmStreamEvent> {
    const client = this.getOpenAiClient();
    const model = this.config.ai.model;
    const stream = await client.responses.create({
      model,
      instructions: input.instructions,
      input: input.userPayload,
      stream: true,
    });

    let content = '';
    for await (const event of stream) {
      if (event.type === 'response.output_text.delta' && event.delta) {
        content += event.delta;
        yield { type: 'delta', text: event.delta };
      }
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('OpenAI stream produced empty output');
    }
    yield { type: 'done', content: trimmed, provider: 'openai', model };
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

  /**
   * Stream deltas from OpenAI when possible; otherwise Gemini stream or one-shot.
   */
  async *streamChiefReply(input: {
    instructions: string;
    userPayload: string;
  }): AsyncGenerator<ChiefLlmStreamEvent> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (set OPENAI_API_KEY and/or GEMINI_API_KEY).',
      );
    }

    if (this.isOpenAiConfigured()) {
      try {
        yield* this.streamWithOpenAi(input);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
        this.logger.warn(`OpenAI stream failed — attempting Gemini: ${message}`);
        if (!this.gemini.isConfigured()) {
          throw new ServiceUnavailableException(
            'Chief could not stream from OpenAI and no Gemini fallback is configured.',
          );
        }
      }
    } else if (!this.gemini.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat is not configured (missing OPENAI_API_KEY and GEMINI_API_KEY).',
      );
    }

    try {
      yield* this.gemini.streamChiefReply(input);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini stream error';
      this.logger.warn(`Gemini stream failed — one-shot fallback: ${message}`);
      const content = await this.gemini.completeChiefReply(input);
      yield { type: 'delta', text: content };
      yield {
        type: 'done',
        content,
        provider: 'gemini',
        model: this.config.ai.geminiModel,
      };
    }
  }
}
