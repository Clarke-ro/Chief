import { useNetworkState } from 'expo-network';

/** Live online/offline status for banners and offline-aware UI. */
export function useOnlineStatus(): boolean {
  const state = useNetworkState();
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}
