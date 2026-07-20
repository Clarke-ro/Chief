/**
 * Soft shim for expo/winter ExpoFetchModule.
 * When native Expo modules aren't registered (broken Expo Go host), fall back
 * so importing winter/fetch does not crash at module evaluation time.
 * Prefer EXPO_PUBLIC_USE_RN_FETCH=true so winter never installs expo fetch.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

const native = requireOptionalNativeModule('ExpoFetchModule');

export const ExpoFetchModule = native ?? {
  NativeRequest: class NativeRequest {},
  NativeResponse: class NativeResponse {},
  unstable_createBlobData: async () => {
    throw new Error('ExpoFetchModule is unavailable; use React Native fetch.');
  },
};
