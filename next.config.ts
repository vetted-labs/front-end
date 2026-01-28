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
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that are not needed for web builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    // Suppress warnings for these optional dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/@react-native-async-storage\/async-storage/ },
      { module: /node_modules\/pino-pretty/ },
    ];

    return config;
  },
};

export default nextConfig;
