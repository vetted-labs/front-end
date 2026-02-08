"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  User,
  Mail,
  Wallet,
  Calendar,
  Star,
  DollarSign,
  Shield,
  Copy,
  Check,
  ExternalLink,
  FileText,
  TrendingUp,
  ThumbsUp,
  ArrowLeft,
  Clock,
  Activity,
  LucideIcon,
} from "lucide-react";
import { expertApi } from "@/lib/api";
import { LoadingState } from "./ui/loadingstate";
import { Alert } from "./ui/alert";
import { GuildCard } from "./GuildCard";
import { GuildMembershipCard } from "./GuildMembershipCard";
import {
  getActivityIconComponent,
  getActivityColorClasses,
  getActivityIconBgColor,
  getActivityIconColor,
} from "@/lib/activityHelpers";

interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: "recruit" | "craftsman" | "master";
  reputation: number;
  totalEarnings: number;
  joinedAt?: string;
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
  status?: "pending" | "approved" | "rejected";
  reputation: number;
  totalEarnings?: number;
  endorsementEarnings?: number;
  createdAt?: string;
  bio?: string;
  endorsementCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  guilds: Guild[];
  recentActivity?: RecentActivity[];
}

interface ExpertProfileProps {
  walletAddress?: string;
  showBackButton?: boolean;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  colorScheme: "primary" | "emerald" | "neutral";
}

function StatCard({ icon: Icon, label, value, subtitle, colorScheme }: StatCardProps) {
  const colorClasses = {
    primary:
      "bg-white/[0.03] border border-white/10 hover:border-orange-400/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]",
    emerald:
      "bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]",
    neutral:
      "bg-white/[0.03] border border-white/10 hover:border-orange-400/20 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]",
  };

  const iconColorClasses = {
    primary: "text-amber-200",
    emerald: "text-emerald-300",
    neutral: "text-slate-300",
  };

  const iconBgClasses = {
    primary: "bg-orange-500/10 border border-orange-400/20",
    emerald: "bg-emerald-500/10 border border-emerald-400/20",
    neutral: "bg-white/5 border border-white/10",
  };

  return (
    <div className={`rounded-2xl p-6 transition-colors ${colorClasses[colorScheme]}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${iconBgClasses[colorScheme]} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${iconColorClasses[colorScheme]}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-semibold text-slate-100">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function ExpertProfile({ walletAddress, showBackButton = false }: ExpertProfileProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();

  // Determine mode
  const mode = walletAddress ? "public" : "private";
  const effectiveAddress = mode === "public" ? walletAddress : connectedAddress;

  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (mode === "private" && !isConnected) {
      setIsLoading(false);
      return;
    }

    if (effectiveAddress) {
      fetchProfile();
    }
  }, [effectiveAddress, isConnected, mode]);

  const fetchProfile = async () => {
    if (!effectiveAddress) return;

    // Validate wallet address format for public mode
    if (mode === "public" && !/^0x[a-fA-F0-9]{40}$/.test(effectiveAddress)) {
      setError("Invalid wallet address format");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getProfile(effectiveAddress);

      // Unwrap the API response envelope
      const profileData = result.data || result;

      if (!profileData || typeof profileData !== "object") {
        throw new Error("Invalid profile data structure");
      }

      // Ensure guilds is an array
      const guilds = Array.isArray(profileData.guilds) ? profileData.guilds : [];

      setProfile({
        ...profileData,
        guilds,
      });
    } catch (err: any) {
      console.error("Error fetching expert profile:", err);
      if (err.status === 404) {
        setError("Expert profile not found");
      } else {
        setError(err.message || "Failed to fetch profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (profile?.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return "??";
    return fullName
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const calculateConsensusPercentage = () => {
    if (!profile) return 0;
    const approvalCount = profile.approvalCount || 0;
    const rejectionCount = profile.rejectionCount || 0;
    const total = approvalCount + rejectionCount;
    if (total === 0) return 0;
    const majority = Math.max(approvalCount, rejectionCount);
    return Math.round((majority / total) * 100);
  };

  const calculateTotalProposals = () => {
    if (!profile || !profile.guilds) return 0;
    return profile.guilds.reduce(
      (sum, guild) =>
        sum + guild.pendingProposals + guild.ongoingProposals + guild.closedProposals,
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
      <div className="min-h-screen flex items-center justify-center px-4 text-slate-100">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          {mode === "public" && (
            <button
              onClick={() => router.back()}
              className="w-full px-6 py-3 text-slate-100 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-orange-400/40 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-100">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  // Pending expert state (public mode only)
  if (mode === "public" && profile.status === "pending") {
    return (
      <div className="min-h-screen text-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="mb-8 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          )}

          <div className="rounded-2xl p-12 text-center border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
            <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-slate-100">Application Under Review</h2>
            <p className="text-slate-400 mb-4">
              {profile.fullName ? `${profile.fullName}'s expert application` : "This expert application"} is currently being reviewed.
            </p>
            <div className="text-sm text-slate-400">
              <p>Wallet: {profile.walletAddress}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle different earnings field names
  const displayEarnings = mode === "public"
    ? profile.endorsementEarnings || 0
    : profile.totalEarnings || 0;

  const memberSince = profile.createdAt
    ? formatDate(profile.createdAt)
    : "N/A";

  // Main profile view
  return (
    <div className="min-h-screen text-slate-100">
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button (public mode only) */}
        {mode === "public" && showBackButton && (
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        )}

        {/* Single-column layout */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl p-8 border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_60px_rgba(0,0,0,0.55)]">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_20px_60px_rgba(251,146,60,0.35)]">
              {mode === "private" ? (
                <User className="w-12 h-12 text-slate-900" />
              ) : (
                <span className="text-3xl font-bold text-slate-900">
                  {getInitials(profile.fullName)}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-semibold text-slate-100 text-center mb-2">
              {profile.fullName || "Unknown Expert"}
            </h1>

            {/* Email (private mode only) */}
            {mode === "private" && profile.email && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mb-2">
                <Mail className="w-4 h-4 text-amber-200" />
                {profile.email}
              </div>
            )}

            {/* Member Since (centered) */}
            <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mb-4">
              <Calendar className="w-4 h-4 text-amber-200" />
              Member since {memberSince}
            </div>

            {/* Wallet Address */}
            {mode === "private" ? (
              <details className="group">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2 py-2 justify-center">
                  <Wallet className="w-3 h-3 text-amber-200" />
                  <span>Show wallet address</span>
                </summary>
                <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-200" />
                    <p className="font-mono text-xs text-slate-100">{profile.walletAddress}</p>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="px-2 py-1 rounded-md hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span className="text-xs text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </details>
            ) : (
              profile.walletAddress && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <a
                    href={`https://etherscan.io/address/${profile.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-orange-400/40 hover:bg-white/10 transition-all text-xs font-mono text-slate-300 hover:text-slate-100"
                  >
                    <Wallet className="w-3 h-3 text-amber-200" />
                    {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                  <button
                    onClick={copyAddress}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-orange-400/40 hover:bg-white/10 transition-all"
                  >
                    {copiedAddress ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
              )
            )}

            {/* Bio Section */}
            {profile.bio && (
              <div className="pt-4 border-t border-white/10 mt-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">Bio</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Reputation Score */}
            <StatCard
              icon={Star}
              label="Reputation Score"
              value={profile.reputation}
              colorScheme="primary"
            />

            {/* Total Earnings */}
            <StatCard
              icon={DollarSign}
              label="Total Earnings"
              value={`$${displayEarnings.toLocaleString()}`}
              subtitle={mode === "public" ? "From endorsements" : undefined}
              colorScheme="emerald"
            />

            {/* Mode-specific stat cards */}
            {mode === "public" && (
              <>
                <StatCard
                  icon={TrendingUp}
                  label="Consensus"
                  value={`${calculateConsensusPercentage()}%`}
                  subtitle={`${profile.approvalCount || 0} approvals, ${profile.rejectionCount || 0} rejections`}
                  colorScheme="primary"
                />
                <StatCard
                  icon={FileText}
                  label="Vetted Proposals"
                  value={calculateTotalProposals()}
                  colorScheme="neutral"
                />
                <StatCard
                  icon={ThumbsUp}
                  label="Endorsements"
                  value={profile.endorsementCount || 0}
                  colorScheme="neutral"
                />
              </>
            )}

            {mode === "private" && (
              <StatCard
                icon={Shield}
                label="Active Guilds"
                value={profile.guilds.length}
                colorScheme="neutral"
              />
            )}
          </div>

          {/* Recent Activity (public mode only) */}
          {mode === "public" && profile.recentActivity && profile.recentActivity.length > 0 && (
            <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-200" />
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
                        <p className="text-sm font-medium text-slate-100 mb-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="truncate">{activity.guildName}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-sm font-semibold text-amber-200 flex-shrink-0">
                          +{activity.amount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guild Memberships - Horizontal Grid */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-200" />
              Guild Memberships
            </h2>

            {profile.guilds.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/[0.03]">
                <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-60" />
                <p className="text-lg text-slate-300 mb-2">
                  {mode === "private" ? "No guild memberships yet" : "Not yet a member of any guilds"}
                </p>
                <p className="text-sm text-slate-400">
                  Join guilds to start vetting candidates and earning reputation
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.guilds.map((guild) => (
                  <GuildCard
                    key={guild.id}
                    guild={guild}
                    variant="membership"
                    onViewDetails={(guildId) => router.push(`/guilds/${guildId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
