// middleware.ts - Next.js middleware for security headers and CSP
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Generate nonce for CSP (cryptographically secure random value)
  // Using Web Crypto API (Edge Runtime compatible)
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  // 🔐 SECURITY: Strict Content Security Policy
  const isDevelopment = process.env.NODE_ENV === "development";

  // Development CSP: More permissive for hot reload and dev tools
  const devCSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}'`, // unsafe-eval needed for webpack HMR
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for CSS-in-JS libraries
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://eth-sepolia.g.alchemy.com https://*.walletconnect.com https://*.walletconnect.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Production CSP: Strict policy without unsafe-eval or unsafe-inline for scripts
  const prodCSP = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`, // Only nonce-based scripts allowed
    "style-src 'self' 'unsafe-inline'", // unsafe-inline still needed for Tailwind and styled components
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://eth-sepolia.g.alchemy.com https://*.walletconnect.com https://*.walletconnect.org https://*.infura.io",
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'", // Prevent base tag injection
    "form-action 'self'", // Prevent form hijacking
    "object-src 'none'", // Block plugins like Flash
    "upgrade-insecure-requests", // Force HTTPS
  ].join("; ");

  const csp = isDevelopment ? devCSP : prodCSP;

  // Set comprehensive security headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Pass nonce to the page for inline scripts
  // Note: In Next.js 15, nonces must be added to script tags manually or via _document.tsx
  response.headers.set("x-nonce", nonce);

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
