import { TurboModuleRegistry } from 'react-native';

import NativeModulesProxy from 'expo-modules-core/src/NativeModulesProxy';
import { createTurboModuleToExpoProxy } from 'expo-modules-core/src/TurboModuleToExpoModuleProxy';
import { ensureNativeModulesAreInstalled } from 'expo-modules-core/src/ensureNativeModulesAreInstalled';

const warned = new Set();

function warnOnce(moduleName) {
  if (warned.has(moduleName)) return;
  warned.add(moduleName);
  console.warn(
    `[expo-modules] Native module '${moduleName}' unavailable — using JS stub (Expo Go host may be broken)`,
  );
}

/**
 * Minimal stub so requireNativeModule() never fatal-crashes the app when Expo Go
 * fails to register native modules (ExponentConstants / ExpoAsset / ExpoLinking / …).
 */
function createMissingNativeModuleStub(moduleName) {
  warnOnce(moduleName);
  return new Proxy(
    {
      addListener: () => ({ remove() {} }),
      removeListeners: () => {},
      removeAllListeners: () => {},
      emit: () => {},
      getLinkingURL: () => null,
      clearInitialURL: () => {},
      downloadAsync: async (url) => url,
      NativeRequest: class NativeRequest {},
      NativeResponse: class NativeResponse {},
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'then') return undefined;
        if (typeof prop === 'symbol') return undefined;
        return (..._args) => null;
      },
    },
  );
}

export function requireOptionalNativeModule(moduleName) {
  ensureNativeModulesAreInstalled();

  try {
    return (
      globalThis.expo?.modules?.[moduleName] ??
      NativeModulesProxy[moduleName] ??
      createTurboModuleToExpoProxy(TurboModuleRegistry.get(moduleName), moduleName) ??
      null
    );
  } catch (e) {
    console.warn(`An error occurred while requiring the '${moduleName}' module: ${e.message}`);
    return null;
  }
}

export function requireNativeModule(moduleName) {
  const nativeModule = requireOptionalNativeModule(moduleName);
  if (!nativeModule) {
    return createMissingNativeModuleStub(moduleName);
  }
  return nativeModule;
}
