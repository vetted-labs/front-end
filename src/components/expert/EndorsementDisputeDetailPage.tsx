"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { endorsementAccountabilityApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { truncateAddress, formatDate, formatDeadline } from "@/lib/utils";
import type { DisputeDetail } from "@/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  Users,
  User,
  Scale,
  FileText,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { DisputeVoteForm } from "@/components/endorsements/DisputeVoteForm";
import { STATUS_COLORS } from "@/config/colors";

/* ─── Helpers ──────────────────────────────────────────────────── */

function getTimeRemaining(deadline: string) {
  return formatDeadline(deadline, "Expired");
}

function getStatusIntent(status: string) {
  switch (status) {
    case "open":
      return STATUS_COLORS.warning;
    case "resolved":
      return STATUS_COLORS.positive;
    default:
      return STATUS_COLORS.neutral;
  }
}

/* ─── Dispute Timeline ──────────────────────────────────────────── */

type TimelineStep = {
  label: string;
  date?: string | null;
  state: "completed" | "active" | "upcoming";
};

function DisputeTimeline({ dispute }: { dispute: DisputeDetail }) {
  const steps: TimelineStep[] = [
    {
      label: "Filed",
      date: dispute.filed_at,
      state: "completed",
    },
    {
      label: "Panel Assigned",
      date: dispute.panelMembers.length > 0 ? dispute.filed_at : null,
      state: dispute.panelMembers.length > 0 ? "completed" : "upcoming",
    },
    {
      label: "Votes Cast",
      date: null,
      state:
        dispute.status === "resolved"
          ? "completed"
          : dispute.votesSubmitted > 0
            ? "active"
            : "upcoming",
    },
    {
      label: "Resolved",
      date: dispute.resolvedAt,
      state: dispute.status === "resolved" ? "completed" : "upcoming",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary/50 to-primary/20" />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`relative w-4 h-4 rounded-full shrink-0 ${
                    step.state === "completed"
                      ? STATUS_COLORS.positive.bg
                      : step.state === "active"
                        ? "bg-primary"
                        : "border-2 border-muted-foreground/30 bg-transparent"
                  }`}
                >
                  {step.state === "completed" && (
                    <CheckCircle2 className="w-4 h-4 text-card absolute inset-0" />
                  )}
                  {step.state === "active" && (
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                  )}
                </div>
                <div className="text-center min-w-[60px]">
                  <p className={`text-xs font-medium ${step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  {step.state === "completed" && step.date && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDate(step.date)}
                    </p>
                  )}
                  {step.state === "active" && (
                    <p className="text-[10px] text-primary mt-0.5 font-medium">Active</p>
                  )}
                </div>
              </div>
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="flex-1 mx-2 self-start mt-[7px]">
                  <div
                    className={`h-0.5 w-full ${
                      step.state === "completed" && steps[i + 1].state !== "upcoming"
                        ? STATUS_COLORS.positive.bg
                        : "bg-border"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Accent Card Wrapper ──────────────────────────────────────── */

function AccentCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <div className="h-1 bg-gradient-to-r from-primary/50 to-primary/20" />
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ─── Component ────────────────────────────────────────────────── */

export function EndorsementDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();

  const disputeId = params.disputeId as string;

  const fetchDispute = useCallback(
    () => endorsementAccountabilityApi.getHireOutcome(disputeId),
    [disputeId]
  );

  const {
    data: dispute,
    isLoading,
    refetch,
  } = useFetch<DisputeDetail>(fetchDispute, {
    onError: (errorMessage) => {
      toast.error(errorMessage || "Failed to load dispute details");
    },
  });

  const { execute: submitVote } = useApi();
  const { execute: submitAppeal, isLoading: isSubmittingAppeal } = useApi();
  const [appealReasoning, setAppealReasoning] = useState("");

  const handleArbitrationVote = async (
    decision: "uphold" | "dismiss",
    reasoning: string
  ) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    await submitVote(
      () =>
        endorsementAccountabilityApi.submitArbitrationVote(disputeId, {
          decision,
          reasoning,
          wallet: address,
        }),
      {
        onSuccess: () => {
          toast.success("Arbitration vote submitted!");
          refetch();
        },
        onError: (errorMessage) => {
          toast.error(errorMessage || "Failed to submit vote");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="h-8 w-64 bg-muted animate-pulse rounded mt-2" />
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
            <div className="h-32 bg-muted animate-pulse rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
            <div className="h-32 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/expert/dashboard" },
          { label: "Endorsements", href: "/expert/endorsements" },
          { label: "Dispute" },
        ]} />
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold mb-1">Dispute not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            This dispute may have been removed or the ID is invalid.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const canVote =
    dispute.isOnPanel && !dispute.hasVoted && dispute.status === "open";

  // Appeal window: 7 days after resolution
  const resolutionDate = dispute.resolvedAt ? new Date(dispute.resolvedAt) : null;
  const appealDeadline = resolutionDate
    ? new Date(resolutionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const canAppeal = !!(appealDeadline && new Date() < appealDeadline && dispute.status === "resolved");
  const daysLeft = canAppeal && appealDeadline
    ? Math.ceil((appealDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  // 10% of slashed amount -- DisputeDetail has no slashedAmount field, so we surface a placeholder
  const appealFeeDisplay = "10% of slashed amount";

  const handleFileAppeal = async () => {
    if (!appealReasoning.trim()) {
      toast.error("Please provide reasoning for your appeal");
      return;
    }
    await submitAppeal(
      // Appeal endpoint is not yet implemented on the backend
      () => Promise.reject(new Error("not_available")),
      {
        onSuccess: () => {
          toast.success("Appeal submitted successfully");
          refetch();
        },
        onError: () => {
          toast.error("Appeal submission is not yet available");
        },
      }
    );
  };

  const statusIntent = getStatusIntent(dispute.status);
  const votedCount = dispute.panelMembers.filter((m) => m.hasVoted).length;
  const voteProgress = dispute.totalPanelSize > 0
    ? (votedCount / dispute.totalPanelSize) * 100
    : 0;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Dashboard", href: "/expert/dashboard" },
          { label: "Endorsements", href: "/expert/endorsements" },
          { label: `Dispute #${disputeId?.slice(0, 8)}` },
        ]} />

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ─── Hero header card ─── */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="relative">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-mono text-sm font-medium text-primary mb-2">
                  #{disputeId.slice(0, 8)}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  Endorsement Dispute
                </h1>
              </div>
              <Badge
                className={`shrink-0 text-sm px-3 py-1 capitalize ${statusIntent.badge}`}
              >
                {dispute.status}
              </Badge>
            </div>

            <p className="text-base text-muted-foreground leading-relaxed mb-5">
              {dispute.reason}
            </p>

            {/* Metadata chips row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Filed {formatDate(dispute.filed_at)}
              </span>
              {dispute.guildName && (
                <Badge variant="secondary" className="font-normal">
                  {dispute.guildName}
                </Badge>
              )}
              {dispute.candidateName && (
                <span className="inline-flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  {dispute.candidateName}
                </span>
              )}
              {dispute.jobTitle && (
                <span className="inline-flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  {dispute.jobTitle}
                </span>
              )}
            </div>

            {/* Active: countdown + quick stats row */}
            {dispute.status === "open" && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  {getTimeRemaining(dispute.deadline)}
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {dispute.votesSubmitted} of {dispute.totalPanelSize} votes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Resolution Banner ─── */}
        {dispute.resolution && (
          <div
            className={`rounded-xl border-2 p-6 text-center mb-6 ${
              dispute.resolution === "upheld"
                ? `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle}`
                : `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle}`
            }`}
          >
            <h3 className="text-xl font-bold mb-1">
              Dispute {dispute.resolution === "upheld" ? "Upheld" : "Dismissed"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dispute.resolution === "upheld"
                ? "The arbitration panel upheld this dispute. Endorsement rewards will be forfeited."
                : "The arbitration panel dismissed this dispute. Endorsement rewards remain intact."}
            </p>
          </div>
        )}

        {/* ─── Dispute Timeline ─── */}
        <div className="mb-6">
          <DisputeTimeline dispute={dispute} />
        </div>

        {/* ─── Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dispute Details */}
            <AccentCard>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Dispute Details
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Reason
                  </p>
                  <p className="text-foreground leading-relaxed">{dispute.reason}</p>
                </div>

                {dispute.evidence && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Evidence
                    </p>
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-3">
                      <p className="text-sm text-foreground leading-relaxed">{dispute.evidence}</p>
                    </div>
                  </div>
                )}
              </div>
            </AccentCard>

            {/* Hire Context */}
            {(dispute.candidateName || dispute.jobTitle) && (
              <AccentCard>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Hire Context
                  </h3>
                </div>

                <div className="divide-y divide-border">
                  {dispute.candidateName && (
                    <div className="flex justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">Candidate</span>
                      <span className="text-sm font-medium">{dispute.candidateName}</span>
                    </div>
                  )}
                  {dispute.jobTitle && (
                    <div className="flex justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">Job</span>
                      <span className="text-sm font-medium">{dispute.jobTitle}</span>
                    </div>
                  )}
                  {dispute.guildName && (
                    <div className="flex justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">Guild</span>
                      <span className="text-sm font-medium">{dispute.guildName}</span>
                    </div>
                  )}
                  {dispute.hireDate && (
                    <div className="flex justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">Hire Date</span>
                      <span className="text-sm font-medium">{formatDate(dispute.hireDate)}</span>
                    </div>
                  )}
                </div>
              </AccentCard>
            )}

            {/* Panel Members */}
            <AccentCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Arbitration Panel
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {dispute.votesSubmitted} of {dispute.totalPanelSize} votes
                </span>
              </div>

              {/* Vote progress bar */}
              <div className="mb-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      voteProgress >= 100 ? STATUS_COLORS.positive.bg : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(voteProgress, 100)}%` }}
                  />
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {dispute.panelMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          member.hasVoted
                            ? STATUS_COLORS.positive.bg
                            : "border-2 border-muted-foreground/30"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {member.expertName || truncateAddress(member.expertWallet)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.hasVoted && member.vote && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            member.vote === "uphold"
                              ? STATUS_COLORS.negative.badge
                              : STATUS_COLORS.positive.badge
                          }`}
                        >
                          {member.vote}
                        </span>
                      )}
                      {!member.hasVoted && (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccentCard>
          </div>

          {/* Sidebar */}
          <div className="order-first lg:order-none lg:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Panel Status */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />

              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Voting Status
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Deadline
                </span>
                <span className="text-sm font-medium">
                  {getTimeRemaining(dispute.deadline)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Votes
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {dispute.votesSubmitted} / {dispute.totalPanelSize}
                </span>
              </div>

              {/* Vote Breakdown */}
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground">Vote Breakdown</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uphold</span>
                  <span className={`text-sm font-medium tabular-nums ${STATUS_COLORS.negative.text}`}>
                    {dispute.upholdCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dismiss</span>
                  <span className={`text-sm font-medium tabular-nums ${STATUS_COLORS.positive.text}`}>
                    {dispute.dismissCount}
                  </span>
                </div>

                {/* Visual bar if votes exist */}
                {(dispute.upholdCount + dispute.dismissCount) > 0 && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30 flex">
                    <div
                      className={`h-full ${STATUS_COLORS.negative.bg} transition-all duration-500`}
                      style={{
                        width: `${(dispute.upholdCount / (dispute.upholdCount + dispute.dismissCount)) * 100}%`,
                      }}
                    />
                    <div
                      className={`h-full ${STATUS_COLORS.positive.bg} transition-all duration-500`}
                      style={{
                        width: `${(dispute.dismissCount / (dispute.upholdCount + dispute.dismissCount)) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Vote Form */}
            {canVote && (
              <DisputeVoteForm onSubmit={handleArbitrationVote} />
            )}

            {/* Already Voted */}
            {dispute.hasVoted && (
              <div className={`rounded-xl border ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-6`}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-5 h-5 ${STATUS_COLORS.positive.text} shrink-0`} />
                  <div>
                    <p className="text-sm font-medium">
                      You voted: <span className="capitalize">{dispute.myVote}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Your arbitration vote has been recorded.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Appeal Section */}
            {canAppeal && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/50 to-primary/20" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      File an Appeal
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining in the 7-day appeal window
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Appeal fee</span>
                    <span className="font-medium">{appealFeeDisplay}</span>
                  </div>
                  <textarea
                    value={appealReasoning}
                    onChange={(e) => setAppealReasoning(e.target.value)}
                    placeholder="Explain your grounds for appeal..."
                    rows={4}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <Button
                    className="w-full"
                    onClick={handleFileAppeal}
                    disabled={isSubmittingAppeal || !appealReasoning.trim()}
                  >
                    {isSubmittingAppeal ? "Submitting..." : "File Appeal"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
