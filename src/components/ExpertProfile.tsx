"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
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
  Eye,
  Zap,
  LucideIcon,
} from "lucide-react";
import { expertApi } from "@/lib/api";
import { getExplorerAddressUrl } from "@/lib/blockchain";
import { formatDateMonthYear, formatTimeAgo, formatVetd, truncateAddress } from "@/lib/utils";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { GuildCard } from "./GuildCard";
import {
  getActivityIconComponent,
  getActivityColorClasses,
  getActivityIconBgColor,
  getActivityIconColor,
} from "@/lib/activityHelpers";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import type { ExpertProfile as ExpertProfileData } from "@/types";

interface ExpertProfileProps {
  walletAddress?: string;
  showBackButton?: boolean;
}

// ── Reputation Ring (SVG circular gauge) ──
function ReputationRing({ score, className = "" }: { score: number; className?: string }) {
  const circumference = 2 * Math.PI * 70; // r=70
  const maxScore = 2000;
  const progress = Math.min(score / maxScore, 1);
  const targetOffset = circumference - progress * circumference;

  return (
    <div className={`relative w-40 h-40 ${className}`}>
      {/* Glow */}
      <div className="absolute -inset-3 rounded-full bg-primary/10 blur-xl animate-avatar-glow-pulse" />
      {/* SVG */}
      <svg className="w-40 h-40 -rotate-90 relative z-[1]" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="rep-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--warning))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <circle
          cx="80" cy="80" r="70"
          fill="none"
          className="stroke-border/30"
          strokeWidth="7"
        />
        <circle
          cx="80" cy="80" r="70"
          fill="none"
          stroke="url(#rep-gradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="animate-rep-gauge-draw drop-"
          style={{ "--gauge-target": `${targetOffset}` } as React.CSSProperties}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[2]">
        <span className="text-5xl font-bold font-display tracking-tight text-foreground">
          {score.toLocaleString()}
        </span>
        <span className="text-xs font-medium uppercase tracking-[1.5px] text-primary">
          points
        </span>
      </div>
    </div>
  );
}

// ── Bento stat cell for the stats row ──
interface ProfileStatCellProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconColor?: string;
  iconBg?: string;
}

function ProfileStatCell({ icon: Icon, value, label, iconColor = "text-primary", iconBg = "bg-primary/10" }: ProfileStatCellProps) {
  return (
    <div className=" rounded-xl border border-border p-6 text-center transition-all hover:border-primary/30">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold font-display text-foreground mb-1">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function ExpertProfile({ walletAddress, showBackButton = false }: ExpertProfileProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useExpertAccount();

  const mode = walletAddress ? "public" : "private";
  const effectiveAddress = mode === "public" ? walletAddress : connectedAddress;

  const [copiedAddress, setCopiedAddress] = useState(false);
  const { execute: executeToggleEmail, isLoading: isTogglingEmail } = useApi();

  const isInvalidPublicAddress =
    mode === "public" && effectiveAddress && !/^0x[a-fA-F0-9]{40}$/.test(effectiveAddress);

  const shouldSkip =
    !effectiveAddress ||
    (mode === "private" && !isConnected) ||
    !!isInvalidPublicAddress;

  const { data: profile, isLoading, error: fetchError, refetch } = useFetch(
    async () => {
      const profileData = await expertApi.getProfile(effectiveAddress!);
      if (!profileData || typeof profileData !== "object") {
        throw new Error("Invalid profile data structure");
      }
      const guilds = Array.isArray(profileData.guilds) ? profileData.guilds : [];
      return { ...profileData, guilds } as ExpertProfileData;
    },
    {
      skip: shouldSkip,
      onError: (message) => { toast.error(message); },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- refetch when effective address changes at runtime
  useEffect(() => {
    if (!shouldSkip) { refetch(); }
  }, [effectiveAddress]);

  const error = isInvalidPublicAddress ? "Invalid wallet address format" : fetchError;

  const copyAddress = () => {
    if (profile?.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const toggleEmailVisibility = async () => {
    if (!profile || !effectiveAddress) return;
    const newValue = !profile.showEmail;
    await executeToggleEmail(
      () => expertApi.updateProfile(effectiveAddress, { showEmail: newValue }),
      {
        onSuccess: () => {
          refetch();
          toast.success(newValue ? "Email is now visible on your public profile" : "Email is now hidden from your public profile");
        },
        onError: () => { toast.error("Failed to update email visibility"); },
      }
    );
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

  const formatDate = (dateString: string) => formatDateMonthYear(dateString, "long");

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
      (sum, guild) => sum + guild.pendingProposals + guild.ongoingProposals + guild.closedProposals,
      0
    );
  };

  if (isLoading) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-foreground">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">{error}</Alert>
          {mode === "public" && (
            <button
              onClick={() => router.back()}
              className="w-full px-6 py-3 text-foreground bg-muted/50 border border-border rounded-lg hover:bg-muted hover:border-primary/40 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  if (mode === "public" && profile.status === "pending") {
    return (
      <div className="min-h-screen text-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {showBackButton && (
            <button onClick={() => router.back()} className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
          )}
          <div className="rounded-xl p-12 text-center border border-border bg-card shadow-sm">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Application Under Review</h2>
            <p className="text-muted-foreground mb-4">
              {profile.fullName ? `${profile.fullName}'s expert application` : "This expert application"} is currently being reviewed.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Wallet: {profile.walletAddress}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayEarnings = mode === "public"
    ? profile.endorsementEarnings || 0
    : profile.totalEarnings || 0;

  const memberSince = profile.createdAt ? formatDate(profile.createdAt) : "N/A";

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="profile-ambient-orb profile-ambient-orb-1" />
        <div className="profile-ambient-orb profile-ambient-orb-2" />
        <div className="profile-dot-grid" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button */}
        {mode === "public" && showBackButton && (
          <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* ═══ Bento Grid ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── Identity Card (left, spans 3 rows) ── */}
          <div className="md:row-span-3 rounded-xl border border-border p-8 sm:p-10 flex flex-col items-center text-center animate-fade-up">
            {/* Avatar */}
            <div className="relative mb-7">
              <div className="absolute -inset-3 rounded-full bg-primary/15 blur-2xl animate-avatar-glow-pulse" />
              <div className="w-[120px] h-[120px] rounded-full p-[3px] bg-[conic-gradient(from_0deg,hsl(var(--primary)),hsl(var(--warning)),hsl(var(--primary)),hsl(24_90%_48%),hsl(var(--primary)))] relative z-[1]">
                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                  {mode === "private" ? (
                    <User className="w-12 h-12 text-primary" />
                  ) : (
                    <span className="text-5xl font-bold font-display text-primary tracking-wider">
                      {getInitials(profile.fullName)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground mb-4">
              {profile.fullName || "Unknown Expert"}
            </h1>

            {/* Wallet Chip */}
            {mode === "private" ? (
              <button
                onClick={copyAddress}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/15 font-mono text-sm text-primary mb-4 transition-all hover:bg-primary/10 hover:border-primary/30"
              >
                <Wallet className="w-3.5 h-3.5 opacity-70" />
                {truncateAddress(profile.walletAddress)}
                {copiedAddress ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50" />
                )}
              </button>
            ) : (
              profile.walletAddress && (
                <div className="flex items-center gap-2 mb-4">
                  <a
                    href={getExplorerAddressUrl(profile.walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/15 font-mono text-sm text-primary transition-all hover:bg-primary/10 hover:border-primary/30"
                  >
                    <Wallet className="w-3.5 h-3.5 opacity-70" />
                    {truncateAddress(profile.walletAddress)}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                  <button
                    onClick={copyAddress}
                    className="inline-flex items-center gap-2 p-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted transition-all"
                  >
                    {copiedAddress ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )
            )}

            {/* Email */}
            {mode === "private" && profile.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{profile.email}</span>
                <button
                  onClick={toggleEmailVisibility}
                  disabled={isTogglingEmail}
                  className={`ml-1 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide rounded-full border transition-colors ${
                    profile.showEmail
                      ? "bg-success/10 text-success border-success/20 hover:bg-success/15"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  {profile.showEmail ? "Public" : "Hidden"}
                </button>
              </div>
            )}
            {mode === "public" && profile.showEmail && profile.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                {profile.email}
              </div>
            )}

            {/* Member since */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              Member since {memberSince}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="w-full mt-6 pt-6 border-t border-border text-left">
                <div className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-2.5">About</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* ── Reputation Ring Card (right, row 1) ── */}
          <div className=" rounded-xl border border-border p-8 flex flex-col items-center justify-center min-h-[260px] animate-fade-up animate-delay-100">
            <div className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-5">
              Reputation Score
            </div>
            <ReputationRing score={profile.reputation} className="mb-4" />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold uppercase tracking-[1.5px] text-primary animate-rank-badge-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Master
            </div>
          </div>

          {/* ── Earnings Card (right, row 2) ── */}
          <div className=" rounded-xl border border-border p-6 flex flex-col justify-center animate-fade-up animate-delay-200">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
              <DollarSign className="w-3.5 h-3.5 text-success" />
              Total Earnings
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold font-display text-foreground">
                {formatVetd(displayEarnings)}
              </span>
              <span className="text-base font-medium text-success/80">VETD</span>
            </div>
            <div className="w-full h-1 rounded-full bg-border/40 mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-positive"
                style={{ width: displayEarnings > 0 ? `${Math.min((displayEarnings / 1000) * 100, 100)}%` : "0%" }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {displayEarnings > 0 ? (mode === "public" ? "From endorsements" : "Total earned across all guilds") : "No earnings yet — start reviewing proposals"}
            </div>
          </div>

          {/* ── Active Guilds Card (right, row 3) ── */}
          <div className=" rounded-xl border border-border p-6 flex flex-col justify-center animate-fade-up animate-delay-300">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Active Guilds
            </div>
            <div className="text-5xl font-bold font-display text-foreground mb-3">
              {profile.guilds.length}
            </div>
            <div className="flex gap-2 flex-wrap">
              {profile.guilds.map((guild) => (
                <div
                  key={guild.id}
                  title={guild.name}
                  className="w-2.5 h-2.5 rounded-full bg-primary/70 transition-all hover:scale-150 hover:bg-primary cursor-pointer"
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Stats Row ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 animate-fade-up animate-delay-400">
          {mode === "public" && (
            <>
              <ProfileStatCell
                icon={TrendingUp}
                value={`${calculateConsensusPercentage()}%`}
                label="Consensus"
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
              <ProfileStatCell
                icon={FileText}
                value={calculateTotalProposals()}
                label="Proposals"
                iconColor="text-primary"
                iconBg="bg-primary/[0.08]"
              />
              <ProfileStatCell
                icon={ThumbsUp}
                value={profile.endorsementCount || 0}
                label="Endorsements"
                iconColor="text-success"
                iconBg="bg-success/10"
              />
              <ProfileStatCell
                icon={Eye}
                value={profile.reviewCount || 0}
                label="Reviews"
                iconColor="text-primary"
                iconBg="bg-primary/[0.08]"
              />
              <ProfileStatCell
                icon={Zap}
                value={`${profile.approvalCount || 0}`}
                label="Approvals"
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
            </>
          )}
          {mode === "private" && (
            <>
              <ProfileStatCell
                icon={Star}
                value={profile.reputation}
                label="Reputation"
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
              <ProfileStatCell
                icon={DollarSign}
                value={formatVetd(displayEarnings)}
                label="Earnings"
                iconColor="text-success"
                iconBg="bg-success/10"
              />
              <ProfileStatCell
                icon={Shield}
                value={profile.guilds.length}
                label="Guilds"
              />
            </>
          )}
        </div>

        {/* ═══ Recent Activity (public mode only) ═══ */}
        {mode === "public" && profile.recentActivity && profile.recentActivity.length > 0 && (
          <div className="mt-4 animate-fade-up animate-delay-500">
            <div className=" rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
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
                        <p className="text-sm font-medium text-foreground mb-1">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{activity.guildName}</span>
                          <span>·</span>
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-sm font-medium text-primary flex-shrink-0">+{activity.amount}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Guild Positions ═══ */}
        <div className="animate-fade-up animate-delay-500">
          <div className="mt-12 mb-6 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Guild Positions</h2>
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-xs text-muted-foreground px-3 py-1 rounded-full border border-border bg-card">
              {profile.guilds.length} active
            </span>
          </div>

          {profile.guilds.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-sm font-medium text-foreground mb-2">
                {mode === "private" ? "No guild memberships yet" : "Not yet a member of any guilds"}
              </p>
              <p className="text-sm text-muted-foreground">
                Join guilds to start vetting candidates and earning reputation
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
}
