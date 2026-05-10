"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import {
  Mail,
  Wallet,
  Calendar,
  Star,
  DollarSign,
  Shield,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  ThumbsUp,
  ArrowLeft,
  Clock,
  Activity,
  Eye,
  Pencil,
  Save,
  X,
  Sparkles,
  ScrollText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { expertApi } from "@/lib/api";
import { getExplorerAddressUrl } from "@/lib/blockchain";
import { formatDateMonthYear, formatTimeAgo, formatVetd, truncateAddress, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { getPersonAvatar } from "@/lib/avatars";
import { GuildCard } from "./GuildCard";
import { GuildBadge } from "@/components/ui/guild";
import { getRankColors, STATUS_COLORS } from "@/config/colors";
import {
  getActivityIconComponent,
  getActivityColorClasses,
  getActivityIconBgColor,
  getActivityIconColor,
} from "@/lib/activityHelpers";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import type { ExpertProfile as ExpertProfileData } from "@/types";

interface ExpertProfileProps {
  walletAddress?: string;
  showBackButton?: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Reputation ring — borrowed from ViewReviewModal pattern
// ─────────────────────────────────────────────────────────────────────

type RepTone = "positive" | "warning" | "negative" | "info";

function ReputationRing({ score, max, tone }: { score: number; max: number; tone: RepTone }) {
  const size = 168;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(Math.round((score / max) * 100), 100);
  const dashOffset = circumference - (percent / 100) * circumference;
  const toneTextClass = STATUS_COLORS[tone].text;

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("transition-all duration-700", toneTextClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={cn(
              "text-4xl font-bold font-display tabular-nums leading-none",
              toneTextClass
            )}
          >
            {score.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-2">
            Reputation
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            {percent}% of {max.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────

export function ExpertProfile({ walletAddress, showBackButton = false }: ExpertProfileProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useExpertAccount();

  const mode: "public" | "private" = walletAddress ? "public" : "private";
  const effectiveAddress = mode === "public" ? walletAddress : connectedAddress;

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", bio: "" });
  const { execute: executeToggleEmail, isLoading: isTogglingEmail } = useApi();
  const { execute: saveProfile, isLoading: saving } = useApi();

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

  const handleStartEditing = () => {
    setEditData({ name: profile?.fullName ?? "", bio: profile?.bio ?? "" });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!effectiveAddress) return;
    await saveProfile(
      () => expertApi.updateProfile(effectiveAddress, { fullName: editData.name, bio: editData.bio }),
      {
        onSuccess: () => {
          refetch();
          setIsEditing(false);
          toast.success("Profile updated");
        },
        onError: () => {
          toast.error("Failed to update profile");
        },
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

  const calculateConsensusPercentage = () => {
    if (!profile) return 0;
    const approvalCount = profile.approvalCount || 0;
    const rejectionCount = profile.rejectionCount || 0;
    const total = approvalCount + rejectionCount;
    if (total === 0) return 0;
    const majority = Math.max(approvalCount, rejectionCount);
    return Math.round((majority / total) * 100);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-foreground">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">{error}</Alert>
          {mode === "public" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!profile && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen text-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-40 w-full rounded-2xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-72 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending state — public-only fallback
  if (mode === "public" && profile.status === "pending") {
    return (
      <div className="min-h-screen text-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {showBackButton && (
            <button onClick={() => router.back()} className="mb-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
          )}
          <div className="rounded-2xl p-12 text-center border border-border bg-card shadow-sm">
            <Clock className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground font-display tracking-tight">Application Under Review</h2>
            <p className="text-muted-foreground mb-3">
              {profile.fullName ? `${profile.fullName}'s expert application` : "This expert application"} is currently being reviewed.
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {profile.walletAddress}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const guildEarningsSum = profile.guilds?.reduce((sum, g) => sum + (g.totalEarnings || 0), 0) || 0;
  const displayEarnings = mode === "public"
    ? profile.endorsementEarnings || guildEarningsSum
    : profile.totalEarnings || guildEarningsSum;

  const memberSince = profile.createdAt ? formatDateMonthYear(profile.createdAt, "long") : "N/A";

  const primaryRank = profile.guilds?.[0]?.expertRole || "recruit";
  const rankColors = getRankColors(primaryRank);

  const totalVotes = (profile.approvalCount || 0) + (profile.rejectionCount || 0);

  // Reputation tone for the ring
  const repPercent = profile.reputation > 0 ? Math.min((profile.reputation / 2000) * 100, 100) : 0;
  const repTone: RepTone =
    repPercent >= 70 ? "positive"
    : repPercent >= 50 ? "warning"
    : repPercent >= 25 ? "info"
    : "negative";

  const lastActivityTimestamp = profile.recentActivity?.[0]?.timestamp;

  return (
    <div className="min-h-screen text-foreground animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === "public" && showBackButton && (
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <DataSection isLoading={isLoading} skeleton={null}>
          <HeroCard
            profile={profile}
            mode={mode}
            isEditing={isEditing}
            editName={editData.name}
            onEditNameChange={(name) => setEditData((d) => ({ ...d, name }))}
            initials={getInitials(profile.fullName)}
            rankBadgeClass={rankColors.badge}
            rankDotClass={rankColors.dot}
            rankLabel={primaryRank}
            onCopyAddress={copyAddress}
            copied={copiedAddress}
            onStartEdit={handleStartEditing}
          />

          {/* KPI strip */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile
              icon={<Star className="w-4 h-4" />}
              label="Reputation"
              value={profile.reputation.toLocaleString()}
              tone="primary"
            />
            <KpiTile
              icon={<Shield className="w-4 h-4" />}
              label="Active guilds"
              value={profile.guilds.length}
              tone="info"
            />
            <KpiTile
              icon={<Eye className="w-4 h-4" />}
              label={mode === "public" ? "Reviews" : "Total votes"}
              value={
                mode === "public"
                  ? (profile.reviewCount ?? 0)
                  : totalVotes
              }
              tone="warning"
            />
            <KpiTile
              icon={<DollarSign className="w-4 h-4" />}
              label="Earnings"
              value={`${formatVetd(displayEarnings)} VETD`}
              tone="positive"
            />
          </div>

          {/* ── Body grid ── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <Section
                icon={<ScrollText className="w-4 h-4" />}
                title="About"
                action={
                  mode === "private" && !isEditing ? (
                    <button
                      onClick={handleStartEditing}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  ) : null
                }
              >
                {mode === "private" && isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value }))}
                      placeholder="Tell the community about yourself, your expertise, and what motivates you..."
                      rows={6}
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        isLoading={saving}
                        icon={!saving && <Save className="w-3.5 h-3.5" />}
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => setIsEditing(false)}
                        icon={<X className="w-3.5 h-3.5" />}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : profile.bio ? (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {mode === "private"
                      ? "No bio yet. Hit Edit above to introduce yourself."
                      : "This expert hasn't added a bio yet."}
                  </p>
                )}
              </Section>

              <Section
                icon={<Shield className="w-4 h-4" />}
                title="Guild positions"
                meta={`${profile.guilds.length} active`}
              >
                {profile.guilds.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {mode === "private" ? "No guild memberships yet" : "Not a member of any guilds"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Join guilds to start vetting candidates and earning reputation.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {profile.guilds.map((guild) => (
                      <GuildCard
                        key={guild.id}
                        guild={guild}
                        variant="membership"
                        membershipSubVariant="compact"
                        onViewDetails={(guildId) => router.push(`/guilds/${guildId}`)}
                      />
                    ))}
                  </div>
                )}
              </Section>

              {mode === "public" && profile.recentActivity && profile.recentActivity.length > 0 && (
                <Section
                  icon={<Activity className="w-4 h-4" />}
                  title="Recent activity"
                  meta={`${profile.recentActivity.length} entries`}
                >
                  <ul className="space-y-2">
                    {profile.recentActivity.slice(0, 6).map((activity) => {
                      const IconComponent = getActivityIconComponent(activity.type);
                      return (
                        <li
                          key={activity.id}
                          className={cn(
                            "p-3.5 rounded-lg border",
                            getActivityColorClasses(activity.type)
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "w-9 h-9 rounded-md grid place-items-center flex-shrink-0",
                                getActivityIconBgColor(activity.type)
                              )}
                            >
                              <IconComponent className={cn("w-4 h-4", getActivityIconColor(activity.type))} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground leading-snug">
                                {activity.description}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                                <span className="truncate">{activity.guildName}</span>
                                <span>·</span>
                                <span>{formatTimeAgo(activity.timestamp)}</span>
                              </div>
                            </div>
                            {activity.amount !== undefined && (
                              <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">
                                +{activity.amount}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {mode === "public" && totalVotes > 0 && (
                <Section
                  icon={<TrendingUp className="w-4 h-4" />}
                  title="Track record"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <KvTile
                      label="Approvals"
                      value={`${profile.approvalCount ?? 0}`}
                      hint="Votes for"
                    />
                    <KvTile
                      label="Rejections"
                      value={`${profile.rejectionCount ?? 0}`}
                      hint="Votes against"
                    />
                    <KvTile
                      label="Consensus"
                      value={`${calculateConsensusPercentage()}%`}
                      hint="With majority"
                    />
                  </div>
                  {(profile.endorsementCount ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                      <ThumbsUp className="w-3.5 h-3.5 text-success" />
                      <span>
                        <strong className="text-foreground tabular-nums">{profile.endorsementCount}</strong>{" "}
                        endorsement{(profile.endorsementCount ?? 0) === 1 ? "" : "s"} given
                      </span>
                    </div>
                  )}
                </Section>
              )}
            </div>

            {/* Right sticky rail */}
            <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-6 lg:self-start">
              <SidebarCard title="Reputation">
                <div className="flex items-center justify-center pt-1">
                  <ReputationRing score={profile.reputation} max={2000} tone={repTone} />
                </div>
                <div className="flex items-center justify-center mt-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                      rankColors.badge
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", rankColors.dot)} />
                    <span className="capitalize">{primaryRank}</span>
                  </span>
                </div>
              </SidebarCard>

              <SidebarCard title="At a glance">
                <KeyValue
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  label="Rank"
                  value={primaryRank}
                  capitalize
                />
                <KeyValue
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label="Guilds"
                  value={`${profile.guilds.length}`}
                />
                <KeyValue
                  icon={<Eye className="w-3.5 h-3.5" />}
                  label="Votes cast"
                  value={`${totalVotes}`}
                />
                <KeyValue
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="Last active"
                  value={lastActivityTimestamp ? formatTimeAgo(lastActivityTimestamp) : "—"}
                />
                <KeyValue
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Joined"
                  value={memberSince}
                />
              </SidebarCard>

              <SidebarCard title="Wallet">
                <div className="space-y-3">
                  {mode === "private" ? (
                    <button
                      onClick={copyAddress}
                      className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground hover:border-primary/30 hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                        {truncateAddress(profile.walletAddress)}
                      </span>
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    profile.walletAddress && (
                      <div className="flex items-center gap-2">
                        <a
                          href={getExplorerAddressUrl(profile.walletAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground hover:border-primary/30 hover:bg-muted transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                            {truncateAddress(profile.walletAddress)}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                        <button
                          onClick={copyAddress}
                          className="grid place-items-center w-9 h-9 rounded-lg bg-muted/40 border border-border hover:border-primary/30 hover:bg-muted transition-colors flex-shrink-0"
                          aria-label="Copy address"
                        >
                          {copiedAddress ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    )
                  )}

                  {mode === "private" && profile.email && (
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-foreground truncate">{profile.email}</span>
                      </div>
                      <button
                        onClick={toggleEmailVisibility}
                        disabled={isTogglingEmail}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] rounded border transition-colors flex-shrink-0",
                          profile.showEmail
                            ? "bg-success/10 text-success border-success/20 hover:bg-success/15"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        {profile.showEmail ? "Public" : "Hidden"}
                      </button>
                    </div>
                  )}
                  {mode === "public" && profile.showEmail && profile.email && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground truncate">{profile.email}</span>
                    </div>
                  )}
                </div>
              </SidebarCard>

              <SidebarCard title="Earnings">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-display text-foreground tabular-nums">
                      {formatVetd(displayEarnings)}
                    </span>
                    <span className="text-xs font-semibold text-success/80">VETD</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-positive transition-all duration-700"
                      style={{
                        width: displayEarnings > 0
                          ? `${Math.min((displayEarnings / 1000) * 100, 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {displayEarnings > 0
                      ? mode === "public"
                        ? "Earned through endorsements."
                        : "Earned across all guilds."
                      : "Start reviewing to begin earning."}
                  </p>
                </div>
              </SidebarCard>
            </aside>
          </div>
        </DataSection>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────

interface HeroCardProps {
  profile: ExpertProfileData;
  mode: "public" | "private";
  isEditing: boolean;
  editName: string;
  onEditNameChange: (v: string) => void;
  initials: string;
  rankBadgeClass: string;
  rankDotClass: string;
  rankLabel: string;
  onCopyAddress: () => void;
  copied: boolean;
  onStartEdit: () => void;
}

function HeroCard({
  profile,
  mode,
  isEditing,
  editName,
  onEditNameChange,
  initials,
  rankBadgeClass,
  rankDotClass,
  rankLabel,
  onCopyAddress,
  copied,
  onStartEdit,
}: HeroCardProps) {
  const memberSince = profile.createdAt
    ? formatDateMonthYear(profile.createdAt, "long")
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Banner zone */}
      <div className="relative h-40 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--warning)/0.10),transparent_55%)]" />

        {/* Top-right rank pill */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-md",
              rankBadgeClass
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", rankDotClass)} />
            <span className="capitalize">{rankLabel}</span>
          </span>
          {profile.walletAddress && (
            <button
              onClick={onCopyAddress}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono backdrop-blur-md bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              aria-label="Copy wallet address"
            >
              <Wallet className="w-3 h-3" />
              {truncateAddress(profile.walletAddress)}
              {copied ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
          {mode === "private" && !isEditing && (
            <Button
              size="sm"
              variant="default"
              onClick={onStartEdit}
              icon={<Pencil className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Edit profile
            </Button>
          )}
        </div>
      </div>

      {/* Body — avatar overlap */}
      <div className="px-6 sm:px-8 -mt-12 relative pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-card border-2 border-border shadow-md overflow-hidden grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- avatar URL from helper */}
              <img
                src={getPersonAvatar(profile.fullName || "Expert")}
                alt={profile.fullName ?? "Expert"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <span className="hidden text-3xl font-bold font-display text-primary tracking-wider">
                {initials}
              </span>
            </div>
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1 sm:pb-2">
            {mode === "private" && isEditing ? (
              <Input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                placeholder="Full name"
                className="text-lg font-bold mb-2"
              />
            ) : (
              <h1 className="text-3xl font-bold text-foreground tracking-tight font-display truncate">
                {profile.fullName || "Unknown Expert"}
              </h1>
            )}

            {(profile.currentTitle || profile.currentCompany) && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {[profile.currentTitle, profile.currentCompany].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile.guilds.slice(0, 3).map((guild) => (
                <GuildBadge key={guild.id} guild={guild.name} size="sm" />
              ))}
              {profile.guilds.length > 3 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  +{profile.guilds.length - 3} more
                </span>
              )}
              {memberSince && (
                <span className="ml-auto sm:ml-0 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Joined {memberSince}
                </span>
              )}
            </div>
          </div>

          {/* Mobile-only edit button */}
          {mode === "private" && !isEditing && (
            <div className="sm:hidden">
              <Button
                size="sm"
                onClick={onStartEdit}
                icon={<Pencil className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Edit profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers — Section, SidebarCard, KeyValue, KpiTile, KvTile
// ─────────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  meta,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground font-medium leading-snug",
            capitalize && "capitalize"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <span
        className={cn(
          "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function KvTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-1">
        {value}
      </p>
      {hint && (
        <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{hint}</p>
      )}
    </div>
  );
}

