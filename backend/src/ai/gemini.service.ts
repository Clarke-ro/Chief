import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AppConfigService } from '../common/config/app-config.service';

const GEMINI_MODEL_FALLBACKS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
] as const;

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

  private modelCandidates(): string[] {
    const preferred = this.config.ai.geminiModel.trim();
    const ordered = preferred
      ? [preferred, ...GEMINI_MODEL_FALLBACKS]
      : [...GEMINI_MODEL_FALLBACKS];
    return [...new Set(ordered.filter(Boolean))];
  }

  /**
   * Gemini generateContent — stable systemInstruction; variable user payload as contents.
   * Tries configured model, then current Flash aliases if the model id is retired.
   */
  async completeChiefReply(input: {
    instructions: string;
    userPayload: string;
  }): Promise<string> {
    const client = this.getClient();
    const models = this.modelCandidates();
    let lastError = 'Unknown Gemini error';

    for (const model of models) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: input.userPayload,
          config: {
            systemInstruction: input.instructions,
          },
        });

        const text = response.text?.trim();
        if (text) {
          if (model !== this.config.ai.geminiModel) {
            this.logger.warn(`Gemini used fallback model ${model}`);
          }
          return text;
        }

        lastError = `Gemini ${model} returned empty text`;
        this.logger.warn(lastError);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown Gemini error';
        this.logger.warn(`Gemini model ${model} failed: ${lastError}`);
      }
    }

    this.logger.error(`Gemini request failed after fallbacks: ${lastError}`);
    throw new ServiceUnavailableException(
      'Chief could not reach Gemini. Try again shortly.',
    );
  }
}
