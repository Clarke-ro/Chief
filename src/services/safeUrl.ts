/**
 * Allowlist for opening external URLs from Chief handoffs / deep links.
 * Never open arbitrary schemes from route params without this check.
 */

const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:']);

const ALLOWED_HOST_SUFFIXES = [
  'github.com',
  'gmail.com',
  'mail.google.com',
  'google.com',
  'calendar.google.com',
  'slack.com',
  'notion.so',
  'notion.com',
  'asana.com',
  'trello.com',
  'linear.app',
  'atlassian.net',
  'zoom.us',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UrlSafety =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) return false;
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** Validate a handoff / deep-link URL before Linking.openURL. */
export function assertSafeExternalUrl(raw: string | undefined | null): UrlSafety {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Missing URL.' };
  }

  // Block CRLF / control chars (header injection / smuggling)
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return { ok: false, reason: 'Invalid URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Invalid URL.' };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: 'Unsupported link type.' };
  }

  // Never allow embedded credentials (https://user:pass@host)
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Credentials in links are not allowed.' };
  }

  if (parsed.protocol === 'mailto:') {
    if (/javascript:/i.test(trimmed)) {
      return { ok: false, reason: 'Invalid mail link.' };
    }
    const address = decodeURIComponent(parsed.pathname || '').split('?')[0];
    // Empty mailto: opens the composer; otherwise require a simple address
    if (address && !EMAIL_RE.test(address)) {
      return { ok: false, reason: 'Invalid mail address.' };
    }
    return { ok: true, url: trimmed };
  }

  if (!hostAllowed(parsed.hostname)) {
    return { ok: false, reason: 'Link destination is not allowed.' };
  }

  return { ok: true, url: trimmed };
}

/** Short label for confirm dialogs — never dump full query strings with PII. */
export function summarizeUrlForDisplay(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'mailto:') {
      const address = decodeURIComponent(parsed.pathname || '').split('?')[0];
      return address ? `mailto:${address}` : 'mailto';
    }
    return parsed.host + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return 'external app';
  }
}
