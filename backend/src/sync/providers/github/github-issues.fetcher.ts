import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { ProviderApiError, providerFetchJson } from '../provider-http';

type GitHubSearchResponse = {
  items?: Array<Record<string, unknown>>;
  incomplete_results?: boolean;
};

/**
 * Pulls open issues + PRs assigned to (or authored by) the authenticated user.
 */
@Injectable()
export class GitHubIssuesFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.github;
  readonly resource = SyncResource.tasks;
  private readonly logger = new Logger(GitHubIssuesFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    try {
      return await this.fetchAssigned(ctx);
    } catch (error) {
      if (error instanceof ProviderApiError && (error.status === 401 || error.status === 403)) {
        this.logger.warn(
          {
            connectedAccountId: ctx.connectedAccountId,
            status: error.status,
            body: error.bodySnippet,
          },
          'GitHub issues unavailable — reconnect GitHub',
        );
        return emptyBatch(ctx, {
          items: [],
          cursorAfter: ctx.cursor,
          meta: {
            checkpointKind: 'github.insufficient_scope',
            itemCount: 0,
            needsReconnect: true,
          },
        });
      }
      throw error;
    }
  }

  private async fetchAssigned(ctx: FetchContext): Promise<RawSyncBatch> {
    const since = ctx.window.from.toISOString().slice(0, 10);
    const queries = [
      `is:open assignee:@me updated:>=${since}`,
      `is:open author:@me updated:>=${since}`,
    ];
    const seen = new Set<string>();
    const items: RawSyncBatch['items'] = [];

    for (const q of queries) {
      let page = 1;
      while (page <= 3) {
        const params = new URLSearchParams({
          q,
          sort: 'updated',
          order: 'desc',
          per_page: '50',
          page: String(page),
        });
        const data = await providerFetchJson<GitHubSearchResponse>(
          `https://api.github.com/search/issues?${params}`,
          {
            accessToken: ctx.accessToken,
            headers: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );

        const batch = data.items ?? [];
        for (const issue of batch) {
          const id =
            typeof issue.id === 'number'
              ? String(issue.id)
              : typeof issue.id === 'string'
                ? issue.id
                : null;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          items.push({
            providerItemId: id,
            occurredAt:
              typeof issue.updated_at === 'string'
                ? issue.updated_at
                : typeof issue.created_at === 'string'
                  ? issue.created_at
                  : undefined,
            payload: issue,
          });
        }

        if (batch.length < 50) break;
        page += 1;
      }
    }

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        itemCount: items.length,
        mode: ctx.window.mode,
      },
      'GitHub issues fetch',
    );

    return emptyBatch(ctx, {
      items,
      cursorAfter: `github:${ctx.window.mode}:${new Date().toISOString()}`,
      meta: {
        checkpointKind:
          ctx.window.mode === 'incremental'
            ? 'github.incremental'
            : 'github.initial',
        itemCount: items.length,
        mode: ctx.window.mode,
      },
    });
  }
}
