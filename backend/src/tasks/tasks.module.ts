import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [WorkspaceModule, MembershipModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
