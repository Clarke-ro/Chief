import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [WorkspaceModule, MembershipModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
