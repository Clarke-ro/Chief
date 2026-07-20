import type { FetchContext, RawSyncBatch, RawSyncItem } from '../sync.types';

export function emptyBatch(
  ctx: FetchContext,
  opts?: {
    items?: RawSyncItem[];
    cursorAfter?: string | null;
    stub?: boolean;
    meta?: Record<string, unknown>;
  },
): RawSyncBatch {
  return {
    workspaceId: ctx.workspaceId,
    connectedAccountId: ctx.connectedAccountId,
    provider: ctx.provider,
    resource: ctx.resource,
    reason: ctx.reason,
    fetchedAt: new Date().toISOString(),
    window: {
      from: ctx.window.from.toISOString(),
      to: ctx.window.to.toISOString(),
      mode: ctx.window.mode,
    },
    cursorBefore: ctx.cursor,
    cursorAfter: opts?.cursorAfter ?? ctx.cursor,
    items: opts?.items ?? [],
    stub: opts?.stub,
    meta: opts?.meta,
  };
}
