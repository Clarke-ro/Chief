import { Module } from '@nestjs/common';
import { WorkspaceEngineModule } from '../workspace-engine/workspace-engine.module';
import { ContextEngineService } from './context-engine.service';

@Module({
  imports: [WorkspaceEngineModule],
  providers: [ContextEngineService],
  exports: [ContextEngineService],
})
export class ContextModule {}
