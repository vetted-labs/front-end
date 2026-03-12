"use client";

import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { LogOut, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthContext } from "@/hooks/useAuthContext";
import { truncateAddress } from "@/lib/utils";

export function PendingExpertShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const auth = useAuthContext();

  const handleDisconnect = () => {
    auth.logout();
    disconnect();
    router.push("/?section=experts");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border/50 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo onClick={() => router.push("/")} />
            <div className="flex items-center gap-3">
              {address && (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono text-foreground">
                    {truncateAddress(address)}
                  </span>
                </div>
              )}
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
                title="Disconnect Wallet"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 content-gradient">
        {children}
      </main>
    </div>
  );
}
