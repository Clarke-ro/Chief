import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { OpenAiService } from './openai.service';

@Module({
  providers: [GeminiService, OpenAiService],
  exports: [GeminiService, OpenAiService],
})
export class AiModule {}
