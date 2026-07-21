import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone);
  return Boolean(media || iosStandalone);
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
}

export type PwaInstallState = {
  /** True when running as an installed PWA. */
  isInstalled: boolean;
  /** True when Chromium deferred install prompt is available. */
  canPromptInstall: boolean;
  /** True on iOS Safari where Add to Home Screen is manual. */
  needsManualInstall: boolean;
  promptInstall: () => Promise<boolean>;
  dismiss: () => void;
  dismissed: boolean;
};

const DISMISS_KEY = 'chief.pwaInstall.dismissed';

/** Web-only installability helpers for the Chief PWA. */
export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    setIsInstalled(isStandaloneDisplay());
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = () => setIsInstalled(isStandaloneDisplay());
    media?.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome === 'accepted';
    } catch {
      return false;
    }
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore quota / private mode
    }
  }, []);

  if (Platform.OS !== 'web') {
    return {
      isInstalled: false,
      canPromptInstall: false,
      needsManualInstall: false,
      promptInstall: async () => false,
      dismiss: () => undefined,
      dismissed: true,
    };
  }

  return {
    isInstalled,
    canPromptInstall: Boolean(deferred) && !isInstalled,
    needsManualInstall: !isInstalled && !deferred && isIosSafari(),
    promptInstall,
    dismiss,
    dismissed,
  };
}
