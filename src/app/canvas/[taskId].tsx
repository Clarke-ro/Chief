import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import type { ActionableTask, CanvasKind, HandoffTarget } from '@/features/actions/types';
import { assertSafeExternalUrl } from '@/services';
import { useCanvasStore, usePreferencesStore } from '@/stores';

const CANVAS_KINDS = new Set<CanvasKind>(['email', 'message', 'notes', 'schedule']);

const HANDOFF_TARGETS = new Set<HandoffTarget>([
  'gmail',
  'calendar',
  'drive',
  'docs',
  'slack',
  'github',
  'notion',
  'trello',
  'asana',
  'jira',
  'linear',
  'zoom',
  'teams',
  'generic',
]);

function asString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

/**
 * Legacy deep-link route — opens the global slide panel, then lands on Home
 * (or onboarding if the user has not finished setup).
 */
export default function CanvasRoute() {
  const params = useLocalSearchParams<{
    taskId: string;
    label?: string;
    canvasKind?: string;
    title?: string;
    draft?: string;
    recipient?: string;
    context?: string;
    handoffUrl?: string;
    handoffTarget?: string;
  }>();
  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);

  const taskId = asString(params.taskId);
  const label = asString(params.label);
  const canvasKindRaw = asString(params.canvasKind);
  const title = asString(params.title);
  const draft = asString(params.draft);
  const recipient = asString(params.recipient);
  const context = asString(params.context);
  const handoffUrl = asString(params.handoffUrl);
  const handoffTargetRaw = asString(params.handoffTarget);

  useEffect(() => {
    if (!taskId) return;

    const kind =
      canvasKindRaw && CANVAS_KINDS.has(canvasKindRaw as CanvasKind)
        ? (canvasKindRaw as CanvasKind)
        : 'notes';

    const handoffTarget =
      handoffTargetRaw && HANDOFF_TARGETS.has(handoffTargetRaw as HandoffTarget)
        ? (handoffTargetRaw as HandoffTarget)
        : undefined;

    const safeUrl = assertSafeExternalUrl(handoffUrl);
    const task: ActionableTask = {
      id: taskId,
      label: label ?? 'Action',
      execution: 'canvas',
      canvasKind: kind,
      title,
      draft,
      recipient,
      context,
      // Never accept unsafe deep-link URLs into the handoff field
      url: safeUrl.ok ? safeUrl.url : undefined,
      handoffTarget,
    };
    useCanvasStore.getState().open(task, 'panel');
  }, [
    taskId,
    label,
    canvasKindRaw,
    title,
    draft,
    recipient,
    context,
    handoffUrl,
    handoffTargetRaw,
  ]);

  // Panel opens via store; this route never stays visible.
  return <Redirect href={onboardingCompleted ? '/home' : '/onboarding'} />;
}
