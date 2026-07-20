import { NativeModules } from 'react-native';

/**
 * Debug ingest helper for physical devices.
 * 127.0.0.1 on a phone is the phone itself — use Metro's LAN host instead.
 */
function resolveDebugIngestUrl(): string {
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  const match = scriptURL?.match(/https?:\/\/([^/:]+)(?::\d+)?/);
  const host = match?.[1] || '127.0.0.1';
  return `http://${host}:7806/ingest/85a41b06-52fa-4ba4-be9e-31d0674073ab`;
}

export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'pre-fix',
): void {
  const payload = {
    sessionId: 'bf7caf',
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // Always mirror to Metro so we have evidence even if ingest is unreachable.
  console.warn('[DBG-bf7caf]', JSON.stringify(payload));

  fetch(resolveDebugIngestUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'bf7caf',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
