import { Platform } from 'react-native';

import { env } from '@/config/env';
import { notificationsRepository } from '@/services/repositories/notificationsRepository';

/**
 * Best-effort Expo push registration. No-ops on web / when permissions denied /
 * when `expo-notifications` is unavailable in the current build.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Platform.OS === 'web' || !env.isApiConfigured) return false;

  try {
    const Notifications = await import('expo-notifications');
    const Constants = await import('expo-constants');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    const projectId =
      Constants.default?.easConfig?.projectId ??
      Constants.default?.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResponse.data?.trim();
    if (!token) return false;

    await notificationsRepository.registerPushToken(token, Platform.OS);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] registration skipped', error);
    }
    return false;
  }
}
