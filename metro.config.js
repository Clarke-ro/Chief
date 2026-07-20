const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const expoLinking = path.resolve(__dirname, 'src/shims/ExpoLinking.js');
const exponentConstants = path.resolve(__dirname, 'src/shims/ExponentConstants.js');
const expoSecureStore = path.resolve(__dirname, 'src/shims/ExpoSecureStore.js');

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = (context.originModulePath || '').replace(/\\/g, '/');

  if (
    (moduleName === './ExponentConstants' || moduleName.endsWith('/ExponentConstants')) &&
    origin.includes('/expo-constants/')
  ) {
    return { type: 'sourceFile', filePath: exponentConstants };
  }

  if (
    (moduleName === './ExpoSecureStore' || moduleName.endsWith('/ExpoSecureStore')) &&
    origin.includes('/expo-secure-store/')
  ) {
    return { type: 'sourceFile', filePath: expoSecureStore };
  }

  if (
    (moduleName === './ExpoWebBrowser' ||
      moduleName === './ExponentWebBrowser' ||
      moduleName.endsWith('/ExpoWebBrowser') ||
      moduleName.endsWith('/ExponentWebBrowser')) &&
    origin.includes('/expo-web-browser/')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/ExpoWebBrowser.js'),
    };
  }

  if (
    (moduleName === './ExpoLinking' || moduleName.endsWith('/ExpoLinking')) &&
    origin.includes('/expo-linking/') &&
    !origin.includes('.web.')
  ) {
    return { type: 'sourceFile', filePath: expoLinking };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
