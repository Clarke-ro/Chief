import { Linking } from 'react-native';

import { handoffLabel } from '@/features/actions/catalog';
import type { ActionableTask } from '@/features/actions/types';
import { confirmAction, notifyAlert } from '@/services/confirm';
import { assertSafeExternalUrl, summarizeUrlForDisplay } from '@/services/safeUrl';
import { useCanvasStore } from '@/stores/canvasStore';

/** Open the slide-panel canvas (Home / Focus / anywhere outside Chief chat). */
export function openCanvas(task: ActionableTask) {
  useCanvasStore.getState().open(task, 'panel');
}

/** Explain why an action cannot execute instead of falling back to another app. */
export function showUnavailableAction(task: Pick<ActionableTask, 'summary'>) {
  notifyAlert(
    'Action unavailable',
    task.summary ?? 'Chief does not have a verified link for this item yet.',
  );
}

/** Hand off to an external app — Chief can't finish this inside the product. */
export async function openHandoff(task: ActionableTask) {
  const title = task.label?.trim() || handoffLabel(task.handoffTarget);
  const safety = assertSafeExternalUrl(task.url);

  if (!safety.ok) {
    showUnavailableAction({
      summary: task.summary ?? 'Chief does not have a verified link for this item yet.',
    });
    return;
  }

  try {
    const can = await Linking.canOpenURL(safety.url);
    if (!can) {
      notifyAlert(title, task.summary ?? 'This app is not available on this device.');
      return;
    }
  } catch {
    notifyAlert(title, 'Could not verify that link.');
    return;
  }

  const preview = summarizeUrlForDisplay(safety.url);
  const message = task.summary
    ? `${task.summary}\n\nOpen ${preview}?`
    : `Continue in another app?\n\n${preview}`;

  const ok = await confirmAction({
    title,
    message,
    confirmLabel: 'Open',
    cancelLabel: 'Cancel',
  });
  if (!ok) return;

  try {
    await Linking.openURL(safety.url);
  } catch {
    notifyAlert(title, 'Could not open that link.');
  }
}
