import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { GoogleApiError, googleFetchJson } from './google-api.client';

@Injectable()
export class GoogleGmailFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.google;
  readonly resource = SyncResource.email;
  private readonly logger = new Logger(GoogleGmailFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    if (ctx.cursor && ctx.window.mode === 'incremental') {
      return this.fetchIncremental(ctx);
    }
    return this.fetchInitialWindow(ctx);
  }

  private async fetchInitialWindow(ctx: FetchContext): Promise<RawSyncBatch> {
    const afterUnix = Math.floor(ctx.window.from.getTime() / 1000);
    const query = `after:${afterUnix} -in:spam -in:trash`;
    const items = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        maxResults: '100',
        q: query,
      });
      if (pageToken) params.set('pageToken', pageToken);

      const list = await googleFetchJson<{
        messages?: Array<{ id: string }>;
        nextPageToken?: string;
      }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
        accessToken: ctx.accessToken,
      });

      for (const message of list.messages ?? []) {
        try {
          const raw = await this.fetchMessage(ctx.accessToken, message.id);
          items.push({ providerItemId: message.id, payload: raw });
        } catch (error) {
          this.logger.warn(
            {
              messageId: message.id,
              err: error instanceof Error ? error.message : String(error),
            },
            'Gmail message fetch failed (partial)',
          );
        }
      }

      pageToken = list.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 10);

    const profile = await googleFetchJson<{
      historyId?: string;
      emailAddress?: string;
    }>('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      accessToken: ctx.accessToken,
    });

    return emptyBatch(ctx, {
      items,
      cursorAfter: profile.historyId ?? ctx.cursor,
      meta: {
        checkpointKind: 'gmail.historyId',
        emailAddress: profile.emailAddress ?? null,
        itemCount: items.length,
        query,
        pages,
      },
    });
  }

  private async fetchIncremental(ctx: FetchContext): Promise<RawSyncBatch> {
    const historyId = ctx.cursor!;
    const messageIds = new Set<string>();
    let pageToken: string | undefined;
    let latestHistoryId = historyId;
    let pages = 0;

    try {
      do {
        const params = new URLSearchParams({
          startHistoryId: historyId,
          historyTypes: 'messageAdded',
          maxResults: '100',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const history = await googleFetchJson<{
          history?: Array<{
            messagesAdded?: Array<{ message?: { id?: string } }>;
          }>;
          historyId?: string;
          nextPageToken?: string;
        }>(`https://gmail.googleapis.com/gmail/v1/users/me/history?${params}`, {
          accessToken: ctx.accessToken,
        });

        for (const entry of history.history ?? []) {
          for (const added of entry.messagesAdded ?? []) {
            const id = added.message?.id;
            if (id) messageIds.add(id);
          }
        }
        if (history.historyId) latestHistoryId = history.historyId;
        pageToken = history.nextPageToken;
        pages += 1;
      } while (pageToken && pages < 20);
    } catch (error) {
      if (error instanceof GoogleApiError && error.status === 404) {
        this.logger.warn(
          { connectedAccountId: ctx.connectedAccountId },
          'Gmail historyId expired; falling back to windowed sync',
        );
        return this.fetchInitialWindow({ ...ctx, cursor: null });
      }
      throw error;
    }

    const items = [];
    for (const id of messageIds) {
      try {
        const raw = await this.fetchMessage(ctx.accessToken, id);
        const labelIds = Array.isArray(raw.labelIds) ? raw.labelIds : [];
        if (labelIds.includes('SPAM') || labelIds.includes('TRASH')) continue;
        items.push({ providerItemId: id, payload: raw });
      } catch (error) {
        this.logger.warn(
          {
            messageId: id,
            err: error instanceof Error ? error.message : String(error),
          },
          'Gmail incremental message fetch failed (partial)',
        );
      }
    }

    return emptyBatch(ctx, {
      items,
      cursorAfter: latestHistoryId,
      meta: {
        checkpointKind: 'gmail.historyId',
        itemCount: items.length,
        pages,
        mode: 'incremental',
      },
    });
  }

  private fetchMessage(accessToken: string, id: string) {
    return googleFetchJson<Record<string, unknown>>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { accessToken },
    );
  }
}
