module.exports = function (api) {
  api.cache(true);
  return {
    // Do not set jsxImportSource: 'nativewind' — it breaks Pressable style callbacks
    // used across the app (CTA fills never applied). No screens use className today.
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
