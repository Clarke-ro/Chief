import {
  TaskPriority,
  TaskSection,
  TaskStatus,
} from '@prisma/client';
import type { NormalizedTask } from './tasks-normalizer';
import { classifyDueForTask } from './tasks-due';

type NotionPagePayload = {
  id?: unknown;
  url?: unknown;
  archived?: unknown;
  last_edited_time?: unknown;
  created_time?: unknown;
  properties?: Record<string, unknown>;
  parent?: { type?: unknown; database_id?: unknown };
};

/**
 * Map a Notion page (from search) into a Prisma Task.
 * Uses title property when present; otherwise falls back to Untitled.
 */
export function normalizeNotionPage(
  payload: Record<string, unknown>,
  providerItemId?: string,
): NormalizedTask | null {
  const data = payload as NotionPagePayload;
  if (data.archived === true) return null;

  const pageId =
    typeof data.id === 'string'
      ? data.id
      : providerItemId
        ? providerItemId
        : null;
  if (!pageId) return null;

  const title = extractTitle(data.properties) || 'Untitled page';
  const dueAt = extractDue(data.properties);
  const done = extractDone(data.properties);
  const { section, priority, dueLabel } = classifyDueForTask(dueAt, done);

  return {
    providerTaskId: pageId,
    title,
    description: done
      ? 'Completed in Notion'
      : dueAt
        ? `Notion page · ${dueLabel ?? 'scheduled'}`
        : 'Synced from Notion',
    details: `Synced from Notion${typeof data.url === 'string' ? `: ${data.url}` : '.'}`,
    platform: 'notion',
    priority: done ? TaskPriority.low : priority,
    status: done ? TaskStatus.done : TaskStatus.ready,
    section: done ? TaskSection.completed : section,
    dueAt,
    dueLabel: done ? 'Done' : dueLabel,
    completedAt: done ? parseDate(data.last_edited_time) : null,
    confidence: dueAt ? 0.8 : 0.68,
    estimatedTime: '15 min',
    meta: {
      source: 'notion.pages',
      url: typeof data.url === 'string' ? data.url : null,
      parentType:
        data.parent && typeof data.parent.type === 'string'
          ? data.parent.type
          : null,
      lastEditedAt:
        typeof data.last_edited_time === 'string'
          ? data.last_edited_time
          : null,
    },
    raw: payload,
  };
}

function extractTitle(properties: Record<string, unknown> | undefined): string {
  if (!properties) return '';
  for (const value of Object.values(properties)) {
    if (!value || typeof value !== 'object') continue;
    const prop = value as { type?: string; title?: Array<{ plain_text?: string }> };
    if (prop.type === 'title' && Array.isArray(prop.title)) {
      const text = prop.title
        .map((t) => t.plain_text ?? '')
        .join('')
        .trim();
      if (text) return text;
    }
  }
  return '';
}

function extractDue(properties: Record<string, unknown> | undefined): Date | null {
  if (!properties) return null;
  for (const value of Object.values(properties)) {
    if (!value || typeof value !== 'object') continue;
    const prop = value as {
      type?: string;
      date?: { start?: string } | null;
    };
    if (prop.type === 'date' && prop.date?.start) {
      return parseDate(prop.date.start);
    }
  }
  return null;
}

function extractDone(properties: Record<string, unknown> | undefined): boolean {
  if (!properties) return false;
  for (const [key, value] of Object.entries(properties)) {
    if (!value || typeof value !== 'object') continue;
    const prop = value as {
      type?: string;
      checkbox?: boolean;
      status?: { name?: string };
      select?: { name?: string } | null;
    };
    const keyLower = key.toLowerCase();
    if (prop.type === 'checkbox' && /done|complete|checked/i.test(keyLower)) {
      return prop.checkbox === true;
    }
    if (prop.type === 'status' && prop.status?.name) {
      return /done|complete|finished/i.test(prop.status.name);
    }
    if (prop.type === 'select' && prop.select?.name) {
      return /done|complete|finished/i.test(prop.select.name);
    }
  }
  return false;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
