"use client";

import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Building2, type LucideIcon } from "lucide-react";
import { VettedIcon, type VettedIconName } from "@/components/ui/vetted-icon";
import { useRouter, usePathname } from "next/navigation";

interface HomeNavbarProps {
  isAuthenticated: boolean;
  userType: string | null;
  userEmail: string | null;
  address?: string;
  chainId?: number;
  showUserMenu: boolean;
  onToggleMenu: () => void;
  onFindJob: () => void;
  onStartVetting: () => void;
  onStartHiring: () => void;
  onViewGuilds: () => void;
  onNavigateDashboard: () => void;
  onLogout: () => void;
  onLogoClick: () => void;
}

export function HomeNavbar({
  isAuthenticated,
  userType,
  userEmail,
  address,
  chainId,
  showUserMenu,
  onToggleMenu,
  onFindJob,
  onStartVetting,
  onStartHiring,
  onViewGuilds,
  onNavigateDashboard,
  onLogout,
  onLogoClick,
}: HomeNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: { label: string; icon: LucideIcon | VettedIconName; onClick: () => void }[] = [
    { label: "Find Jobs", icon: "job", onClick: onFindJob },
    { label: "Start Vetting", icon: "vetting", onClick: onStartVetting },
    { label: "Start Hiring", icon: Building2, onClick: onStartHiring },
    { label: "Guilds", icon: "guilds", onClick: onViewGuilds },
  ];

  return (
    <nav className="border-b bg-card sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Logo onClick={onLogoClick} />

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item, index) => {
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {typeof item.icon === "string" ? (
                      <VettedIcon name={item.icon as VettedIconName} className="w-4 h-4" />
                    ) : (
                      <item.icon className="w-4 h-4" />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <UserMenu
              isAuthenticated={isAuthenticated}
              userType={userType}
              userEmail={userEmail}
              address={address}
              chainId={chainId}
              showUserMenu={showUserMenu}
              onToggleMenu={onToggleMenu}
              onNavigateDashboard={onNavigateDashboard}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
