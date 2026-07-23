import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PlannerModule } from '../planner/planner.module';
import { PromptModule } from '../prompt/prompt.module';
import { WorkspaceEngineModule } from '../workspace-engine/workspace-engine.module';
import { ReasoningService } from './reasoning.service';

@Module({
  imports: [WorkspaceEngineModule, PlannerModule, PromptModule, AiModule],
  providers: [ReasoningService],
  exports: [ReasoningService],
})
export class ReasoningModule {}
