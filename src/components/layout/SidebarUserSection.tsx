"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect, useChainId } from "wagmi";
import { User, LogOut, Wallet, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useSidebar } from "./SidebarProvider";
import { expertApi } from "@/lib/api";
import { calculateTotalPoints, truncateAddress } from "@/lib/utils";
import { getNetworkName } from "@/lib/web3Utils";
import { cn } from "@/lib/utils";
import type { SidebarConfig } from "./sidebar-config";

interface SidebarUserSectionProps {
  variant: SidebarConfig["variant"];
}

export function SidebarUserSection({ variant }: SidebarUserSectionProps) {
  const router = useRouter();
  const auth = useAuthContext();
  const { isCollapsed } = useSidebar();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch expert points
  useEffect(() => {
    if (variant !== "expert" || !isConnected || !address) return;
    expertApi
      .getProfile(address)
      .then((data) => setTotalPoints(calculateTotalPoints(data)))
      .catch(() => {});
  }, [variant, isConnected, address]);

  // Close wallet menu on outside click
  useEffect(() => {
    if (!showWalletMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-sidebar-wallet]"))
        setShowWalletMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showWalletMenu]);

  const handleDisconnect = () => {
    auth.logout();
    disconnect();
    router.push("/?section=experts");
  };

  const handleLogout = () => {
    auth.logout();
    router.push("/");
  };

  if (!mounted) return null;

  // ── Expert bottom section ──
  if (variant === "expert") {
    return (
      <div className="border-t border-border px-3 py-3 space-y-2">
        {/* Profile link */}
        <button
          onClick={() => router.push("/expert/profile")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>My Profile</span>}
        </button>

        {/* Total points */}
        {!isCollapsed && totalPoints > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-xs font-semibold text-primary">Total Points</span>
            <span className="text-sm font-bold text-foreground">
              {totalPoints.toLocaleString()}
            </span>
          </div>
        )}

        {/* Wallet */}
        {address && (
          <div className="relative" data-sidebar-wallet>
            <button
              onClick={() => setShowWalletMenu((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 hover:border-primary/50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              {!isCollapsed && (
                <>
                  <span className="text-xs font-mono text-foreground truncate">
                    {truncateAddress(address)}
                  </span>
                  <ChevronDown className="ml-auto h-3 w-3 text-muted-foreground" />
                </>
              )}
            </button>

            {showWalletMenu && (
              <div
                className={cn(
                  "absolute z-50 w-64 rounded-xl border border-border bg-card shadow-xl overflow-hidden dark:bg-card/80 dark:backdrop-blur-2xl dark:border-white/[0.08]",
                  isCollapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2"
                )}
              >
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3 border-b border-border">
                  <p className="text-xs font-medium text-foreground mb-1">
                    Connected Wallet
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {address}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] text-muted-foreground">
                      {getNetworkName(chainId)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWalletMenu(false);
                    handleDisconnect();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <div className={cn("flex", isCollapsed ? "justify-center" : "px-1")}>
          <ThemeToggle />
        </div>
      </div>
    );
  }

  // ── Company bottom section ──
  if (variant === "company") {
    return (
      <div className="border-t border-border px-3 py-3 space-y-2">
        {/* Profile link */}
        <button
          onClick={() => router.push("/dashboard")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </button>

        {/* User card */}
        {!isCollapsed && auth.email && (
          <div className="rounded-lg bg-muted px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Hiring Manager
            </p>
            <p className="truncate text-xs text-muted-foreground">{auth.email}</p>
          </div>
        )}

        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-1")}>
          <ThemeToggle />
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }

  // ── Candidate bottom section ──
  if (variant === "candidate") {
    return (
      <div className="border-t border-border px-3 py-3 space-y-2">
        {/* Profile link */}
        <button
          onClick={() => router.push("/candidate/profile")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>My Profile</span>}
        </button>

        {/* User card */}
        {!isCollapsed && auth.email && (
          <div className="rounded-lg bg-muted px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Candidate
            </p>
            <p className="truncate text-xs text-muted-foreground">{auth.email}</p>
          </div>
        )}

        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-1")}>
          <ThemeToggle />
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-destructive hover:bg-destructive/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }

  // ── Browse bottom section ──
  const userTypeLabel = auth.userType === "candidate"
    ? "Candidate"
    : auth.userType === "company"
    ? "Hiring Manager"
    : auth.userType === "expert"
    ? "Expert"
    : null;

  const profileHref = auth.userType === "candidate"
    ? "/candidate/profile"
    : auth.userType === "company"
    ? "/dashboard"
    : auth.userType === "expert"
    ? "/expert/dashboard"
    : null;

  return (
    <div className="border-t border-border px-3 py-3 space-y-2">
      {auth.isAuthenticated ? (
        <>
          {!isCollapsed && (
            <div className="rounded-lg bg-muted px-3 py-2 space-y-1">
              {userTypeLabel && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {userTypeLabel}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {auth.email || (address ? truncateAddress(address) : "Signed in")}
              </p>
            </div>
          )}
          {profileHref && (
            <button
              onClick={() => router.push(profileHref)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                isCollapsed && "justify-center px-2"
              )}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>My Profile</span>}
            </button>
          )}
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-1")}>
            <ThemeToggle />
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </>
      ) : (
        <>
          {!isCollapsed ? (
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-[hsl(var(--gradient-button-text))] hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-primary hover:bg-primary/10 transition-colors"
              title="Sign In"
            >
              <User className="h-5 w-5" />
            </button>
          )}
          <div className={cn("flex", isCollapsed ? "justify-center" : "px-1")}>
            <ThemeToggle />
          </div>
        </>
      )}
    </div>
  );
}
