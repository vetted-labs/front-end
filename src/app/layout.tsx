import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bree_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const breeSerif = Bree_Serif({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Vetted",
  description: "Decentralized Hiring Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  // Only use nonce in production — dev uses 'unsafe-inline' CSP to avoid hydration mismatches
  const nonce = process.env.NODE_ENV === 'production' ? (headersList.get('x-nonce') || '') : '';

  // Forward the request cookie to <Providers> (client component) so it can
  // hydrate wagmi's initial state via cookieToInitialState(). We can't call
  // cookieToInitialState here because doing so would require importing the
  // wagmi config, which transitively imports RainbowKit's getDefaultConfig
  // — a client-only module that cannot be executed in a server component.
  const cookieHeader = headersList.get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        <script
          {...(nonce ? { nonce } : {})}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('vetted-ui-theme');
                  var root = document.documentElement;
                  var isDark = false;

                  if (!theme || theme === 'dark') {
                    isDark = true;
                  } else if (theme === 'light') {
                    isDark = false;
                  } else {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }

                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    root.style.backgroundColor = 'hsl(225 12% 6%)';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                    root.style.backgroundColor = 'hsl(30, 40%, 98%)';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${breeSerif.variable} font-sans`}>
        <ErrorBoundary>
          <Providers cookieHeader={cookieHeader}>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
