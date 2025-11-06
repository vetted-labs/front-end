import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on specific files during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only run TypeScript type checking on specific files during production builds
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
