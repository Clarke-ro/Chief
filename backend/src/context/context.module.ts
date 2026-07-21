import { Module } from '@nestjs/common';
import { BriefingModule } from '../briefing/briefing.module';
import { MembershipModule } from '../membership/membership.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ContextEngineService } from './context-engine.service';

@Module({
  imports: [BriefingModule, WorkspaceModule, MembershipModule],
  providers: [ContextEngineService],
  exports: [ContextEngineService],
})
export class ContextModule {}
