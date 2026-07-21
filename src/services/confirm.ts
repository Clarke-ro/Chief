import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirm. RN `Alert.alert` with buttons is a no-op on web —
 * use `window.confirm` there so Profile disconnect / logout actually run.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: cancelLabel,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Simple one-button alert that works on web and native. */
export function notifyAlert(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
