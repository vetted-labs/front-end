import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

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

                  if (theme === 'dark') {
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
                    root.style.backgroundColor = 'hsl(215, 25%, 10%)';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                    root.style.backgroundColor = 'hsl(0, 0%, 100%)';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
