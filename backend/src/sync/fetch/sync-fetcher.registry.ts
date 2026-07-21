import { Injectable } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import {
  GoogleCalendarFetcher,
  GoogleGmailFetcher,
  GoogleTasksFetcher,
} from '../providers/google';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../sync.types';
import { emptyBatch } from './sync-fetcher';

class StubResourceFetcher implements SyncResourceFetcher {
  constructor(
    readonly provider: IntegrationProvider,
    readonly resource: SyncResource,
  ) {}

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    return emptyBatch(ctx, {
      stub: true,
      items: [],
      cursorAfter: ctx.cursor,
      meta: {
        note: 'Fetcher stub — provider pull not implemented yet',
      },
    });
  }
}

@Injectable()
export class SyncFetcherRegistry {
  private readonly fetchers: SyncResourceFetcher[];

  constructor(
    googleGmail: GoogleGmailFetcher,
    googleCalendar: GoogleCalendarFetcher,
    googleTasks: GoogleTasksFetcher,
  ) {
    this.fetchers = [
      googleGmail,
      googleCalendar,
      googleTasks,
      new StubResourceFetcher(IntegrationProvider.microsoft, SyncResource.email),
      new StubResourceFetcher(IntegrationProvider.microsoft, SyncResource.calendar),
      new StubResourceFetcher(IntegrationProvider.slack, SyncResource.messages),
      new StubResourceFetcher(IntegrationProvider.github, SyncResource.tasks),
      new StubResourceFetcher(IntegrationProvider.notion, SyncResource.tasks),
    ];
  }

  get(
    provider: IntegrationProvider,
    resource: SyncResource,
  ): SyncResourceFetcher | undefined {
    return this.fetchers.find(
      (f) => f.provider === provider && f.resource === resource,
    );
  }
}
