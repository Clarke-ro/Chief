import type { PlatformIconId } from '@/components/ui';

export type ConnectedApp = {
  id: string;
  platform: PlatformIconId;
  name: string;
  connected: boolean;
  /** Present when connected via live OAuth. */
  connectionId?: string;
  provider?: string;
  needsReauth?: boolean;
  accountLabel?: string | null;
};

export type NotificationPref = {
  id: string;
  label: string;
  enabled: boolean;
};

export type ProfileUser = {
  name: string;
  email: string;
  plan: string;
  avatarUri?: string | null;
};

export type SubscriptionInfo = {
  plan: string;
  renewalDate: string;
};

export type ProfileSnapshot = {
  user: ProfileUser;
  connectedApps: ConnectedApp[];
  notifications: NotificationPref[];
  subscription: SubscriptionInfo;
  appearance: {
    theme: string;
    accent: string;
    appIcon: string;
    textSize: string;
  };
};
