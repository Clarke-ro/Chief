import { Module } from '@nestjs/common';
import { BriefingModule } from '../briefing/briefing.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MembershipModule } from '../membership/membership.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { WorkspaceEngineService } from './workspace-engine.service';

@Module({
  imports: [KnowledgeModule, BriefingModule, WorkspaceModule, MembershipModule],
  providers: [WorkspaceEngineService],
  exports: [WorkspaceEngineService],
})
export class WorkspaceEngineModule {}
