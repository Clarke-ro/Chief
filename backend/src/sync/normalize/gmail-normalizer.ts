type GmailPayload = {
  id?: unknown;
  threadId?: unknown;
  snippet?: unknown;
  labelIds?: unknown;
  internalDate?: unknown;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
    }>;
  };
};

export type NormalizedGmailMessage = {
  providerMessageId: string;
  threadId: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  labelIds: string[];
  isUnread: boolean;
  isStarred: boolean;
  receivedAt: Date | null;
  raw: Record<string, unknown>;
};

function headerMap(payload: GmailPayload): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of payload.payload?.headers ?? []) {
    if (h.name && h.value) map[h.name.toLowerCase()] = h.value;
  }
  return map;
}

function decodeBody(payload: GmailPayload): { text?: string; html?: string } {
  const root = payload.payload;
  if (!root) return {};

  const decode = (data?: string) => {
    if (!data) return undefined;
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
        'utf8',
      );
    } catch {
      return undefined;
    }
  };

  if (root.body?.data) {
    const decoded = decode(root.body.data);
    if (root.mimeType?.includes('html')) return { html: decoded };
    return { text: decoded };
  }

  let text: string | undefined;
  let html: string | undefined;
  for (const part of root.parts ?? []) {
    if (part.mimeType === 'text/plain' && !text) text = decode(part.body?.data);
    if (part.mimeType === 'text/html' && !html) html = decode(part.body?.data);
  }
  return { text, html };
}

function parseAddressList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/<([^>]+)>/);
      return (m?.[1] ?? s).toLowerCase();
    });
}

function parseFrom(value?: string): { name?: string; address?: string } {
  if (!value) return {};
  const m = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) {
    return {
      name: m[1]?.replace(/^"|"$/g, '').trim() || undefined,
      address: m[2].toLowerCase(),
    };
  }
  return { address: value.toLowerCase() };
}

export function normalizeGmailMessage(
  payload: Record<string, unknown>,
): NormalizedGmailMessage | null {
  const data = payload as GmailPayload;
  const id = typeof data.id === 'string' ? data.id : null;
  if (!id) return null;

  const headers = headerMap(data);
  const from = parseFrom(headers.from);
  const body = decodeBody(data);
  const labelIds = Array.isArray(data.labelIds)
    ? data.labelIds.filter((v): v is string => typeof v === 'string')
    : [];
  const internalDate =
    typeof data.internalDate === 'string'
      ? Number(data.internalDate)
      : typeof data.internalDate === 'number'
        ? data.internalDate
        : undefined;

  return {
    providerMessageId: id,
    threadId: typeof data.threadId === 'string' ? data.threadId : null,
    subject: headers.subject ?? null,
    snippet: typeof data.snippet === 'string' ? data.snippet : null,
    bodyText: body.text ?? null,
    bodyHtml: body.html ?? null,
    fromAddress: from.address ?? null,
    fromName: from.name ?? null,
    toAddresses: parseAddressList(headers.to),
    ccAddresses: parseAddressList(headers.cc),
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    receivedAt: internalDate ? new Date(internalDate) : null,
    raw: payload,
  };
}
