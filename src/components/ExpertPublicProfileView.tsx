"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Calendar,
  Coins,
  FileText,
  TrendingUp,
  ThumbsUp,
  Shield,
  Loader2,
  ArrowLeft,
  Clock,
  Activity,
} from "lucide-react";
import { expertApi } from "@/lib/api";
import { Alert } from "./ui/alert";
import { LoadingState } from "./ui/loadingstate";
import { getActivityIconComponent, getActivityColorClasses, getActivityIconBgColor, getActivityIconColor } from "@/lib/activityHelpers";
import { GuildMembershipCard } from "./GuildMembershipCard";

interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: "recruit" | "craftsman" | "master";
  reputation: number;
  totalEarnings: number;
  joinedAt: string;
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
  fullName?: string;
  email?: string;
  walletAddress: string;
  status: "pending" | "approved" | "rejected";
  reputation?: number;
  endorsementEarnings?: number;
  createdAt?: string;
  bio?: string;
  endorsementCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  guilds?: Guild[];
  recentActivity?: RecentActivity[];
}

export function ExpertPublicProfileView({ walletAddress }: { walletAddress: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [walletAddress]);

  const fetchProfile = async () => {
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError("Invalid wallet address format");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getProfile(walletAddress);
      console.log('Expert profile data:', result); // Debug log

      // Validate that we have the minimum required data
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid profile data received');
      }

      setProfile(result);
    } catch (err: any) {
      console.error('Error fetching expert profile:', err); // Debug log
      if (err.status === 404) {
        setError("Expert profile not found");
      } else {
        setError(err.message || "Failed to fetch profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '??';
    return fullName
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateConsensusPercentage = () => {
    if (!profile) return 0;
    const approvalCount = profile.approvalCount || 0;
    const rejectionCount = profile.rejectionCount || 0;
    const total = approvalCount + rejectionCount;
    if (total === 0) return 0;
    // Consensus = alignment with majority
    const majority = Math.max(approvalCount, rejectionCount);
    return Math.round((majority / total) * 100);
  };

  const calculateTotalProposals = () => {
    if (!profile || !profile.guilds) return 0;
    return profile.guilds.reduce(
      (sum, guild) =>
        sum +
        guild.pendingProposals +
        guild.ongoingProposals +
        guild.closedProposals,
      0
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading expert profile..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-3 text-foreground bg-card border border-border rounded-lg hover:bg-card/80 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  // Pending expert state
  if (profile.status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Application Under Review</h2>
            <p className="text-muted-foreground mb-4">
              {profile.fullName ? `${profile.fullName}'s expert application` : 'This expert application'} is currently being reviewed.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Wallet: {profile.walletAddress}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main profile view (approved expert)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {getInitials(profile.fullName)}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">
                {profile.fullName || 'Unknown Expert'}
              </h1>

              {/* Wallet Address */}
              <div className="text-center mb-4">
                <p className="text-sm font-mono text-muted-foreground">
                  {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                </p>
              </div>

              {/* Bio Section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.bio || "No bio provided yet"}
                </p>
              </div>
            </div>

            {/* Guild Memberships */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Guild Memberships
              </h2>

              {!profile.guilds || profile.guilds.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Not yet a member of any guilds</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.guilds.map((guild) => (
                    <GuildMembershipCard key={guild.id} guild={guild} variant="compact" />
                  ))}
                </div>
              )}
            </div>

            {/* Activity History */}
            {profile.recentActivity && profile.recentActivity.length > 0 && (
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Recent Activity
                  </h2>
                </div>

                <div className="space-y-3">
                  {profile.recentActivity.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-4 rounded-xl border ${getActivityColorClasses(activity.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityIconBgColor(activity.type)}`}>
                          {(() => {
                            const IconComponent = getActivityIconComponent(activity.type);
                            return <IconComponent className={`w-5 h-5 ${getActivityIconColor(activity.type)}`} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground mb-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{activity.guildName}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(activity.timestamp)}</span>
                          </div>
                        </div>
                        {activity.amount && (
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                            +{activity.amount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-4">
            {/* Reputation Score */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Reputation Score</p>
                  <p className="text-3xl font-bold text-foreground">{profile.reputation || 0}</p>
                </div>
              </div>
            </div>

            {/* Joined Since */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Joined Since</p>
                  <p className="text-xl font-bold text-foreground">
                    {profile.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Earnings (from endorsements) */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${(profile.endorsementEarnings || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">From endorsements</p>
                </div>
              </div>
            </div>

            {/* Vetted Proposals */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Vetted Proposals</p>
                  <p className="text-3xl font-bold text-foreground">{calculateTotalProposals()}</p>
                </div>
              </div>
            </div>

            {/* Consensus Percentage */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Consensus</p>
                  <p className="text-3xl font-bold text-foreground">{calculateConsensusPercentage()}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.approvalCount || 0} approvals, {profile.rejectionCount || 0} rejections
                  </p>
                </div>
              </div>
            </div>

            {/* Endorsements */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ThumbsUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Endorsements</p>
                  <p className="text-3xl font-bold text-foreground">{profile.endorsementCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
