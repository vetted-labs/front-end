"use client";

import { useRef, ReactNode } from "react";
import { User, LogOut, ChevronDown, Wallet } from "lucide-react";
import { getNetworkName } from "@/lib/web3Utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

export interface UserMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface UserMenuProps {
  isAuthenticated: boolean;
  userType: string | null;
  userEmail: string | null;
  address?: string;
  chainId?: number;
  showUserMenu: boolean;
  onToggleMenu: () => void;
  onNavigateDashboard: () => void;
  onLogout: () => void;
  extraMenuItems?: UserMenuItem[];
}

export function UserMenu({
  isAuthenticated,
  userType,
  userEmail,
  address,
  chainId,
  showUserMenu,
  onToggleMenu,
  onNavigateDashboard,
  onLogout,
  extraMenuItems,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => { if (showUserMenu) onToggleMenu(); }, showUserMenu);

  if (!isAuthenticated) return null;

  return (
    <div className="relative user-menu-container" ref={menuRef}>
      {/* Trigger Button */}
      {userType === "expert" && address ? (
        // Expert wallet dropdown button
        <button
          onClick={onToggleMenu}
          className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-mono text-foreground font-medium">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {getNetworkName(chainId)}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        // Standard user dropdown button
        <button
          onClick={onToggleMenu}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            {address && !userEmail
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : userEmail || (userType === "company" ? "Company" : "Candidate")}
          </span>
        </button>
      )}

      {/* Dropdown Menu */}
      {showUserMenu && (
        <>
          {userType === "expert" && address ? (
            // Expert wallet dropdown menu
            <div className="absolute right-0 mt-2 w-72 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-foreground mb-2">
                  Connected Wallet
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-mono text-foreground break-all font-medium">
                    {address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-foreground">
                    Connected to{" "}
                    <span className="font-semibold">
                      {getNetworkName(chainId)}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={onNavigateDashboard}
                className="w-full flex items-center px-4 py-3 text-sm text-card-foreground hover:bg-muted transition-all"
              >
                <User className="w-4 h-4 mr-2" />
                Expert Dashboard
              </button>
              {extraMenuItems?.map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  className={`w-full flex items-center px-4 py-3 text-sm transition-all ${
                    item.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-card-foreground hover:bg-muted"
                  }`}
                >
                  <span className="w-4 h-4 mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Wallet
              </button>
            </div>
          ) : (
            // Standard user dropdown menu
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground font-mono">
                  {address && !userEmail
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : userEmail}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {userType === "company"
                    ? "Company Account"
                    : "Candidate Account"}
                </p>
              </div>
              <button
                onClick={onNavigateDashboard}
                className="w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {userType === "company" ? "Dashboard" : "My Profile"}
              </button>
              {extraMenuItems?.map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                    item.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-card-foreground hover:bg-muted"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
