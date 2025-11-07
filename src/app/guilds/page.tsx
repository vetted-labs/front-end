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
} from "lucide-react";
import { LoadingState, Alert } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { guildsApi } from "@/lib/api";

interface Guild {
  id: string;
  name: string;
  description: string;
  expertCount: number;
  candidateCount: number;
  totalMembers: number;
  openPositions: number;
  icon?: string;
  color?: string;
}

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
      icon: <Wallet className="w-6 h-6 text-violet-600" />,
      description: "Connect with your wallet",
    }
  );
};

export default function GlobalGuildsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
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
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail") || localStorage.getItem("companyEmail");
      if (email) setUserEmail(email);
    }
    fetchGuilds();
  }, []);

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        await connect({ connector });
        setShowWalletModal(false);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const handleDisconnect = () => {
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
        },
        {
          id: "Design",
          name: "Design",
          description: "Product designers, UX researchers, and creative professionals shaping user experiences",
          expertCount: 8,
          candidateCount: 32,
          totalMembers: 40,
          openPositions: 5,
        },
        {
          id: "Product",
          name: "Product",
          description: "Product managers and strategists driving innovation and business outcomes",
          expertCount: 6,
          candidateCount: 28,
          totalMembers: 34,
          openPositions: 4,
        },
        {
          id: "Marketing",
          name: "Marketing",
          description: "Growth marketers, brand strategists, and content creators amplifying impact",
          expertCount: 5,
          candidateCount: 22,
          totalMembers: 27,
          openPositions: 3,
        },
        {
          id: "Data Science",
          name: "Data Science",
          description: "Data scientists, ML engineers, and analysts turning data into insights",
          expertCount: 7,
          candidateCount: 25,
          totalMembers: 32,
          openPositions: 6,
        },
        {
          id: "Sales",
          name: "Sales",
          description: "Sales professionals, account executives, and business development experts",
          expertCount: 4,
          candidateCount: 18,
          totalMembers: 22,
          openPositions: 2,
        },
      ];
      setGuilds(mockGuilds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyEmail");
    setIsAuthenticated(false);
    setUserEmail("");
    setShowUserMenu(false);
    router.push("/?section=guilds");
  };

  const getGuildColor = (index: number) => {
    const colors = [
      "from-violet-500 to-indigo-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-green-600",
      "from-amber-500 to-orange-600",
      "from-pink-500 to-rose-600",
      "from-purple-500 to-fuchsia-600",
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return <LoadingState message="Loading guilds..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-foreground">Vetted</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                      {userEmail}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{userEmail}</p>
                      </div>
                      <button
                        onClick={() => router.push("/browse/jobs")}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        Browse Jobs
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-4">Guilds</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Professional communities where experts vet candidates and companies find pre-qualified talent
            </p>
          </div>
        </div>
      </div>

      {/* What are Guilds Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-2xl p-8 mb-12 border-2 border-violet-200 dark:border-violet-800">
          <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            What are Guilds?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-muted-foreground">
            <div>
              <p className="text-lg leading-relaxed mb-4">
                Guilds are professional communities organized by skill domain, where industry experts
                review and endorse candidates based on their expertise.
              </p>
              <p className="text-lg leading-relaxed">
                Each guild maintains high standards through a decentralized review process, ensuring
                companies only connect with pre-vetted, qualified talent.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Expert-Led Vetting</p>
                  <p className="text-sm">Experienced professionals review and endorse candidates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Quality Assurance</p>
                  <p className="text-sm">High standards maintained through reputation staking</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Exclusive Access</p>
                  <p className="text-sm">Members get access to curated job opportunities</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">DAO Governance</p>
                  <p className="text-sm">Sub-guilds managed by decentralized autonomous organizations</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-3">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {guilds.length}
            </p>
            <p className="text-sm text-muted-foreground">Active Guilds</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.expertCount || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Expert Reviewers</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.totalMembers || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.openPositions || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Open Positions</p>
          </div>
        </div>

        {/* All Guilds */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-8">All Guilds</h2>

          {error && (
            <Alert variant="error" className="mb-6">{error}</Alert>
          )}

          {guilds.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guilds.map((guild, index) => (
                <button
                  key={guild.id}
                  onClick={() => router.push(`/guilds/${guild.id}`)}
                  className="bg-card rounded-xl p-6 shadow-sm border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${getGuildColor(index)} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {guild.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {guild.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{guild.expertCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Experts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{guild.totalMembers || guild.candidateCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{guild.openPositions || 0}</p>
                      <p className="text-xs text-muted-foreground">Jobs</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No guilds available yet</p>
              <p className="text-sm text-muted-foreground">Check back soon for new professional communities</p>
            </div>
          )}
        </div>

        {/* How to Join Section */}
        <div className="mt-12 bg-card rounded-xl p-8 shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            How to Join a Guild
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Choose Your Guild</h3>
              <p className="text-sm text-muted-foreground">
                Browse guilds and select one that matches your expertise
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Submit Application</h3>
              <p className="text-sm text-muted-foreground">
                Complete the guild's custom application form
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Get Vetted</h3>
              <p className="text-sm text-muted-foreground">
                Expert members review and endorse your application
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
