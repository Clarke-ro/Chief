module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind disabled for now — unused in screens and can interfere with Metro
    // platform resolution during Expo Go debugging.
    presets: ['babel-preset-expo'],
  };
};
