/** Cursor pagination for large inventories (tasks, sessions, integrations). */
export type PageParams = {
  cursor?: string;
  limit?: number;
};

export type PageResult<T> = {
  items: T[];
  nextCursor?: string;
  /** Total when the API knows it; omit for pure cursor feeds */
  total?: number;
};

export const DEFAULT_PAGE_LIMIT = 50;

export function normalizePageParams(params?: PageParams): Required<Pick<PageParams, 'limit'>> & {
  cursor?: string;
} {
  const limit = Math.min(Math.max(params?.limit ?? DEFAULT_PAGE_LIMIT, 1), 100);
  return {
    limit,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
  };
}

/** Slice a local array into a cursor page (mock / offline fallback). */
export function paginateArray<T>(
  items: readonly T[],
  params?: PageParams,
): PageResult<T> {
  const { limit, cursor } = normalizePageParams(params);
  const start = cursor ? Number.parseInt(cursor, 10) : 0;
  const offset = Number.isFinite(start) && start > 0 ? start : 0;
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    items: [...slice],
    nextCursor: next < items.length ? String(next) : undefined,
    total: items.length,
  };
}
