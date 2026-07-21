import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { ProviderApiError, providerFetchJson } from '../provider-http';

type NotionSearchResponse = {
  results?: Array<Record<string, unknown>>;
  next_cursor?: string | null;
  has_more?: boolean;
};

const NOTION_VERSION = '2022-06-28';

/**
 * Pulls Notion pages the integration can access (search API).
 * Full database property sync is out of scope — pages become Task rows.
 */
@Injectable()
export class NotionPagesFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.notion;
  readonly resource = SyncResource.tasks;
  private readonly logger = new Logger(NotionPagesFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    try {
      return await this.searchPages(ctx);
    } catch (error) {
      if (error instanceof ProviderApiError && (error.status === 401 || error.status === 403)) {
        this.logger.warn(
          {
            connectedAccountId: ctx.connectedAccountId,
            status: error.status,
          },
          'Notion pages unavailable — reconnect Notion',
        );
        return emptyBatch(ctx, {
          items: [],
          cursorAfter: ctx.cursor,
          meta: {
            checkpointKind: 'notion.insufficient_scope',
            itemCount: 0,
            needsReconnect: true,
          },
        });
      }
      throw error;
    }
  }

  private async searchPages(ctx: FetchContext): Promise<RawSyncBatch> {
    const items: RawSyncBatch['items'] = [];
    let cursor: string | undefined;
    let pages = 0;
    const sinceMs = ctx.window.from.getTime();

    do {
      const body: Record<string, unknown> = {
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 50,
      };
      if (cursor) body.start_cursor = cursor;

      const data = await providerFetchJson<NotionSearchResponse>(
        'https://api.notion.com/v1/search',
        {
          accessToken: ctx.accessToken,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Notion-Version': NOTION_VERSION,
          },
          body: JSON.stringify(body),
        },
      );

      for (const page of data.results ?? []) {
        if (page.object !== 'page') continue;
        const id = typeof page.id === 'string' ? page.id : null;
        if (!id) continue;

        const edited =
          typeof page.last_edited_time === 'string'
            ? new Date(page.last_edited_time).getTime()
            : NaN;
        if (Number.isFinite(edited) && edited < sinceMs) {
          // Results are sorted by last_edited_time desc — stop early.
          cursor = undefined;
          break;
        }

        items.push({
          providerItemId: id,
          occurredAt:
            typeof page.last_edited_time === 'string'
              ? page.last_edited_time
              : undefined,
          payload: page,
        });
      }

      cursor =
        data.has_more && typeof data.next_cursor === 'string'
          ? data.next_cursor
          : undefined;
      pages += 1;
    } while (cursor && pages < 5);

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        itemCount: items.length,
        mode: ctx.window.mode,
        pages,
      },
      'Notion pages fetch',
    );

    return emptyBatch(ctx, {
      items,
      cursorAfter: `notion:${ctx.window.mode}:${new Date().toISOString()}`,
      meta: {
        checkpointKind:
          ctx.window.mode === 'incremental'
            ? 'notion.incremental'
            : 'notion.initial',
        itemCount: items.length,
        pages,
        mode: ctx.window.mode,
      },
    });
  }
}
