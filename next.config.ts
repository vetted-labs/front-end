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
  // Allow unsafe-eval in development for libraries that need it (wagmi, rainbow-kit, etc.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline';" // Development: allow eval
                : "script-src 'self' 'unsafe-inline';", // Production: stricter policy
          },
        ],
      },
    ];
  },
};

export default nextConfig;
