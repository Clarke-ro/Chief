import { Injectable } from '@nestjs/common';
import { CHIEF_SYSTEM_PROMPT } from './chief-system.prompt';

@Injectable()
export class PromptService {
  /** Stable system instructions for Chief chat (cache-friendly prefix). */
  getChiefSystemPrompt(): string {
    return CHIEF_SYSTEM_PROMPT;
  }
}
