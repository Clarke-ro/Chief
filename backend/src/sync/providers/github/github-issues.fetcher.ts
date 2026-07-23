import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { ProviderApiError, providerFetchJson } from '../provider-http';

type GitHubSearchResponse = {
  items?: Array<Record<string, unknown>>;
  incomplete_results?: boolean;
};

type GitHubIssue = Record<string, unknown>;

/**
 * Pulls open issues + PRs involving the authenticated user (assigned, created, mentioned).
 */
@Injectable()
export class GitHubIssuesFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.github;
  readonly resource = SyncResource.tasks;
  private readonly logger = new Logger(GitHubIssuesFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    try {
      return await this.fetchInvolved(ctx);
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

  private async fetchInvolved(ctx: FetchContext): Promise<RawSyncBatch> {
    const seen = new Set<string>();
    const items: RawSyncBatch['items'] = [];

    const pushIssue = (issue: GitHubIssue) => {
      const id =
        typeof issue.id === 'number'
          ? String(issue.id)
          : typeof issue.id === 'string'
            ? issue.id
            : null;
      if (!id || seen.has(id)) return;
      // Skip pure PRs? No — include both issues and PRs (pull_request key present on PRs).
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
    };

    // Reliable path: issues assigned / created / mentioned for the authed user.
    for (const filter of ['assigned', 'created', 'mentioned'] as const) {
      let page = 1;
      while (page <= 2) {
        const params = new URLSearchParams({
          filter,
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: '50',
          page: String(page),
        });
        const batch = await providerFetchJson<GitHubIssue[]>(
          `https://api.github.com/issues?${params}`,
          {
            accessToken: ctx.accessToken,
            headers: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        );
        for (const issue of batch) pushIssue(issue);
        if (batch.length < 50) break;
        page += 1;
      }
    }

    // Supplement with search for review requests + recent involvement (date-bounded).
    const since = ctx.window.from.toISOString().slice(0, 10);
    const queries = [
      `is:open review-requested:@me updated:>=${since}`,
      `is:open involves:@me updated:>=${since}`,
    ];

    for (const q of queries) {
      const params = new URLSearchParams({
        q,
        sort: 'updated',
        order: 'desc',
        per_page: '50',
        page: '1',
      });
      try {
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
        for (const issue of data.items ?? []) pushIssue(issue);
      } catch (error) {
        this.logger.debug(
          {
            connectedAccountId: ctx.connectedAccountId,
            query: q,
            error: error instanceof Error ? error.message : String(error),
          },
          'GitHub search supplement skipped',
        );
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
