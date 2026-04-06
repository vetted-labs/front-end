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
  Shield,
  ShieldCheck,
  Swords,
  Timer,
  ExternalLink,
  Sparkles,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Divider } from "@/components/ui/divider";
import { PatternBackground } from "@/components/ui/pattern-background";
import { expertApi, ApiError } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertProfile, PendingGuildInfo } from "@/types";

function getTimeRemaining(deadline?: string) {
  if (!deadline) return null;
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Vetting ended", color: STATUS_COLORS.negative.text };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) {
    const color = days > 3 ? STATUS_COLORS.positive.text : STATUS_COLORS.warning.text;
    return { label: hours > 0 ? `${days}d ${hours}h remaining` : `${days}d remaining`, color };
  }
  if (hours > 0) return { label: `${hours}h remaining`, color: STATUS_COLORS.negative.text };
  const minutes = Math.floor(diff / (1000 * 60));
  return { label: `${minutes}m remaining`, color: STATUS_COLORS.negative.text };
}

function buildGuildApplications(expert: ExpertProfile): PendingGuildInfo[] {
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

const MIN_REVIEWS = parseInt(process.env.NEXT_PUBLIC_MIN_REVIEWERS || "5", 10);

/* ─── Timeline Step ───────────────────────────────────────── */

function TimelineStep({
  icon: Icon,
  title,
  description,
  state,
  children,
  isLast,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  state: "completed" | "active" | "upcoming";
  children?: React.ReactNode;
  isLast?: boolean;
}) {
  const styles = {
    completed: {
      dot: `${STATUS_COLORS.positive.bg} text-white`,
      line: STATUS_COLORS.positive.bg,
      card: `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}`,
      title: "text-foreground",
    },
    active: {
      dot: "bg-primary text-white",
      line: "bg-border",
      card: "bg-primary/5 border-primary/30",
      title: "text-foreground",
    },
    upcoming: {
      dot: "bg-muted text-muted-foreground",
      line: "bg-border",
      card: "bg-muted/30 border-border opacity-50",
      title: "text-muted-foreground",
    },
  }[state];

  return (
    <div className="relative flex gap-4">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styles.dot}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && (
          <div className={`w-px flex-1 min-h-[24px] mt-2 ${styles.line}`} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 rounded-xl border p-4 mb-4 ${styles.card}`}>
        <p className={`font-semibold text-sm ${styles.title}`}>{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        {children}
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */

export default function ApplicationPendingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
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
      error?.includes("minimum") || error?.includes("enough members") || error?.includes("members to process");
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        {isInsufficientMembers ? (
          <div className="max-w-md text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Not Enough Guild Members</h2>
            <p className="text-sm text-muted-foreground">
              This guild needs at least {MIN_REVIEWS} members to process applications. Your application
              will be reviewed once more experts join.
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
  const totalReviews = expert.reviewCount ?? 0;
  const reviewProgress = Math.min((totalReviews / MIN_REVIEWS) * 100, 100);
  const hasOnChain = guildApplications.some((g) => g.blockchainSessionCreated);

  return (
    <div className="relative min-h-screen bg-background text-foreground animate-page-enter">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <PatternBackground mask="radial-top" intensity="strong" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero Header ── */}
        <header className="pt-16 pb-10 md:pt-20 md:pb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
            Application Status
          </p>

          <h1 className="font-display font-bold text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-tight text-foreground mb-3">
            Under Guild Review
          </h1>

          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
            Your {pendingApps.length > 1 ? "applications are" : "application is"} being evaluated by
            guild members. Once enough reviews are in, you&apos;ll gain access to the expert dashboard.
          </p>
        </header>

        <Divider className="mb-10" />

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-16">
          {/* ── Left Column: Applications + Progress ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Guild Applications */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
                Your Guild Applications
              </h2>

              <div className="space-y-3">
                {guildApplications.map((guild) => (
                  <article
                    key={guild.id}
                    className="group relative rounded-xl border border-border bg-card px-5 py-4 overflow-hidden"
                  >
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
                          <Swords className="w-5 h-5 text-foreground/60" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{guild.name}</p>
                          {guild.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{guild.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {guild.status === "pending" ? (
                          <>
                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1">
                              <Users className="w-3 h-3" />
                              <span className="tabular-nums font-medium">
                                {guild.reviewCount ?? totalReviews}
                              </span>
                              <span>reviewed</span>
                            </div>
                            {(() => {
                              const time = getTimeRemaining(guild.votingDeadline);
                              return time ? (
                                <span
                                  className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${time.color}`}
                                >
                                  <Timer className="w-3 h-3 flex-shrink-0" />
                                  {time.label}
                                </span>
                              ) : null;
                            })()}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS.warning.badge}`}
                            >
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`text-xs ${STATUS_COLORS.negative.text} hover:opacity-80`}
                              onClick={(e) => { e.stopPropagation(); setWithdrawingId(guild.id); }}
                            >
                              Withdraw
                            </Button>
                          </>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS.positive.badge}`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            {guild.role || "Member"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {guildApplications.length === 0 && (
                  <EmptyState icon={Swords} title="No guild applications found" />
                )}
              </div>
            </section>

            {/* Review Progress */}
            {pendingApps.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Review Progress
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {totalReviews} / {MIN_REVIEWS} reviews
                  </span>
                </div>

                <div className="h-2 bg-border/30 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${reviewProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xl font-bold text-foreground tabular-nums">{totalReviews}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Reviews</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {expert.approvalCount ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Approvals</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xl font-bold text-foreground tabular-nums">{MIN_REVIEWS}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Required</p>
                  </div>
                </div>
              </section>
            )}

            {/* Auto-Approval Info */}
            <section className="rounded-xl border border-border bg-card p-5 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground mb-1">Auto-Approval System</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your application needs{" "}
                    <strong className="text-foreground">{MIN_REVIEWS} reviews</strong> from guild members.
                    Once the consensus threshold is met, you&apos;ll get instant access to the expert
                    dashboard and join as a &quot;Recruit&quot;.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right Column: Timeline ── */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
              Application Timeline
            </h2>

            <div className="relative">
              <TimelineStep
                icon={CheckCircle}
                title="Application Received"
                description="Your application and wallet information have been submitted."
                state="completed"
              />

              {hasOnChain && (() => {
                const onChainApp = guildApplications.find((g) => g.blockchainSessionCreated);
                const txHash = onChainApp?.blockchainSessionTxHash;
                return (
                  <TimelineStep
                    icon={ShieldCheck}
                    title="On-Chain Session Created"
                    description="Your application review is secured on the blockchain."
                    state="completed"
                  >
                    {txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 mt-2 text-xs ${STATUS_COLORS.positive.text} hover:opacity-80 transition-colors`}
                      >
                        View on Etherscan <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </TimelineStep>
                );
              })()}

              <TimelineStep
                icon={CircleDot}
                title="Under Guild Review"
                description={`Guild members are reviewing your credentials. ${totalReviews} of ${MIN_REVIEWS} reviews completed.`}
                state="active"
              >
                {(() => {
                  const deadlines = pendingApps
                    .map((app) => app.votingDeadline)
                    .filter((d): d is string => !!d);
                  if (deadlines.length === 0) return null;
                  const earliest = deadlines.sort()[0];
                  const time = getTimeRemaining(earliest);
                  if (!time) return null;
                  return (
                    <p className={`text-xs font-medium mt-2 flex items-center gap-1.5 ${time.color}`}>
                      <Timer className="w-3 h-3" />
                      {time.label}
                    </p>
                  );
                })()}
              </TimelineStep>

              <TimelineStep
                icon={Mail}
                title="Approval & Access"
                description="Once you receive 3 approvals, you'll join as a Recruit and access the dashboard."
                state="upcoming"
                isLast
              />
            </div>
          </div>
        </div>

        {/* ── Withdraw Confirmation Modal ── */}
        <Modal
          isOpen={!!withdrawingId}
          onClose={() => setWithdrawingId(null)}
          title="Withdraw Application"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
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
                    }
                  );
                }}
              >
                {withdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── Bottom CTA ── */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Explore More Guilds</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse available guilds and apply to join more communities.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => router.push("/guilds")}>
                Browse Guilds
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/expert/apply?apply=new")}
                icon={<Plus className="w-4 h-4" />}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
