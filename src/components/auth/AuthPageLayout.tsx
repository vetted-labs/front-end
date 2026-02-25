"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

interface AuthPageLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Max width class for the card container. Defaults to max-w-[440px]. */
  maxWidth?: string;
}

export function AuthPageLayout({
  title,
  subtitle,
  children,
  maxWidth = "max-w-[440px]",
}: AuthPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo onClick={() => router.push("/")} />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className={`w-full ${maxWidth} relative`}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
