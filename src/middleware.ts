// middleware.ts - Next.js middleware for security headers and CSP
import { NextRequest, NextResponse } from "next/server";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Generate nonce for CSP (cryptographically secure random value)
  // Using Web Crypto API (Edge Runtime compatible)
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  // 🔐 SECURITY: Strict Content Security Policy
  // Use strict NODE_ENV check - only "development" enables dev mode
  const isDevelopment = process.env.NODE_ENV === "development";

  // Shared RPC and wallet connect-src domains (centralized to avoid drift between dev/prod)
  const rpcConnectSrc = [
    "https://rpc.sepolia.org",
    "https://eth.llamarpc.com",
    "https://eth-sepolia.g.alchemy.com",
    "https://*.alchemy.com",
    "https://*.infura.io",
    "https://eth.merkle.io",
    // WalletConnect / Reown AppKit (used by RainbowKit getDefaultConfig).
    // NB: CSP wildcards do NOT match the root domain (e.g. `*.web3modal.org`
    // does not match `api.web3modal.org`), so each root must be listed
    // explicitly alongside the wildcard.
    "https://walletconnect.com",
    "https://*.walletconnect.com",
    "https://walletconnect.org",
    "https://*.walletconnect.org",
    "wss://*.walletconnect.com",
    "wss://*.walletconnect.org",
    "wss://relay.walletconnect.org",
    "https://api.web3modal.org",
    "https://*.web3modal.org",
    "https://*.web3modal.com",
    "https://*.reown.com",
    "https://pulse.walletconnect.org",
    "https://explorer-api.walletconnect.com",
    "https://verify.walletconnect.org",
    "https://relay.walletconnect.org",
    // Wallet provider endpoints
    "https://*.metamask.io",
    "https://*.cx.metamask.io",
    "https://polygon-rpc.com",
    "https://arb1.arbitrum.io",
    "https://*.drpc.org",
    "https://cca-lite.coinbase.com",
    "https://*.coinbase.com",
    "https://rpc.ankr.com",
    "https://*.publicnode.com",
  ].join(" ");

  // Development CSP: More permissive for hot reload and dev tools
  // Note: 'unsafe-inline' is used instead of nonce in dev to avoid hydration mismatches
  // and allow wallet SDK inline scripts (Coinbase, MetaMask) to work without nonces
  // Dev hosts: both `localhost` and `127.0.0.1` — CSP treats them as distinct
  // origins, and local tooling (anvil RPC, the e2e backend, `.env.local`
  // NEXT_PUBLIC_*_RPC_URL) routinely uses the `127.0.0.1` form. Allowing only
  // `localhost` silently CSP-blocks those connections in dev (e.g. the wagmi
  // chain client / headless E2E wallet talking to `http://127.0.0.1:8545`).
  const devHosts = "http://localhost:* http://127.0.0.1:*";
  const devWsHosts =
    "ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:*";
  const devCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline + unsafe-eval for dev compatibility
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com", // unsafe-inline needed for CSS-in-JS libraries
    `img-src 'self' data: https: blob: ${devHosts}`,
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com",
    `connect-src 'self' ${devHosts} ${devWsHosts} ${rpcConnectSrc}`,
    // frame-src allows the resume PDF iframes (`<iframe src="${API_BASE_URL}/uploads/resumes/...">`)
    // to load from the BE host. Without this, default-src 'self' blocks them
    // and the user sees "This content is blocked. Contact the site owner."
    `frame-src 'self' ${devHosts} https://*.up.railway.app blob: data:`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Note: no upgrade-insecure-requests in dev — it would upgrade http://localhost to https://localhost and break everything
  ].join("; ");

  // Production CSP: Use nonce-based script policy instead of unsafe-inline
  // Note: Next.js requires unsafe-inline for styles due to Tailwind/CSS injection
  const prodCSP = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, // Nonce-based for production security
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com", // unsafe-inline still needed for Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com",
    `connect-src 'self' https://*.up.railway.app ${rpcConnectSrc}`,
    // frame-src allows the resume PDF iframes (`<iframe src="${API_BASE_URL}/uploads/resumes/...">`)
    // to load from the BE host on Railway. Without this, default-src 'self'
    // blocks them and the user sees Chrome's "This content is blocked" placeholder.
    "frame-src 'self' https://*.up.railway.app blob: data:",
    "frame-ancestors 'none'", // Prevent clickjacking (this controls who can frame US)
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
