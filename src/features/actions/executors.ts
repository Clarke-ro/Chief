import { Alert, Linking } from 'react-native';

import { handoffLabel } from '@/features/actions/catalog';
import type { ActionableTask } from '@/features/actions/types';
import { assertSafeExternalUrl, summarizeUrlForDisplay } from '@/services/safeUrl';
import { useCanvasStore } from '@/stores/canvasStore';

/** Open the slide-panel canvas (Home / Focus / anywhere outside Chief chat). */
export function openCanvas(task: ActionableTask) {
  useCanvasStore.getState().open(task, 'panel');
}

/** Explain why an action cannot execute instead of falling back to another app. */
export function showUnavailableAction(task: Pick<ActionableTask, 'summary'>) {
  Alert.alert(
    'Action unavailable',
    task.summary ?? 'Chief does not have a verified link for this item yet.',
  );
}

function confirmAndOpen(title: string, url: string, summary?: string) {
  const preview = summarizeUrlForDisplay(url);
  Alert.alert(
    title,
    summary ? `${summary}\n\nOpen ${preview}?` : `Continue in another app?\n\n${preview}`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open',
        onPress: () => {
          void Linking.openURL(url).catch(() => {
            Alert.alert(title, 'Could not open that link.');
          });
        },
      },
    ],
  );
}

/** Hand off to an external app — Chief can't finish this inside the product. */
export async function openHandoff(task: ActionableTask) {
  const title = task.label?.trim() || handoffLabel(task.handoffTarget);
  const safety = assertSafeExternalUrl(task.url);

  if (!safety.ok) {
    showUnavailableAction(task);
    return;
  }

  try {
    const can = await Linking.canOpenURL(safety.url);
    if (!can) {
      Alert.alert(title, task.summary ?? 'This app is not available on this device.');
      return;
    }
  } catch {
    Alert.alert(title, 'Could not verify that link.');
    return;
  }

  confirmAndOpen(title, safety.url, task.summary);
}
