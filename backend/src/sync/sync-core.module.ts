import { Module } from '@nestjs/common';
import { BullMqRootModule } from '../common/bullmq/bullmq.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SyncFetcherRegistry } from './fetch/sync-fetcher.registry';
import { SyncOrchestratorService } from './orchestrator/sync-orchestrator.service';
import { SyncPersistService } from './persist/sync-persist.service';
import { SyncPipelineService } from './pipeline/sync-pipeline.service';
import { SyncPolicyService } from './policies/sync-policy.service';
import {
  GoogleCalendarFetcher,
  GoogleGmailFetcher,
  GoogleTasksFetcher,
} from './providers/google';

/**
 * Sync core — fetchers, pipeline, orchestrator.
 * Imported by HTTP SyncModule (produce jobs) and WorkerModule (consume jobs).
 */
@Module({
  imports: [BullMqRootModule, IntegrationsModule],
  providers: [
    GoogleGmailFetcher,
    GoogleCalendarFetcher,
    GoogleTasksFetcher,
    SyncFetcherRegistry,
    SyncPolicyService,
    SyncPersistService,
    SyncPipelineService,
    SyncOrchestratorService,
  ],
  exports: [SyncOrchestratorService, SyncPipelineService],
})
export class SyncCoreModule {}
