"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import {
  Shield,
  TrendingUp,
  ArrowRight,
  Star,
  Coins,
  LogOut,
  Wallet,
  Bell,
  Clock,
  CheckCircle,
  FileText,
  DollarSign,
  Users,
  Award,
  Zap,
  Activity,
  ChevronDown,
} from "lucide-react";
import { Alert } from "./ui/Alert";
import { LoadingState } from "./ui/LoadingState";
import Image from "next/image";

interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: "recruit" | "craftsman" | "master";
  reputation: number;
  totalEarnings: number;
  pendingProposals: number;
  ongoingProposals: number;
  closedProposals: number;
}

interface RecentActivity {
  id: string;
  type: "proposal_vote" | "endorsement" | "earning" | "reputation_gain";
  description: string;
  timestamp: string;
  guildName: string;
  amount?: number;
}

interface ExpertProfile {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  reputation: number;
  totalEarnings: number;
  guilds: Guild[];
  recentActivity: RecentActivity[];
  pendingTasks: {
    pendingProposalsCount: number;
    unreviewedApplicationsCount: number;
  };
}

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchExpertProfile();
    } else if (!isDisconnecting) {
      // Only redirect if not intentionally disconnecting
      router.push("/expert");
    }
  }, [isConnected, address, isDisconnecting]);

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

  const fetchExpertProfile = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/api/experts/profile?wallet=${address}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Expert profile not found. Please apply first.");
        }
        throw new Error("Failed to fetch profile");
      }

      const result = await response.json();
      const data = result.data || result; // Handle both wrapped and unwrapped responses

      // Ensure guilds is an array
      const guilds = Array.isArray(data.guilds) ? data.guilds : [];

      // Add mock recent activity and pending tasks for now
      // TODO: These should come from the backend
      const enhancedData = {
        ...data,
        guilds: guilds,
        recentActivity: [
          {
            id: "1",
            type: "proposal_vote",
            description: "Voted on candidate proposal for Senior Engineer",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            guildName: "Engineering & Technology",
          },
          {
            id: "2",
            type: "endorsement",
            description: "Endorsed candidate for Product Manager role",
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            guildName: "Product Management",
          },
          {
            id: "3",
            type: "earning",
            description: "Earned 50 points from aligned proposal vote",
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            guildName: "Engineering & Technology",
            amount: 50,
          },
        ],
        pendingTasks: {
          pendingProposalsCount: guilds.reduce((sum: number, g: Guild) => sum + g.pendingProposals, 0),
          unreviewedApplicationsCount: 0, // TODO: Add to backend
        },
      };

      setProfile(enhancedData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  const handleDisconnect = () => {
    setIsDisconnecting(true);
    disconnect();
    // Navigate to main homepage instead of expert page
    router.push("/");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "proposal_vote":
        return <FileText className="w-4 h-4" />;
      case "endorsement":
        return <Award className="w-4 h-4" />;
      case "earning":
        return <Coins className="w-4 h-4" />;
      case "reputation_gain":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "proposal_vote":
        return "bg-blue-100 text-blue-600";
      case "endorsement":
        return "bg-purple-100 text-purple-600";
      case "earning":
        return "bg-green-100 text-green-600";
      case "reputation_gain":
        return "bg-violet-100 text-violet-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Don't show any UI if disconnecting - just navigate away
  if (isDisconnecting) {
    return null;
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert type="warning">
          Please connect your wallet to access the expert dashboard.
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading your expert dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.push("/expert/apply")}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
          >
            Apply as Expert
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert type="error">No profile data available</Alert>
      </div>
    );
  }

  const totalPendingProposals = (profile.guilds || []).reduce((sum, g) => sum + (g.pendingProposals || 0), 0);
  const totalOngoingProposals = (profile.guilds || []).reduce((sum, g) => sum + (g.ongoingProposals || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-900">Vetted</span>
              <span className="text-sm font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/expert/leaderboard")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-all"
              >
                <Award className="w-4 h-4" />
                Leaderboard
              </button>
              <button className="relative p-2 text-slate-600 hover:text-slate-900 transition-all">
                <Bell className="w-5 h-5" />
                {totalPendingProposals > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              {mounted && address && (
                <div className="relative" data-wallet-menu>
                  <button
                    onClick={() => setShowWalletMenu(!showWalletMenu)}
                    className="flex items-center px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-200 hover:border-violet-300 transition-all"
                  >
                    <Wallet className="w-4 h-4 text-violet-600 mr-2" />
                    <span className="text-xs font-mono text-violet-700">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <ChevronDown className="w-4 h-4 text-violet-600 ml-2" />
                  </button>

                  {showWalletMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Connected Wallet</p>
                        <p className="text-sm font-mono text-slate-900 break-all">{address}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowWalletMenu(false);
                          handleDisconnect();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {profile.fullName}!
          </h1>
          <p className="text-slate-600">
            Here's your expert activity overview
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-violet-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Reputation Score</p>
            <p className="text-3xl font-bold text-slate-900">{profile.reputation}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-slate-900">
              ${profile.totalEarnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Guild Memberships</p>
            <p className="text-3xl font-bold text-slate-900">{profile.guilds.length}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              {totalPendingProposals > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                  Action Needed
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">Pending Actions</p>
            <p className="text-3xl font-bold text-slate-900">{totalPendingProposals}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Main Content - Guilds */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            {totalPendingProposals > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      <Zap className="w-5 h-5 inline mr-2 text-yellow-600" />
                      Pending Proposals
                    </h3>
                    <p className="text-sm text-slate-600">
                      {totalPendingProposals} proposal{totalPendingProposals !== 1 ? 's' : ''} waiting for your review
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {profile.guilds.filter(g => g.pendingProposals > 0).map(guild => (
                    <button
                      key={guild.id}
                      onClick={() => handleGuildClick(guild.id)}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 transition-all"
                    >
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{guild.name}</p>
                        <p className="text-sm text-slate-600">
                          {guild.pendingProposals} pending proposal{guild.pendingProposals !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Guilds Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Your Guilds</h2>
              </div>

              {profile.guilds.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    No Guild Memberships Yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Your application is under review. You'll be added to a guild once approved.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.guilds.map((guild) => (
                    <div
                      key={guild.id}
                      onClick={() => handleGuildClick(guild.id)}
                      className="p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-violet-600 transition-colors">
                            {guild.name}
                          </h3>
                          <p className="text-xs text-slate-500 capitalize">
                            {guild.expertRole} • {guild.memberCount} members
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <p className="font-semibold text-yellow-700">{guild.pendingProposals}</p>
                          <p className="text-yellow-600">Pending</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="font-semibold text-blue-700">{guild.ongoingProposals}</p>
                          <p className="text-blue-600">Ongoing</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="font-semibold text-green-700">${guild.totalEarnings}</p>
                          <p className="text-green-600">Earned</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Recent Activity */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>

              {profile.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {profile.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 mb-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{activity.guildName}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-sm font-semibold text-green-600">
                          +{activity.amount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Participation Rate</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {totalOngoingProposals > 0
                        ? Math.round((totalOngoingProposals / (totalOngoingProposals + totalPendingProposals)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${totalOngoingProposals > 0
                          ? Math.round((totalOngoingProposals / (totalOngoingProposals + totalPendingProposals)) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Guild Activity</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {profile.guilds.length} Active
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full"
                      style={{ width: `${Math.min(profile.guilds.length * 33, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
