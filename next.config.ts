import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 🔴 TODO (Task #4): Re-enable after fixing all ESLint errors
    // Currently disabled - security plan requires fixing errors first
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 🔴 TODO (Task #4): Re-enable after fixing all TypeScript errors
    // Currently disabled - security plan requires fixing errors first
    ignoreBuildErrors: true,
  },
  // 🔐 SECURITY: CSP headers moved to src/middleware.ts for nonce-based policy
  // Middleware provides better control and per-request nonce generation
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
