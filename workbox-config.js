/** @type {import('workbox-build').GenerateSWOptions} */
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,png,ico,svg,json,ttf,woff,woff2,webp}'],
  swDest: 'dist/sw.js',
  // Expo web entry can exceed Workbox's 2MB default; keep the shell installable offline.
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  cleanupOutdatedCaches: true,
  skipWaiting: true,
  clientsClaim: true,
  // Precache the SPA shell + assets. API / auth traffic stays network-only by default.
  runtimeCaching: [
    {
      urlPattern: ({ request, url }) =>
        request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'chief-pages',
        networkTimeoutSeconds: 4,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 60 * 60 * 24,
        },
      },
    },
    {
      urlPattern: ({ request }) =>
        ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'chief-static',
        expiration: {
          maxEntries: 96,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
};
