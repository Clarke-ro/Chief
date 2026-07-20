import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { GoogleApiError, googleFetchJson } from './google-api.client';

type CalendarListResponse = {
  items?: Array<Record<string, unknown>>;
  nextPageToken?: string;
  nextSyncToken?: string;
};

@Injectable()
export class GoogleCalendarFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.google;
  readonly resource = SyncResource.calendar;
  private readonly logger = new Logger(GoogleCalendarFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    if (ctx.cursor && ctx.window.mode === 'incremental') {
      try {
        return await this.fetchWithSyncToken(ctx, ctx.cursor);
      } catch (error) {
        if (error instanceof GoogleApiError && error.status === 410) {
          this.logger.warn(
            { connectedAccountId: ctx.connectedAccountId },
            'Calendar syncToken expired; falling back to windowed sync',
          );
          return this.fetchWindowed(ctx);
        }
        throw error;
      }
    }
    return this.fetchWindowed(ctx);
  }

  private async fetchWindowed(ctx: FetchContext): Promise<RawSyncBatch> {
    const items = [];
    let pageToken: string | undefined;
    let syncToken: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: ctx.window.from.toISOString(),
        timeMax: ctx.window.to.toISOString(),
        maxResults: '250',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const data = await googleFetchJson<CalendarListResponse>(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { accessToken: ctx.accessToken },
      );

      for (const item of data.items ?? []) {
        if (typeof item.id !== 'string') continue;
        items.push({
          providerItemId: item.id,
          occurredAt: extractStart(item),
          payload: item,
        });
      }

      pageToken = data.nextPageToken;
      if (data.nextSyncToken) syncToken = data.nextSyncToken;
      pages += 1;
    } while (pageToken && pages < 20);

    return emptyBatch(ctx, {
      items,
      cursorAfter: syncToken ?? ctx.cursor,
      meta: {
        checkpointKind: 'calendar.syncToken',
        itemCount: items.length,
        pages,
        mode: ctx.window.mode,
      },
    });
  }

  private async fetchWithSyncToken(
    ctx: FetchContext,
    syncToken: string,
  ): Promise<RawSyncBatch> {
    const items = [];
    let pageToken: string | undefined;
    let nextSyncToken = syncToken;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        syncToken,
        maxResults: '250',
      });
      if (pageToken) {
        params.delete('syncToken');
        params.set('pageToken', pageToken);
      }

      const data = await googleFetchJson<CalendarListResponse>(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { accessToken: ctx.accessToken },
      );

      for (const item of data.items ?? []) {
        if (typeof item.id !== 'string') continue;
        items.push({
          providerItemId: item.id,
          occurredAt: extractStart(item),
          payload: item,
        });
      }

      pageToken = data.nextPageToken;
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
      pages += 1;
    } while (pageToken && pages < 20);

    return emptyBatch(ctx, {
      items,
      cursorAfter: nextSyncToken ?? syncToken,
      meta: {
        checkpointKind: 'calendar.syncToken',
        itemCount: items.length,
        pages,
        mode: 'incremental',
      },
    });
  }
}

function extractStart(item: Record<string, unknown>): string | undefined {
  const start = item.start as { dateTime?: string; date?: string } | undefined;
  return start?.dateTime ?? start?.date;
}
