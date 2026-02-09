"use client";
import Image from "next/image";
import { useEffect, useState, ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Shield,
  Users,
  Award,
  Briefcase,
  TrendingUp,
  Star,
  ArrowRight,
  CheckCircle2,
  Target,
  Zap,
  Globe,
  User,
  LogOut,
  Wallet,
  ChevronDown,
  Code2,
  Palette,
  Package,
  Megaphone,
  BarChart3,
  Handshake,
  Settings,
  Calculator,
  UserPlus,
  Scale,
  Swords,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
} from "lucide-react";
import { LoadingState, Alert } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { guildsApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";
import { GuildCard } from "@/components/GuildCard";
import { getGuildDetailedInfo } from "@/lib/guildHelpers";

interface Guild {
  id: string;
  name: string;
  description: string;
  expertCount: number;
  candidateCount: number;
  totalMembers: number;
  openPositions: number;
  totalProposalsReviewed: number;
  icon?: string;
  color?: string;
}

// Network name helper
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

// Get guild icon based on guild name
const getGuildIcon = (guildName: string) => {
  const name = guildName.toLowerCase();

  if (name.includes('engineering') || name.includes('technology')) {
    return Code2;
  } else if (name.includes('design') || name.includes('ux')) {
    return Palette;
  } else if (name.includes('product')) {
    return Package;
  } else if (name.includes('marketing') || name.includes('growth')) {
    return Megaphone;
  } else if (name.includes('data') || name.includes('analytics')) {
    return BarChart3;
  } else if (name.includes('sales') || name.includes('business')) {
    return Handshake;
  } else if (name.includes('operations') || name.includes('strategy')) {
    return Settings;
  } else if (name.includes('finance') || name.includes('accounting')) {
    return Calculator;
  } else if (name.includes('people') || name.includes('hr')) {
    return UserPlus;
  } else if (name.includes('legal') || name.includes('compliance')) {
    return Scale;
  }

  return Shield; // Default fallback
};

// Wallet information helper
const getWalletInfo = (walletName: string) => {
  const wallets: Record<string, { icon: ReactElement; description: string }> = {
    MetaMask: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M36.5 3.5L22 13.5L24.5 7.5L36.5 3.5Z" fill="#E17726" stroke="#E17726" />
          <path d="M3.5 3.5L17.8 13.6L15.5 7.5L3.5 3.5Z" fill="#E27625" stroke="#E27625" />
        </svg>
      ),
      description: "Connect using MetaMask browser extension",
    },
    "Coinbase Wallet": {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0052FF" />
        </svg>
      ),
      description: "Connect using Coinbase Wallet app",
    },
  };

  return (
    wallets[walletName] || {
      icon: <Wallet className="w-6 h-6 text-primary" />,
      description: "Connect with your wallet",
    }
  );
};

export default function GlobalGuildsPage() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const guildsPerPage = 6;

  useEffect(() => {
    setMounted(true);

    // Restore scroll position when coming back to this page
    const savedScrollPosition = sessionStorage.getItem('guildsScrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem('guildsScrollPosition');
      }, 100);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token || isConnected) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail") || localStorage.getItem("companyEmail") || address || "";
      if (email) setUserEmail(email);
    }
    fetchGuilds();
  }, [isConnected, address]);

  // Close wallet menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('[data-wallet-menu]')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        clearAllAuthState();
        await connect({ connector });
        setShowWalletModal(false);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const handleDisconnect = () => {
    clearAllAuthState();
    disconnect();
    router.push("/?section=guilds");
  };

  const fetchGuilds = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const guildsData: any = await guildsApi.getAll();
      setGuilds(guildsData);
    } catch (err) {
      console.error("[Guilds Page] Error:", err);
      // Use mock data if backend isn't ready
      const mockGuilds: Guild[] = [
        {
          id: "Engineering",
          name: "Engineering",
          description: "Software engineers, architects, and technical leaders building the future of technology",
          expertCount: 12,
          candidateCount: 45,
          totalMembers: 57,
          openPositions: 8,
          totalProposalsReviewed: 342,
        },
        {
          id: "Design",
          name: "Design",
          description: "Product designers, UX researchers, and creative professionals shaping user experiences",
          expertCount: 8,
          candidateCount: 32,
          totalMembers: 40,
          openPositions: 5,
          totalProposalsReviewed: 198,
        },
        {
          id: "Product",
          name: "Product",
          description: "Product managers and strategists driving innovation and business outcomes",
          expertCount: 6,
          candidateCount: 28,
          totalMembers: 34,
          openPositions: 4,
          totalProposalsReviewed: 156,
        },
        {
          id: "Marketing",
          name: "Marketing",
          description: "Growth marketers, brand strategists, and content creators amplifying impact",
          expertCount: 5,
          candidateCount: 22,
          totalMembers: 27,
          openPositions: 3,
          totalProposalsReviewed: 124,
        },
        {
          id: "Data Science",
          name: "Data Science",
          description: "Data scientists, ML engineers, and analysts turning data into insights",
          expertCount: 7,
          candidateCount: 25,
          totalMembers: 32,
          openPositions: 6,
          totalProposalsReviewed: 187,
        },
        {
          id: "Sales",
          name: "Sales",
          description: "Sales professionals, account executives, and business development experts",
          expertCount: 4,
          candidateCount: 18,
          totalMembers: 22,
          openPositions: 2,
          totalProposalsReviewed: 89,
        },
      ];
      setGuilds(mockGuilds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAllAuthState();
    disconnect();
    setIsAuthenticated(false);
    setUserEmail("");
    setShowUserMenu(false);
    router.push("/?section=guilds");
  };

  const handleInfoClick = (guildId: string) => {
    setOpenTooltipId(openTooltipId === guildId ? null : guildId);
  };

  const closeTooltip = () => {
    setOpenTooltipId(null);
  };

  // Get guild color based on guild name (consistent colors)
  const getGuildColor = (guildName: string) => {
    const name = guildName.toLowerCase();

    if (name.includes('engineering') || name.includes('technology')) {
      return 'from-primary to-accent';
    } else if (name.includes('design') || name.includes('ux')) {
      return 'from-pink-500 to-rose-600';
    } else if (name.includes('product')) {
      return 'from-purple-500 to-fuchsia-600';
    } else if (name.includes('marketing') || name.includes('growth')) {
      return 'from-amber-500 to-orange-600';
    } else if (name.includes('data') || name.includes('analytics')) {
      return 'from-blue-500 to-cyan-600';
    } else if (name.includes('sales') || name.includes('business')) {
      return 'from-emerald-500 to-green-600';
    } else if (name.includes('operations') || name.includes('strategy')) {
      return 'from-slate-500 to-gray-600';
    } else if (name.includes('finance') || name.includes('accounting')) {
      return 'from-teal-500 to-cyan-600';
    } else if (name.includes('people') || name.includes('hr')) {
      return 'from-indigo-500 to-blue-600';
    } else if (name.includes('legal') || name.includes('compliance')) {
      return 'from-stone-600 to-neutral-700';
    }

    return 'from-primary to-accent'; // Default fallback
  };

  if (isLoading) {
    return <LoadingState message="Loading guilds..." />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07080c] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-96 w-96 rounded-full bg-amber-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#07080c] via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f1a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push("/")}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-semibold text-slate-100">Vetted</span>
              </button>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => router.push("/browse/jobs")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Find Jobs
                </button>
                <button
                  onClick={() => router.push("/expert/apply")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all"
                >
                  <Award className="w-4 h-4" />
                  Start Vetting
                </button>
                <button
                  onClick={() => router.push("/auth/signup?type=company")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Start Hiring
                </button>
                <button
                  onClick={() => router.push("/guilds")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white/10 text-amber-100 border border-amber-400/30 transition-all shadow-[0_0_20px_rgba(251,146,60,0.18)]"
                >
                  <Swords className="w-4 h-4" />
                  Guilds
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated && mounted && address ? (
                <div className="relative" data-wallet-menu>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:border-orange-400/40 hover:bg-white/10 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                  >
                    <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-400/20">
                      <Wallet className="w-4 h-4 text-amber-200" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-mono text-slate-100 font-medium">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {getNetworkName(chainId)}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border border-white/10 bg-[#0b0f1a] overflow-hidden z-50">
                      <div className="bg-gradient-to-r from-orange-500/10 via-white/5 to-amber-500/10 px-4 py-3 border-b border-white/10">
                        <p className="text-xs font-medium text-slate-400 mb-2">Connected Wallet</p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-orange-400/20">
                            <Wallet className="w-4 h-4 text-amber-200" />
                          </div>
                          <p className="text-sm font-mono text-slate-100 break-all font-medium">{address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-slate-200">
                            Connected to <span className="font-semibold">{getNetworkName(chainId)}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push("/browse/jobs")}
                        className="w-full flex items-center px-4 py-3 text-sm text-slate-100 hover:bg-white/5 transition-all"
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Browse Jobs
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleDisconnect();
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 transition-all"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect Wallet
                      </button>
                    </div>
                  )}
                </div>
              ) : isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-400/20">
                      <User className="w-4 h-4 text-amber-200" />
                    </div>
                    <span className="text-sm font-medium text-slate-100 hidden sm:block">
                      {userEmail}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl border border-white/10 bg-[#0b0f1a] py-1 z-50">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-medium text-slate-100">{userEmail}</p>
                      </div>
                      <button
                        onClick={() => router.push("/browse/jobs")}
                        className="w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        Browse Jobs
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push("/auth/login?type=candidate")}
                  className="px-4 py-2 text-sm font-semibold text-slate-900 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 rounded-lg hover:opacity-90 transition-all shadow-[0_12px_30px_rgba(251,146,60,0.25)]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.22),transparent_60%)]" />
        <div className="absolute -bottom-20 left-1/2 h-40 w-96 -translate-x-1/2 bg-amber-500/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.3em] text-amber-200/90 mb-6">
              Noble Protocol Guilds
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold mb-4 bg-gradient-to-r from-amber-200 via-orange-200 to-amber-100 bg-clip-text text-transparent">
              Guilds
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
              Elite communities where vetted experts stake reputation, curate talent, and steer the frontier of crypto work.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Global Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 mb-3">
              <Shield className="w-6 h-6 text-amber-200" />
            </div>
            <p className="text-3xl font-semibold text-slate-100 mb-1">
              {guilds.length}
            </p>
            <p className="text-sm text-slate-400 font-medium">Active Guilds</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 mb-3">
              <Award className="w-6 h-6 text-amber-200" />
            </div>
            <p className="text-3xl font-semibold text-slate-100 mb-1">
              {guilds.reduce((sum, g) => sum + (g.expertCount || 0), 0)}
            </p>
            <p className="text-sm text-slate-400 font-medium">Expert Reviewers</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 mb-3">
              <Users className="w-6 h-6 text-amber-200" />
            </div>
            <p className="text-3xl font-semibold text-slate-100 mb-1">
              {guilds.reduce((sum, g) => sum + (g.totalMembers || 0), 0)}
            </p>
            <p className="text-sm text-slate-400 font-medium">Total Members</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 mb-3">
              <Briefcase className="w-6 h-6 text-amber-200" />
            </div>
            <p className="text-3xl font-semibold text-slate-100 mb-1">
              {guilds.reduce((sum, g) => sum + (g.openPositions || 0), 0)}
            </p>
            <p className="text-sm text-slate-400 font-medium">Open Positions</p>
          </div>
        </div>

        {/* All Guilds */}
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-100 mb-8 font-serif">
            All Guilds
          </h2>

          {error && (
            <Alert variant="error" className="mb-6">{error}</Alert>
          )}

          {guilds.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const indexOfLastGuild = currentPage * guildsPerPage;
                  const indexOfFirstGuild = indexOfLastGuild - guildsPerPage;
                  const currentGuilds = guilds.slice(indexOfFirstGuild, indexOfLastGuild);

                  return currentGuilds.map((guild) => {
                    return (
                      <GuildCard
                        key={guild.id}
                        guild={{
                          id: guild.id,
                          name: guild.name,
                          description: guild.description,
                          memberCount: guild.totalMembers || guild.candidateCount || 0,
                          expertCount: guild.expertCount,
                          jobCount: guild.openPositions,
                          totalProposalsReviewed: guild.totalProposalsReviewed,
                        }}
                        variant="browse"
                        onViewDetails={(guildId) => {
                          sessionStorage.setItem('guildsScrollPosition', window.scrollY.toString());
                          router.push(`/guilds/${guildId}`);
                        }}
                        showDescription={true}
                      />
                    );
                  });
                })()}
              </div>

              {/* Pagination Controls */}
              {guilds.length > guildsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.ceil(guilds.length / guildsPerPage) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 text-slate-900 shadow-[0_12px_30px_rgba(251,146,60,0.25)]'
                            : 'border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(guilds.length / guildsPerPage)))}
                    disabled={currentPage === Math.ceil(guilds.length / guildsPerPage)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/[0.03]">
              <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-60" />
              <p className="text-lg text-slate-300 mb-2">No guilds available yet</p>
              <p className="text-sm text-slate-400">Check back soon for new professional communities</p>
            </div>
          )}
        </div>

        {/* Mobile tooltip modal */}
        {openTooltipId && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/50" onClick={closeTooltip} />
            <div className="relative rounded-t-2xl p-6 w-full max-h-[80vh] overflow-y-auto border border-white/10 bg-[#0b0f1a]">
              <button onClick={closeTooltip} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-300" />
              </button>
              {(() => {
                const guild = guilds.find(g => g.id === openTooltipId);
                if (!guild) return null;
                const GuildIcon = getGuildIcon(guild.name);
                const detailedInfo = getGuildDetailedInfo(guild.name);
                return (
                  <>
                    <div className="flex items-start gap-3 mb-4 pr-8">
                      <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                        <GuildIcon className="w-6 h-6 text-cyan-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-100 mb-1">{guild.name}</h3>
                        <p className="text-sm text-cyan-200 font-medium">{detailedInfo.focus}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {detailedInfo.details}
                      </p>
                    </div>

                    <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs font-semibold text-slate-100 mb-2">Common Roles:</p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {detailedInfo.examples}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-slate-100 mb-1">{guild.expertCount}</p>
                        <p className="text-xs text-slate-400">Expert Reviewers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-slate-100 mb-1">{guild.totalMembers}</p>
                        <p className="text-xs text-slate-400">Total Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-slate-100 mb-1">{guild.openPositions}</p>
                        <p className="text-xs text-slate-400">Open Positions</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
