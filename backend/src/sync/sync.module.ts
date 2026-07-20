import { Module } from '@nestjs/common';
import { BullMqRootModule } from '../common/bullmq/bullmq.module';

/**
 * Sync domain module — queue producers available to the API.
 * Provider pull / upsert logic lands in the next phase.
 */
@Module({
  imports: [BullMqRootModule],
  exports: [BullMqRootModule],
})
export class SyncModule {}
