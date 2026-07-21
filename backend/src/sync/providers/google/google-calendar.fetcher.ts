import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { googleFetchJson } from './google-api.client';

type CalendarListResponse = {
  items?: Array<{
    id?: string;
    selected?: boolean;
    primary?: boolean;
    accessRole?: string;
    summary?: string;
  }>;
  nextPageToken?: string;
};

type EventsListResponse = {
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
    // Multi-calendar + Home reliability: always windowed. syncToken is per-calendar
    // and empty deltas looked like “no events” after the first primary-only pull.
    return this.fetchWindowed(ctx);
  }

  private async fetchWindowed(ctx: FetchContext): Promise<RawSyncBatch> {
    const calendars = await this.listSelectedCalendars(ctx.accessToken);
    const items: RawSyncBatch['items'] = [];
    let pages = 0;

    for (const calendar of calendars) {
      let pageToken: string | undefined;
      let calendarPages = 0;
      do {
        const params = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: ctx.window.from.toISOString(),
          timeMax: ctx.window.to.toISOString(),
          maxResults: '250',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const data = await googleFetchJson<EventsListResponse>(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
          { accessToken: ctx.accessToken },
        );

        for (const item of data.items ?? []) {
          if (typeof item.id !== 'string') continue;
          items.push({
            providerItemId: `${calendar.id}:${item.id}`,
            occurredAt: extractStart(item),
            payload: {
              ...item,
              // Persist uses this composite id so events across calendars don't collide.
              id: `${calendar.id}:${item.id}`,
              calendarId: calendar.id,
              calendarSummary: calendar.summary,
            },
          });
        }

        pageToken = data.nextPageToken;
        calendarPages += 1;
        pages += 1;
      } while (pageToken && calendarPages < 10);
    }

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        calendarCount: calendars.length,
        itemCount: items.length,
        mode: ctx.window.mode,
      },
      'Google calendar windowed fetch',
    );

    return emptyBatch(ctx, {
      items,
      // Checkpoint so pipeline hasPriorSync + hasCursor both stay true.
      cursorAfter: `calendar.windowed:${ctx.window.to.toISOString()}`,
      meta: {
        checkpointKind: 'calendar.windowed',
        itemCount: items.length,
        pages,
        calendarCount: calendars.length,
        mode: ctx.window.mode,
      },
    });
  }

  private async listSelectedCalendars(
    accessToken: string,
  ): Promise<Array<{ id: string; summary?: string }>> {
    const calendars: Array<{ id: string; summary?: string }> = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({ maxResults: '250' });
      if (pageToken) params.set('pageToken', pageToken);

      const data = await googleFetchJson<CalendarListResponse>(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
        { accessToken },
      );

      for (const item of data.items ?? []) {
        if (typeof item.id !== 'string' || !item.id) continue;
        // Include primary always; others when selected (Google default).
        if (item.primary || item.selected !== false) {
          calendars.push({ id: item.id, summary: item.summary });
        }
      }

      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 5);

    if (calendars.length === 0) {
      this.logger.warn('CalendarList empty; falling back to primary');
      return [{ id: 'primary' }];
    }

    return calendars;
  }
}

function extractStart(item: Record<string, unknown>): string | undefined {
  const start = item.start as { dateTime?: string; date?: string } | undefined;
  return start?.dateTime ?? start?.date;
}
