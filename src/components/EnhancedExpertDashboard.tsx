"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Shield,
  TrendingUp,
  Star,
  DollarSign,
  Activity,
  Zap,
  ArrowRight,
  FileText,
  Award,
  Coins,
  Briefcase,
  Users,
} from "lucide-react";
import { Alert } from "./ui/alert";
import { LoadingState } from "./ui/loadingstate";
import { expertApi, calculateTotalPoints } from "@/lib/api";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { GuildCard } from "@/components/GuildCard";
import { blockchainApi } from "@/lib/api";

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
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [stakingStatus, setStakingStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchExpertProfile();
    } else if (!isDisconnecting) {
      // Only redirect if not intentionally disconnecting
      router.push("/");
    }
  }, [isConnected, address, isDisconnecting]);

  const fetchExpertProfile = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile and staking status in parallel
      const [profileResult, stakingResult] = await Promise.allSettled([
        expertApi.getProfile(address),
        blockchainApi.getStakeBalance(address),
      ]);

      // Handle profile data
      let data: any = null;
      if (profileResult.status === "fulfilled") {
        data = (profileResult.value as any).data || profileResult.value;
      }

      // Handle staking data
      if (stakingResult.status === "fulfilled") {
        setStakingStatus((stakingResult.value as any).data);
      }

      if (!data) {
        throw new Error("Failed to load profile data");
      }

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
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
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
        <Alert variant="warning">
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
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.push("/expert/apply")}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-primary via-accent to-primary/80 rounded-lg hover:opacity-90 transition-all"
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
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  const totalPendingProposals = (profile.guilds || []).reduce((sum, g) => sum + (g.pendingProposals || 0), 0);
  const totalOngoingProposals = (profile.guilds || []).reduce((sum, g) => sum + (g.ongoingProposals || 0), 0);
  const totalPoints = calculateTotalPoints(profile);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 font-display">
            Welcome back, {profile.fullName}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your expert activity overview
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
            <span className="text-sm font-semibold text-primary">Total Points</span>
            <span className="text-2xl font-bold text-foreground">{totalPoints.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Button Panel */}
        <ActionButtonPanel
          stakingStatus={stakingStatus}
          hasGuilds={profile.guilds.length > 0}
        />

        {/* Quick Stats - 4 Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Reputation Score"
            value={profile.reputation}
            icon={Star}
            iconBgColor="bg-primary/10"
            iconColor="text-primary"
            trend="+12%"
            trendDirection="up"
          />
          <StatCard
            title="Total Earnings"
            value={`$${profile.totalEarnings.toLocaleString()}`}
            icon={DollarSign}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-600 dark:text-green-400"
            trend="+8%"
            trendDirection="up"
          />
          <StatCard
            title="Guild Memberships"
            value={profile.guilds.length}
            icon={Shield}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Total Staked VETD"
            value={stakingStatus?.stakedAmount ? `${parseFloat(stakingStatus.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "0"}
            icon={Coins}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Main Grid - 70/30 Split */}
        <div className="grid lg:grid-cols-[70%_30%] gap-6 mb-8">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            {/* Guilds Section */}
            <div className="bg-card rounded-2xl p-6 shadow-md border border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground font-serif">Your Guilds</h2>
                <button
                  onClick={() => router.push("/expert/guilds")}
                  className="text-sm text-primary hover:underline"
                >
                  View All
                </button>
              </div>

              {profile.guilds.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Guild Memberships Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Your application is under review. You&apos;ll be added to a guild once approved.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {profile.guilds.map((guild) => (
                    <GuildCard
                      key={guild.id}
                      guild={guild}
                      variant="browse"
                      showDescription={false}
                      onViewDetails={handleGuildClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Pending Actions - Enhanced with all action types */}
            <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/20 rounded-2xl p-6 shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    Pending Actions
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {totalPendingProposals + profile.pendingTasks.unreviewedApplicationsCount} action{(totalPendingProposals + profile.pendingTasks.unreviewedApplicationsCount) !== 1 ? 's' : ''} need review
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Proposals */}
                {totalPendingProposals > 0 && (
                  <button
                    onClick={() => router.push('/expert/notifications')}
                    className="w-full flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm mb-1">
                        Candidate Proposals
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalPendingProposals} proposal{totalPendingProposals !== 1 ? 's' : ''} awaiting your vote
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
                  </button>
                )}

                {/* Job Applications */}
                {profile.pendingTasks.unreviewedApplicationsCount > 0 && (
                  <button
                    onClick={() => router.push('/expert/endorsements')}
                    className="w-full flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                      <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm mb-1">
                        Job Applications
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.pendingTasks.unreviewedApplicationsCount} application{profile.pendingTasks.unreviewedApplicationsCount !== 1 ? 's' : ''} to review
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
                  </button>
                )}

                {/* Guild Applications - Always show as available */}
                <button
                  onClick={() => router.push('/expert/guilds')}
                  className="w-full flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground text-sm mb-1">
                      Guild Applications
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Review new expert applications
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
                </button>

                {/* Empty state when no pending actions */}
                {totalPendingProposals === 0 && profile.pendingTasks.unreviewedApplicationsCount === 0 && (
                  <div className="text-center py-6">
                    <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">All Caught Up!</p>
                    <p className="text-xs text-muted-foreground">
                      No pending actions at the moment
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-2xl p-6 shadow-md border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>

              {profile.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {profile.recentActivity.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground mb-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                          +{activity.amount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="bg-card rounded-2xl p-6 shadow-md border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Performance</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Participation Rate</span>
                    <span className="text-sm font-semibold text-foreground">
                      {totalOngoingProposals > 0
                        ? Math.round((totalOngoingProposals / (totalOngoingProposals + totalPendingProposals)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-600 to-orange-500 h-2 rounded-full transition-all"
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
                    <span className="text-sm text-muted-foreground">Guild Activity</span>
                    <span className="text-sm font-semibold text-foreground">
                      {profile.guilds.length} Active
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
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
