import type { Metadata } from "next";
import { Inter, Bree_Serif, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('vetted-ui-theme');
                  const root = document.documentElement;
                  let isDark = false;

                  if (!theme || theme === 'dark') {
                    isDark = true;
                  } else if (theme === 'light') {
                    isDark = false;
                  } else {
                    // system theme
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }

                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    root.style.backgroundColor = 'hsl(0 0% 4%)';
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
