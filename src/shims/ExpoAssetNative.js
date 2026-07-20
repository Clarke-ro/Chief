/**
 * Expo Go–safe shim for expo-asset's native download helper.
 * Official ExpoAsset.js calls requireNativeModule('ExpoAsset') at import time,
 * which crashes the whole app when the native host hasn't registered modules yet.
 * We fall back to returning the remote URL unchanged.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

const AssetModule = requireOptionalNativeModule('ExpoAsset');

export async function downloadAsync(url, _md5Hash, _type) {
  if (!AssetModule?.downloadAsync) {
    return url;
  }
  return AssetModule.downloadAsync(url, _md5Hash, _type);
}
