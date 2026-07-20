import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { SyncCoreModule } from './sync-core.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [SyncCoreModule, MembershipModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncCoreModule],
})
export class SyncModule {}
