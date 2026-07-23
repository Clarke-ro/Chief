import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MembershipModule } from '../membership/membership.module';
import { PlannerModule } from '../planner/planner.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';

@Module({
  imports: [WorkspaceModule, MembershipModule, KnowledgeModule, PlannerModule],
  controllers: [BriefingController],
  providers: [BriefingService],
  exports: [BriefingService],
})
export class BriefingModule {}
