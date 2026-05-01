import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // 🔐 SECURITY: CSP headers moved to src/middleware.ts for nonce-based policy
  // Middleware provides better control and per-request nonce generation
  turbopack: {
    resolveAlias: {
      "pino-pretty": { browser: "./src/lib/empty-module.ts" },
      "@react-native-async-storage/async-storage": "./src/lib/empty-module.ts",
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
