import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ContextModule } from '../context/context.module';
import { PromptModule } from '../prompt/prompt.module';
import { ReasoningService } from './reasoning.service';

@Module({
  imports: [ContextModule, PromptModule, AiModule],
  providers: [ReasoningService],
  exports: [ReasoningService],
})
export class ReasoningModule {}
