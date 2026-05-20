const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache de páginas del dashboard
      {
        urlPattern: /^https:\/\/.*\/dashboard(\/.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "dashboard-cache",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // Cache de imágenes
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // Cache de fuentes de Google
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
        handler: "CacheFirst",
        options: {
          cacheName: "font-cache",
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  serverExternalPackages: ["pdf-parse"],
};

module.exports = withPWA(nextConfig);
