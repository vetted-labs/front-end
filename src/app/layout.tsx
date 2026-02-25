import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Bree_Serif, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
});

const breeSerif = Bree_Serif({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-serif',
  display: 'swap',
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: "Vetted",
  description: "Decentralized Hiring Platform",
  icons: {
    icon: "/Vetted-orange.png",
    apple: "/Vetted-orange.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  // Only use nonce in production — dev uses 'unsafe-inline' CSP to avoid hydration mismatches
  const nonce = process.env.NODE_ENV === 'production' ? (headersList.get('x-nonce') || '') : '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className={`${inter.variable} ${breeSerif.variable} ${bricolageGrotesque.variable} font-sans`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
