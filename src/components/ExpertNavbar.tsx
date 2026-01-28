"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccount, useDisconnect, useChainId } from "wagmi";
import Image from "next/image";
import {
  Wallet,
  LogOut,
  ChevronDown,
  Home,
  Users,
  User,
  Bell,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBadge } from "./notifications/NotificationBadge";
import { expertApi, notificationsApi, calculateTotalPoints } from "@/lib/api";

const getNetworkName = (chainId: number | undefined) => {
  if (!chainId) return "Unknown";
  const networks: Record<number, string> = {
    1: "Ethereum",
    11155111: "Sepolia",
    137: "Polygon",
    42161: "Arbitrum",
  };
  return networks[chainId] || `Chain ${chainId}`;
};

interface ExpertNavbarProps {
  title?: string;
  showBackButton?: boolean;
}

export function ExpertNavbar({ title, showBackButton = false }: ExpertNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch profile data for total points
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;

      try {
        const result: any = await expertApi.getProfile(address);
        const data = result.data || result;

        setProfile(data);
        setTotalPoints(calculateTotalPoints(data));
      } catch (error) {
        console.error("Failed to fetch profile for navbar:", error);
      }
    };

    if (isConnected && address) {
      fetchProfile();
    }
  }, [isConnected, address]);

  // Fetch unread notification count with auto-refresh every 30 seconds
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!address) return;

      try {
        const result: any = await notificationsApi.getUnreadCount(address);
        const count = result?.data?.count || result?.count || 0;
        setNotificationCount(count);
      } catch (error) {
        console.error("Failed to fetch unread notification count:", error);
      }
    };

    if (isConnected && address) {
      fetchUnreadCount();

      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  // Close wallet menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showWalletMenu && !target.closest('[data-wallet-menu]')) {
        setShowWalletMenu(false);
      }
    };

    if (showWalletMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showWalletMenu]);

  const handleDisconnect = () => {
    disconnect();
    router.push("/?section=experts");
  };

  const navItems = [
    { path: "/expert/dashboard", label: "Dashboard", icon: Home },
    { path: "/expert/guilds", label: "Guilds", icon: Users },
    { path: "/expert/profile", label: "My Profile", icon: User },
    { path: "/expert/notifications", label: "Notifications", icon: Bell, badge: notificationCount },
  ];

  return (
    <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <NotificationBadge count={item.badge} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {/* Total Points Badge */}
            {mounted && profile && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                <span className="text-sm font-semibold text-primary">Total Points</span>
                <span className="text-lg font-bold text-foreground">{totalPoints.toLocaleString()}</span>
              </div>
            )}
            {/* Wallet Menu */}
            {mounted && address && (
              <div className="relative" data-wallet-menu>
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden lg:block text-xs font-mono text-foreground font-medium">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {showWalletMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50">
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3 border-b border-border">
                      <p className="text-xs font-medium text-foreground mb-2">Connected Wallet</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm font-mono text-foreground break-all font-medium">{address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-foreground">
                          Connected to <span className="font-semibold">{getNetworkName(chainId)}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowWalletMenu(false);
                        handleDisconnect();
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
