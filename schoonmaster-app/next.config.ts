import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // API routes — Network First (always try network, fall back to cache)
      {
        urlPattern: /^https:\/\/.*\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 5 }, // 5 min
          networkTimeoutSeconds: 5,
        },
      },
      // Static assets — Cache First
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2|woff|ttf)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
        },
      },
      // Google Fonts — Stale While Revalidate
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Silence Turbopack/webpack conflict warning from next-pwa's webpack config
  turbopack: {},
  experimental: {
    serverActions: { bodySizeLimit: "11mb" }, // allow 10MB image uploads + overhead
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
