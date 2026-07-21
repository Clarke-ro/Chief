import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupedCard } from '@/components/ui';
import type { ConnectedApp } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { queryKeys } from '@/services';
import {
  syncRepository,
  type SyncStatusResponse,
} from '@/services/repositories/syncRepository';
import { fontFamily, spacing, typography } from '@/theme';

type SyncHealthCardProps = {
  workspaceId?: string;
  apps: ConnectedApp[];
  onReconnect: (app: ConnectedApp) => void;
  onRetrySync?: () => void;
};

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  microsoft: 'Microsoft',
};

function formatSyncAge(iso: string | null): string {
  if (!iso) return 'Never synced';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function summarizeStates(status: SyncStatusResponse | undefined): {
  label: string;
  tone: 'ok' | 'warn' | 'idle';
  detail: string | null;
} {
  const states = status?.states ?? [];
  if (states.length === 0) {
    return { label: 'Waiting for first sync', tone: 'idle', detail: null };
  }
  const failed = states.find((s) => s.status === 'failed');
  if (failed) {
    return {
      label: 'Sync failed',
      tone: 'warn',
      detail: failed.lastError ? failed.lastError.slice(0, 120) : null,
    };
  }
  if (states.some((s) => s.status === 'running')) {
    return { label: 'Syncing…', tone: 'ok', detail: null };
  }
  const latest = states
    .map((s) => s.lastSyncedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  return {
    label: `Synced ${formatSyncAge(latest ?? null)}`,
    tone: 'ok',
    detail: null,
  };
}

/** Compact per-provider sync health under Connected Apps. */
export function SyncHealthCard({
  workspaceId,
  apps,
  onReconnect,
  onRetrySync,
}: SyncHealthCardProps) {
  const colors = useThemeColors();

  // One row per connected provider (dedupe Google tiles).
  const uniqueConnections = (() => {
    const seen = new Set<string>();
    const rows: ConnectedApp[] = [];
    for (const app of apps) {
      if (!app.connected || !app.connectionId || !app.provider) continue;
      if (seen.has(app.provider)) continue;
      seen.add(app.provider);
      rows.push(app);
    }
    return rows;
  })();

  const statusQuery = useQuery({
    queryKey: [...queryKeys.root, 'syncHealth', workspaceId, uniqueConnections.map((a) => a.connectionId).join(',')],
    enabled: Boolean(workspaceId) && uniqueConnections.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const results: Record<string, SyncStatusResponse> = {};
      await Promise.all(
        uniqueConnections.map(async (app) => {
          try {
            results[app.connectionId!] = await syncRepository.getStatus(
              app.connectionId!,
              workspaceId!,
            );
          } catch {
            /* leave missing — UI shows idle */
          }
        }),
      );
      return results;
    },
  });

  if (uniqueConnections.length === 0) {
    return null;
  }

  return (
    <GroupedCard contentStyle={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sync health</Text>
        {onRetrySync ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry sync"
            onPress={onRetrySync}
            hitSlop={8}
          >
            <Text style={[styles.retry, { color: colors.accent }]}>Sync now</Text>
          </Pressable>
        ) : null}
      </View>

      {statusQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        uniqueConnections.map((app) => {
          const summary = summarizeStates(statusQuery.data?.[app.connectionId!]);
          const needsAttention = Boolean(app.needsReauth || app.syncWarning || summary.tone === 'warn');
          const providerLabel =
            (app.provider && PROVIDER_LABEL[app.provider]) || app.name;

          return (
            <View key={app.provider} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: needsAttention
                      ? colors.warning
                      : summary.tone === 'ok'
                        ? colors.success
                        : colors.textTertiary,
                  },
                ]}
              />
              <View style={styles.copy}>
                <Text style={[styles.provider, { color: colors.text }]}>
                  {providerLabel}
                  {app.accountLabel ? (
                    <Text style={{ color: colors.textTertiary }}> · {app.accountLabel}</Text>
                  ) : null}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {app.needsReauth
                    ? 'Reconnect required'
                    : app.healthOk === false
                      ? app.healthMessage || 'Connection unhealthy'
                      : summary.label}
                </Text>
                {summary.detail && !app.needsReauth ? (
                  <Text style={[styles.error, { color: colors.warning }]} numberOfLines={2}>
                    {summary.detail}
                  </Text>
                ) : null}
              </View>
              {app.needsReauth ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reconnect ${providerLabel}`}
                  onPress={() => onReconnect(app)}
                  hitSlop={6}
                >
                  <Text style={[styles.retry, { color: colors.accent }]}>Reconnect</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  retry: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
  },
  loading: {
    paddingVertical: spacing[8],
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  provider: {
    ...typography.body,
    fontFamily: fontFamily.medium,
  },
  meta: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
    marginTop: 2,
  },
});
