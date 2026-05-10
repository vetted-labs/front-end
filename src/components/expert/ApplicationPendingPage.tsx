"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Clock,
  Mail,
  CheckCircle,
  Users,
  Plus,
  ShieldCheck,
  Swords,
  Timer,
  ExternalLink,
  Sparkles,
  CircleDot,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Divider } from "@/components/ui/divider";
import { PatternBackground } from "@/components/ui/pattern-background";
import { GuildAvatar, GuildBadge } from "@/components/ui/guild";
import { expertApi, ApiError } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { STATUS_COLORS } from "@/config/colors";
import { cn, truncateAddress, formatDate } from "@/lib/utils";
import type { ExpertProfile, GuildApplicationInfo } from "@/types";

const MIN_REVIEWS = parseInt(process.env.NEXT_PUBLIC_MIN_REVIEWERS || "5", 10);

/* ─── Helpers ────────────────────────────────────────────────────── */

interface TimeRemaining {
  label: string;
  color: string;
}

function getTimeRemaining(deadline?: string): TimeRemaining | null {
  if (!deadline) return null;
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Vetting ended", color: STATUS_COLORS.negative.text };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) {
    const color = days > 3 ? STATUS_COLORS.positive.text : STATUS_COLORS.warning.text;
    return {
      label: hours > 0 ? `${days}d ${hours}h remaining` : `${days}d remaining`,
      color,
    };
  }
  if (hours > 0) return { label: `${hours}h remaining`, color: STATUS_COLORS.negative.text };
  const minutes = Math.floor(diff / (1000 * 60));
  return { label: `${minutes}m remaining`, color: STATUS_COLORS.negative.text };
}

function buildGuildApplications(expert: ExpertProfile): GuildApplicationInfo[] {
  if (expert.guildApplications && expert.guildApplications.length > 0) {
    return expert.guildApplications;
  }

  if (expert.appliedToGuild) {
    return [
      {
        id: expert.appliedToGuild.id,
        name: expert.appliedToGuild.name,
        description: expert.appliedToGuild.description,
        status: "pending" as const,
        reviewCount: expert.reviewCount,
        approvalCount: expert.approvalCount,
        rejectionCount: expert.rejectionCount,
      },
    ];
  }

  return [];
}

/* ─── Main page ─────────────────────────────────────────────────── */

export default function ApplicationPendingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const { execute: withdrawApp, isLoading: withdrawing } = useApi();

  const fetchProfile = useCallback(async () => {
    if (!address) throw new Error("No wallet address");

    try {
      const result = await expertApi.getProfile(address);

      if (result.status === "approved") {
        localStorage.setItem("expertStatus", "approved");
        router.push("/expert/dashboard");
        return null;
      }

      return result;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push("/expert/apply");
        return null;
      }
      throw err;
    }
  }, [address, router]);

  const { data: expert, isLoading, error, refetch } = useFetch(fetchProfile, {
    skip: !isConnected || !address,
    onError: (errorMessage) => {
      toast.error(errorMessage);
    },
  });

  if (!isConnected || !address || isLoading) return null;

  if (error || !expert) {
    const isInsufficientMembers =
      error?.includes("minimum") ||
      error?.includes("enough members") ||
      error?.includes("members to process");
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        {isInsufficientMembers ? (
          <div className="max-w-md text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/30 grid place-items-center mb-5">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Awaiting reviewers
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground tracking-tight mb-3">
              Not enough guild members
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This guild needs at least {MIN_REVIEWS} members to process applications. Your
              application will be reviewed once more experts join.
            </p>
          </div>
        ) : (
          <Alert variant="error">{error || "Failed to load application status"}</Alert>
        )}
      </div>
    );
  }

  const guildApplications = buildGuildApplications(expert);
  const pendingApps = guildApplications.filter((g) => g.status === "pending");
  const hasMultipleGuilds = guildApplications.length > 1;

  const defaultSelectedId =
    pendingApps[0]?.id ?? guildApplications[0]?.id ?? null;
  const selectedStillExists =
    selectedGuildId !== null &&
    guildApplications.some((g) => g.id === selectedGuildId);
  const effectiveSelectedId = selectedStillExists ? selectedGuildId : defaultSelectedId;
  const selectedGuild =
    guildApplications.find((g) => g.id === effectiveSelectedId) ?? null;

  const selectedReviews = selectedGuild?.reviewCount ?? 0;
  const selectedApprovals = selectedGuild?.approvalCount ?? 0;
  const selectedRejections = selectedGuild?.rejectionCount ?? 0;
  const isSelectedPending = selectedGuild?.status === "pending";
  const isSelectedApproved = selectedGuild?.status === "approved";
  const isSelectedRejected = selectedGuild?.status === "rejected";
  const reviewProgress = Math.min((selectedReviews / MIN_REVIEWS) * 100, 100);
  const hasOnChain = selectedGuild?.blockchainSessionCreated ?? false;
  const selectedTxHash = selectedGuild?.blockchainSessionTxHash;

  const rejectedDueToTimeout = isSelectedRejected && selectedReviews === 0;

  // ── Phase pill ─────────────────────────────────────────────────
  const phaseLabel = isSelectedApproved
    ? "Approved"
    : isSelectedRejected
      ? rejectedDueToTimeout
        ? "Auto-rejected"
        : "Rejected"
      : reviewProgress >= 100
        ? "Reveal phase"
        : "Commit phase";

  const phaseTone = isSelectedApproved
    ? "positive"
    : isSelectedRejected
      ? "negative"
      : "info";

  const heroEyebrow = isSelectedRejected
    ? "Application not approved"
    : isSelectedApproved
      ? "Approved"
      : "Application status";

  const heroIcon = isSelectedRejected ? XCircle : isSelectedApproved ? CheckCircle : Sparkles;
  const heroIconClass = isSelectedRejected
    ? STATUS_COLORS.negative.text
    : isSelectedApproved
      ? STATUS_COLORS.positive.text
      : "text-primary";

  const heroHeadline = isSelectedRejected
    ? hasMultipleGuilds && selectedGuild
      ? `${selectedGuild.name} — Rejected`
      : "Application Rejected"
    : isSelectedApproved
      ? `Welcome to ${selectedGuild?.name ?? "the guild"}`
      : "Your application is being reviewed";

  const heroSubcopy = isSelectedRejected
    ? rejectedDueToTimeout
      ? "Your application wasn't reviewed before the voting deadline. This usually happens when a guild is short on active reviewers. You can reapply to this guild or a different one at any time."
      : "Your application was reviewed by guild members and did not meet the consensus threshold for approval. You can reapply to the same guild or try a different guild that matches your expertise."
    : isSelectedApproved
      ? `You were approved${selectedGuild?.role ? ` as a ${selectedGuild.role}` : ""}. Your other applications are still under review — pick any card below to track its progress.`
      : `${MIN_REVIEWS} experts in the ${selectedGuild?.name ?? "guild"} guild are reviewing your application. Once enough reviews are in, you'll gain access to the expert dashboard.`;

  const HeroIcon = heroIcon;

  return (
    <div className="relative min-h-screen bg-background text-foreground animate-page-enter">
      {/* Background pattern */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <PatternBackground mask="radial-top" intensity="strong" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-full max-w-[700px] h-[400px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="pt-10 pb-10 md:pt-14 md:pb-12">
          <div className="flex flex-col md:flex-row md:items-start md:gap-7 gap-5">
            <GuildAvatar
              guild={selectedGuild?.name ?? "Vetted"}
              size="xl"
              rounded="2xl"
              className="shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[10.5px] font-bold uppercase tracking-[0.18em] mb-3",
                  heroIconClass,
                )}
              >
                <HeroIcon className="inline w-3 h-3 -mt-0.5 mr-1 opacity-80" />
                {heroEyebrow}
              </p>
              <h1 className="font-display font-bold text-[clamp(1.85rem,4.5vw,2.75rem)] leading-[1.05] tracking-tight text-foreground mb-3">
                {heroHeadline}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                {heroSubcopy}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-5">
                <Pill tone={phaseTone}>
                  <CircleDot className="w-3 h-3" />
                  {phaseLabel}
                </Pill>
                {selectedGuild?.votingDeadline && (() => {
                  const time = getTimeRemaining(selectedGuild.votingDeadline);
                  return time ? (
                    <Pill tone="neutral">
                      <Timer className={cn("w-3 h-3", time.color)} />
                      <span className={time.color}>{time.label}</span>
                    </Pill>
                  ) : null;
                })()}
                {hasOnChain && (
                  <Pill tone="neutral">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    On-chain
                  </Pill>
                )}
              </div>
            </div>
          </div>
        </header>

        <Divider className="mb-10" />

        {/* ── Guild applications selector (only when multiple) ─── */}
        {hasMultipleGuilds && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Your guild applications
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Click a card to focus
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guildApplications.map((guild) => {
                const isSelected = guild.id === effectiveSelectedId;
                return (
                  <article
                    key={guild.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedGuildId(guild.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedGuildId(guild.id);
                      }
                    }}
                    className={cn(
                      "group relative rounded-xl border bg-card px-5 py-4 overflow-hidden transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0 left-0 right-0 h-[2px]",
                        guild.status === "rejected"
                          ? STATUS_COLORS.negative.bg
                          : guild.status === "approved"
                            ? STATUS_COLORS.positive.bg
                            : "bg-primary/40",
                      )}
                    />

                    <div className="flex items-center gap-3 mb-3">
                      <GuildAvatar guild={guild.name} size="md" rounded="xl" />
                      <div className="min-w-0">
                        <GuildBadge guild={guild.name} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {guild.status === "pending" && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {guild.reviewCount ?? 0} / {MIN_REVIEWS} reviews
                        </span>
                      )}
                      {guild.status === "rejected" && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {guild.reviewCount ?? 0} reviews
                        </span>
                      )}
                      {guild.status === "approved" && (
                        <span className="text-xs text-muted-foreground">Member</span>
                      )}

                      {guild.status === "pending" && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium rounded-full ${STATUS_COLORS.warning.badge}`}
                        >
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {guild.status === "rejected" && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium rounded-full ${STATUS_COLORS.negative.badge}`}
                        >
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                      {guild.status === "approved" && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium rounded-full ${STATUS_COLORS.positive.badge}`}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {guild.role || "Member"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {guildApplications.length === 0 && (
          <div className="mb-8">
            <EmptyState icon={Swords} title="No guild applications found" />
          </div>
        )}

        {/* ── Two-column layout ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status visualization with score ring */}
            {isSelectedPending && (
              <Section
                icon={<Users className="w-4 h-4" />}
                title="Vote progress"
                meta={`${selectedReviews} of ${MIN_REVIEWS}`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-7">
                  <ScoreRing
                    value={selectedReviews}
                    max={MIN_REVIEWS}
                    pct={reviewProgress}
                    label="reviews"
                  />
                  <div className="flex-1 w-full grid grid-cols-3 gap-3">
                    <KpiTile
                      label="Reviewed"
                      value={selectedReviews}
                      tone="info"
                    />
                    <KpiTile
                      label="Approvals"
                      value={selectedApprovals}
                      tone="positive"
                    />
                    <KpiTile
                      label="Required"
                      value={MIN_REVIEWS}
                      tone="primary"
                    />
                  </div>
                </div>
              </Section>
            )}

            {isSelectedRejected && (
              <Section
                icon={<AlertTriangle className="w-4 h-4" />}
                title={rejectedDueToTimeout ? "No reviews received in time" : "Did not reach consensus"}
              >
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {rejectedDueToTimeout
                    ? "The voting deadline passed before any guild members completed their review. This is most common in guilds that are low on active reviewers. You can reapply to the same guild or try another guild."
                    : `This application received ${selectedReviews} review${selectedReviews === 1 ? "" : "s"} but did not reach the consensus threshold of ${MIN_REVIEWS} approvals required.`}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <KpiTile label="Reviews" value={selectedReviews} tone="info" />
                  <KpiTile label="Approvals" value={selectedApprovals} tone="positive" />
                  <KpiTile label="Rejections" value={selectedRejections} tone="negative" />
                </div>
              </Section>
            )}

            {isSelectedApproved && selectedGuild && (
              <Section
                icon={<CheckCircle className="w-4 h-4" />}
                title="You're in"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedGuild.name} accepted your application
                  {selectedGuild.role ? ` as a ${selectedGuild.role}` : ""}. Once every
                  pending guild review resolves, you&apos;ll get full access to the expert
                  dashboard.
                </p>
              </Section>
            )}

            {/* Application summary */}
            <Section
              icon={<FileText className="w-4 h-4" />}
              title="Application summary"
            >
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {expert.fullName && (
                  <KeyValue label="Full name" value={expert.fullName} />
                )}
                {expert.email && <KeyValue label="Email" value={expert.email} />}
                {expert.currentTitle && (
                  <KeyValue label="Current title" value={expert.currentTitle} />
                )}
                {expert.currentCompany && (
                  <KeyValue label="Current company" value={expert.currentCompany} />
                )}
                {selectedGuild?.name && (
                  <KeyValue label="Applied to" value={selectedGuild.name} />
                )}
                {expert.bio && (
                  <KeyValue
                    label="Professional bio"
                    value={expert.bio}
                    multiline
                    fullWidth
                  />
                )}
              </div>
            </Section>

            {/* What happens next */}
            <Section
              icon={<Sparkles className="w-4 h-4" />}
              title="What happens next"
            >
              <ol className="space-y-4">
                <NextStep
                  num={1}
                  state={
                    isSelectedApproved
                      ? "completed"
                      : isSelectedRejected
                        ? "completed"
                        : "active"
                  }
                  title={
                    isSelectedRejected && rejectedDueToTimeout
                      ? "Review window closed"
                      : "Reveal & finalize"
                  }
                  description={
                    isSelectedRejected
                      ? rejectedDueToTimeout
                        ? "The voting window closed before guild members completed reviews."
                        : `${selectedReviews} of ${MIN_REVIEWS} required reviews were received before finalization.`
                      : isSelectedApproved
                        ? `Reached consensus from ${selectedReviews} guild reviewers.`
                        : `Guild members commit and reveal their votes. ${selectedReviews} of ${MIN_REVIEWS} reviews completed.`
                  }
                />
                <NextStep
                  num={2}
                  state={
                    isSelectedApproved
                      ? "active"
                      : isSelectedRejected
                        ? "active"
                        : "upcoming"
                  }
                  title={isSelectedRejected ? "Outcome notified" : "Outcome locked in"}
                  description={
                    isSelectedRejected
                      ? "Your outcome has been recorded. You can reapply to this guild or a different one any time."
                      : isSelectedApproved
                        ? `Approved${selectedGuild?.role ? ` as ${selectedGuild.role}` : ""}.`
                        : `Once you receive ${MIN_REVIEWS} approvals, you'll join as a Recruit.`
                  }
                />
                <NextStep
                  num={3}
                  state={isSelectedApproved ? "active" : "upcoming"}
                  title={isSelectedApproved ? "Get to work" : "Onboarding & feedback"}
                  description={
                    isSelectedApproved
                      ? "Access your expert dashboard, start reviewing applications, and stake reputation on every call."
                      : "On approval, you'll receive your dashboard credentials. On rejection, you'll see anonymous feedback."
                  }
                  isLast
                />
              </ol>
            </Section>
          </div>

          {/* Right: sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            <SidebarCard title="Important dates">
              {expert.createdAt && (
                <KeyValue
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Applied"
                  value={formatDate(expert.createdAt)}
                />
              )}
              {selectedGuild?.votingDeadline && (() => {
                const time = getTimeRemaining(selectedGuild.votingDeadline);
                return (
                  <KeyValue
                    icon={<Timer className="w-3.5 h-3.5" />}
                    label="Voting deadline"
                    value={formatDate(selectedGuild.votingDeadline)}
                    hint={time?.label}
                  />
                );
              })()}
              {selectedGuild?.joinedAt && (
                <KeyValue
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  label="Joined"
                  value={formatDate(selectedGuild.joinedAt)}
                />
              )}
            </SidebarCard>

            <SidebarCard title="Identity">
              <KeyValue
                icon={<Wallet className="w-3.5 h-3.5" />}
                label="Wallet"
                value={truncateAddress(address)}
              />
              {expert.email && (
                <KeyValue
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label="Email"
                  value={expert.email}
                />
              )}
            </SidebarCard>

            {hasOnChain && (
              <SidebarCard title="On-chain">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Your application review is secured on the blockchain.
                </p>
                {selectedTxHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${selectedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity",
                      STATUS_COLORS.positive.text,
                    )}
                  >
                    View on Etherscan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </SidebarCard>
            )}

            {isSelectedPending && selectedGuild && (
              <SidebarCard title="Withdraw">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Cancel this application. You can reapply later.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawingId(selectedGuild.id)}
                  className="w-full"
                >
                  Withdraw application
                </Button>
              </SidebarCard>
            )}

            <SidebarCard title="Auto-approval">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Applications need{" "}
                <strong className="text-foreground">{MIN_REVIEWS} reviews</strong> from
                guild members. Reach consensus and you&apos;re in instantly.
              </p>
            </SidebarCard>
          </aside>
        </div>

        {/* ── Bottom CTA ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8 overflow-hidden relative">
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-[2px]",
              isSelectedRejected ? STATUS_COLORS.negative.bg : "bg-primary/40",
            )}
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground tracking-tight">
                {isSelectedRejected ? "Ready to try again?" : "Explore more guilds"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isSelectedRejected
                  ? "You can reapply to the same guild or pick a different one that better matches your expertise."
                  : "Browse available guilds and apply to join more communities."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => router.push("/guilds")}>Browse guilds</Button>
              <Button
                variant="outline"
                onClick={() => router.push("/expert/apply?apply=new")}
                icon={
                  isSelectedRejected ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )
                }
              >
                {isSelectedRejected ? "Reapply" : "Apply"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Withdraw confirmation modal ────────────────────────── */}
        <Modal
          isOpen={!!withdrawingId}
          onClose={() => setWithdrawingId(null)}
          title="Withdraw Application"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure? This will cancel your guild application. You can reapply later.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setWithdrawingId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={withdrawing}
                onClick={() => {
                  if (!withdrawingId) return;
                  withdrawApp(
                    () => expertApi.withdrawGuildApplication(withdrawingId),
                    {
                      onSuccess: () => {
                        toast.success("Application withdrawn");
                        setWithdrawingId(null);
                        refetch();
                      },
                      onError: (err) => toast.error(err),
                    },
                  );
                }}
              >
                {withdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* ─── ScoreRing ─────────────────────────────────────────────────── */

interface ScoreRingProps {
  value: number;
  max: number;
  pct: number;
  label: string;
}

function ScoreRing({ value, max, pct, label }: ScoreRingProps) {
  const size = 132;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-border/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[1.85rem] font-bold tracking-tight text-foreground tabular-nums leading-none">
          {value}
          <span className="text-muted-foreground font-medium text-base">/{max}</span>
        </span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─── KpiTile ───────────────────────────────────────────────────── */

interface KpiTileProps {
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning" | "negative";
}

const KPI_TONE: Record<KpiTileProps["tone"], string> = {
  primary: "text-primary",
  positive: STATUS_COLORS.positive.text,
  info: "text-foreground",
  warning: STATUS_COLORS.warning.text,
  negative: STATUS_COLORS.negative.text,
};

function KpiTile({ label, value, tone }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
      <p
        className={cn(
          "font-display text-xl font-bold tabular-nums leading-tight",
          KPI_TONE[tone],
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}

/* ─── NextStep ──────────────────────────────────────────────────── */

interface NextStepProps {
  num: number;
  title: string;
  description: string;
  state: "completed" | "active" | "upcoming";
  isLast?: boolean;
}

function NextStep({ num, title, description, state, isLast }: NextStepProps) {
  const styles = {
    completed: {
      dot: cn(STATUS_COLORS.positive.bg, "text-white border-transparent"),
      title: "text-foreground",
    },
    active: {
      dot: "bg-primary text-primary-foreground border-primary ring-4 ring-primary/15",
      title: "text-foreground",
    },
    upcoming: {
      dot: "bg-muted text-muted-foreground border-border",
      title: "text-muted-foreground",
    },
  }[state];

  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "w-8 h-8 rounded-full grid place-items-center flex-shrink-0 border text-[11px] font-bold tabular-nums",
            styles.dot,
          )}
        >
          {state === "completed" ? <CheckCircle className="w-4 h-4" /> : num}
        </span>
        {!isLast && <span className="w-px flex-1 min-h-[20px] mt-2 bg-border" />}
      </div>
      <div className="flex-1 pb-1">
        <p className={cn("font-semibold text-sm leading-snug", styles.title)}>{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </li>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}

function Section({ icon, title, meta, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[10.5px] text-muted-foreground tabular-nums font-medium">
            {meta}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ─── SidebarCard ───────────────────────────────────────────────── */

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

/* ─── KeyValue ──────────────────────────────────────────────────── */

interface KeyValueProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
  fullWidth?: boolean;
}

function KeyValue({ icon, label, value, hint, multiline, fullWidth }: KeyValueProps) {
  return (
    <div className={cn("flex items-start gap-3", fullWidth && "sm:col-span-2")}>
      {icon && <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground font-medium leading-snug mt-0.5",
            multiline ? "whitespace-pre-wrap" : "truncate",
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Pill ──────────────────────────────────────────────────────── */

interface PillProps {
  tone: "positive" | "negative" | "warning" | "info" | "neutral";
  children: React.ReactNode;
}

function Pill({ tone, children }: PillProps) {
  const toneClasses: Record<PillProps["tone"], string> = {
    positive: STATUS_COLORS.positive.badge,
    negative: STATUS_COLORS.negative.badge,
    warning: STATUS_COLORS.warning.badge,
    info: "bg-primary/10 text-primary border border-primary/20",
    neutral: "bg-muted/50 text-foreground border border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
