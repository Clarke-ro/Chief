import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AppConfigService } from '../common/config/app-config.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private client: GoogleGenAI | null = null;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.ai.geminiApiKey.trim());
  }

  private getClient(): GoogleGenAI {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chief chat fallback is not configured (missing GEMINI_API_KEY).',
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.config.ai.geminiApiKey });
    }
    return this.client;
  }

  /**
   * Gemini generateContent — stable systemInstruction; variable user payload as contents.
   */
  async completeChiefReply(input: {
    instructions: string;
    userPayload: string;
  }): Promise<string> {
    const client = this.getClient();
    const model = this.config.ai.geminiModel;

    try {
      const response = await client.models.generateContent({
        model,
        contents: input.userPayload,
        config: {
          systemInstruction: input.instructions,
        },
      });

      const text = response.text?.trim();
      if (text) return text;

      this.logger.warn('Gemini response missing text');
      throw new ServiceUnavailableException('Chief returned an empty reply.');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      this.logger.error(`Gemini request failed: ${message}`);
      throw new ServiceUnavailableException(
        'Chief could not reach the Gemini language model. Try again shortly.',
      );
    }
  }
}
