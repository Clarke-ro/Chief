import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { GoogleApiError, googleFetchJson } from './google-api.client';

type TaskListResponse = {
  items?: Array<{ id?: string; title?: string }>;
  nextPageToken?: string;
};

type TasksResponse = {
  items?: Array<Record<string, unknown>>;
  nextPageToken?: string;
};

@Injectable()
export class GoogleTasksFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.google;
  readonly resource = SyncResource.tasks;
  private readonly logger = new Logger(GoogleTasksFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    try {
      return await this.fetchAllIncomplete(ctx);
    } catch (error) {
      if (error instanceof GoogleApiError && (error.status === 403 || error.status === 401)) {
        this.logger.warn(
          {
            connectedAccountId: ctx.connectedAccountId,
            status: error.status,
            body: error.bodySnippet,
          },
          'Google Tasks unavailable — reconnect Google to grant Tasks scope',
        );
        return emptyBatch(ctx, {
          items: [],
          cursorAfter: ctx.cursor,
          meta: {
            checkpointKind: 'tasks.insufficient_scope',
            itemCount: 0,
            needsReconnect: true,
          },
        });
      }
      throw error;
    }
  }

  private async fetchAllIncomplete(ctx: FetchContext): Promise<RawSyncBatch> {
    const lists = await this.listTaskLists(ctx.accessToken);
    const items: RawSyncBatch['items'] = [];
    let pages = 0;

    for (const list of lists) {
      let pageToken: string | undefined;
      let listPages = 0;
      do {
        const params = new URLSearchParams({
          showCompleted: 'false',
          showDeleted: 'false',
          maxResults: '100',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const data = await googleFetchJson<TasksResponse>(
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?${params}`,
          { accessToken: ctx.accessToken },
        );

        for (const task of data.items ?? []) {
          if (typeof task.id !== 'string') continue;
          // Skip empty placeholder rows Google sometimes returns.
          if (typeof task.title === 'string' && task.title.trim() === '') continue;

          items.push({
            providerItemId: `${list.id}:${task.id}`,
            occurredAt:
              typeof task.due === 'string'
                ? task.due
                : typeof task.updated === 'string'
                  ? task.updated
                  : undefined,
            payload: {
              ...task,
              taskListId: list.id,
              taskListTitle: list.title,
            },
          });
        }

        pageToken = data.nextPageToken;
        listPages += 1;
        pages += 1;
      } while (pageToken && listPages < 10);
    }

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        listCount: lists.length,
        itemCount: items.length,
        mode: ctx.window.mode,
      },
      'Google Tasks fetch',
    );

    return emptyBatch(ctx, {
      items,
      cursorAfter: null,
      meta: {
        checkpointKind: 'tasks.windowed',
        itemCount: items.length,
        listCount: lists.length,
        pages,
        mode: ctx.window.mode,
      },
    });
  }

  private async listTaskLists(
    accessToken: string,
  ): Promise<Array<{ id: string; title: string }>> {
    const lists: Array<{ id: string; title: string }> = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({ maxResults: '100' });
      if (pageToken) params.set('pageToken', pageToken);

      const data = await googleFetchJson<TaskListResponse>(
        `https://tasks.googleapis.com/tasks/v1/users/@me/lists?${params}`,
        { accessToken },
      );

      for (const item of data.items ?? []) {
        if (typeof item.id !== 'string' || !item.id) continue;
        lists.push({
          id: item.id,
          title: typeof item.title === 'string' ? item.title : 'Tasks',
        });
      }

      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 5);

    return lists;
  }
}
