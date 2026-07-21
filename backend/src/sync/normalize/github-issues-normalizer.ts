import {
  TaskPriority,
  TaskSection,
  TaskStatus,
} from '@prisma/client';
import type { NormalizedTask } from './tasks-normalizer';
import { classifyDueForTask } from './tasks-due';

type GitHubIssuePayload = {
  id?: unknown;
  number?: unknown;
  title?: unknown;
  body?: unknown;
  state?: unknown;
  html_url?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
  closed_at?: unknown;
  pull_request?: unknown;
  repository_url?: unknown;
  labels?: unknown;
  user?: { login?: unknown };
  assignee?: { login?: unknown } | null;
};

/**
 * Map a GitHub Issues API item into Prisma Task fields.
 * Issues and PRs both surface as focusable tasks.
 */
export function normalizeGitHubIssue(
  payload: Record<string, unknown>,
  providerItemId?: string,
): NormalizedTask | null {
  const data = payload as GitHubIssuePayload;
  const numericId =
    typeof data.id === 'number'
      ? String(data.id)
      : typeof data.id === 'string'
        ? data.id
        : null;
  const providerTaskId = providerItemId || numericId;
  if (!providerTaskId) return null;

  const title =
    typeof data.title === 'string' && data.title.trim().length > 0
      ? data.title.trim()
      : 'Untitled issue';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  const isPr = data.pull_request != null;
  const closed = data.state === 'closed';
  const repoSlug = repoFromUrl(data.repository_url);
  const number = typeof data.number === 'number' ? data.number : null;
  const label = isPr ? 'PR' : 'Issue';
  const ref =
    number != null && repoSlug ? `${repoSlug}#${number}` : repoSlug || 'GitHub';

  const dueAt = null;
  const { section, priority, dueLabel } = classifyDueForTask(dueAt, closed);

  return {
    providerTaskId,
    title: isPr ? `[PR] ${title}` : title,
    description: body
      ? body.slice(0, 280)
      : closed
        ? `Closed ${label.toLowerCase()} on ${ref}`
        : `Open ${label.toLowerCase()} on ${ref}`,
    details: body || `Synced from GitHub (${ref}).`,
    platform: 'github',
    priority: closed ? TaskPriority.low : priority,
    status: closed ? TaskStatus.done : TaskStatus.ready,
    section: closed ? TaskSection.completed : section,
    dueAt,
    dueLabel: closed ? 'Done' : dueLabel ?? (isPr ? 'Open PR' : 'Open issue'),
    completedAt: closed ? parseDate(data.closed_at ?? data.updated_at) : null,
    confidence: closed ? 0.5 : 0.82,
    estimatedTime: isPr ? '30 min' : '20 min',
    meta: {
      source: 'github.issues',
      kind: isPr ? 'pull_request' : 'issue',
      number,
      repo: repoSlug,
      htmlUrl: typeof data.html_url === 'string' ? data.html_url : null,
      state: data.state,
      author:
        data.user && typeof data.user.login === 'string'
          ? data.user.login
          : null,
      labels: Array.isArray(data.labels)
        ? data.labels
            .map((l) =>
              l && typeof l === 'object' && 'name' in l
                ? String((l as { name: unknown }).name)
                : null,
            )
            .filter(Boolean)
        : [],
    },
    raw: payload,
  };
}

function repoFromUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const match = value.match(/repos\/([^/]+\/[^/]+)/);
  return match?.[1] ?? null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
