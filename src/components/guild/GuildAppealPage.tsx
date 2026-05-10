"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  ShieldAlert,
  FileX2,
  Calendar,
  Clock,
  Gavel,
  Scale,
  ListChecks,
} from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { candidateApi, guildAppealApi } from "@/lib/api";
import { AppealSubmissionForm } from "@/components/guild/AppealSubmissionForm";
import { AppealStatusBanner } from "@/components/guild/AppealStatusBanner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GuildAvatar } from "@/components/ui/guild";
import { STATUS_COLORS } from "@/config/colors";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  GuildApplicationSummary,
  GuildApplicationAppeal,
  AppealStatus,
} from "@/types";

const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = {
  pending: "Pending review",
  reviewing: "Under review",
  upheld: "Rejection upheld",
  overturned: "Overturned — admitted",
};

const APPEAL_STATUS_TONE: Record<AppealStatus, keyof typeof STATUS_COLORS> = {
  pending: "warning",
  reviewing: "info",
  upheld: "negative",
  overturned: "positive",
};

export default function GuildAppealPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const { auth, ready } = useRequireAuth("candidate");

  const {
    data: applications,
    isLoading: appsLoading,
    error: appsError,
  } = useFetch<GuildApplicationSummary[]>(
    () => candidateApi.getGuildApplications(),
    { skip: !ready },
  );

  const rejectedApp =
    applications?.find(
      (app) =>
        (app.guildId === guildId || app.guild?.id === guildId) &&
        app.status === "rejected",
    ) ?? null;

  const {
    data: existingAppeal,
    isLoading: appealLoading,
    error: appealError,
    refetch: refetchAppeal,
  } = useFetch<GuildApplicationAppeal | null>(
    () => guildAppealApi.getAppealByApplication(rejectedApp!.id),
    { skip: !rejectedApp },
  );

  const { data: eligibility, isLoading: eligibilityLoading } = useFetch<{
    eligible: boolean;
    reason?: string;
    minimumStake: number;
  }>(
    () => guildAppealApi.checkAppealEligibility(rejectedApp!.id, auth.userId!),
    { skip: !rejectedApp || !auth.userId || !!existingAppeal },
  );

  if (!ready || appsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (appsError || appealError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert variant="error">
          {appsError || appealError || "Failed to load appeal data."}
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/candidate/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (!rejectedApp) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <EmptyState
          icon={FileX2}
          title="No rejected application found"
          description="You don't have a rejected guild application for this guild, or your application may still be under review."
          action={{
            label: "Back to dashboard",
            onClick: () => router.push("/candidate/dashboard"),
          }}
        />
      </div>
    );
  }

  const guildName = rejectedApp.guildName || rejectedApp.guild?.name || "Guild";
  const candidateName =
    rejectedApp.candidateName || rejectedApp.fullName || "Candidate";
  const isLoadingAppeal = appealLoading || eligibilityLoading;

  const headlineLabel = existingAppeal
    ? APPEAL_STATUS_LABEL[existingAppeal.status]
    : "Application rejected";
  const headlineTone: keyof typeof STATUS_COLORS = existingAppeal
    ? APPEAL_STATUS_TONE[existingAppeal.status]
    : "negative";

  const submittedAt =
    rejectedApp.submittedAt || rejectedApp.createdAt || null;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Hero card ── */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <GuildAvatar guild={guildName} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Appeal · {guildName}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1.5">
                Appeal your application
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                You can challenge the panel&apos;s decision by staking VETD and
                submitting a written justification. Senior guild members will
                arbitrate and a final decision will be recorded on-chain.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.18em]",
                    STATUS_COLORS[headlineTone].badge,
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      STATUS_COLORS[headlineTone].bg,
                    )}
                  />
                  {headlineLabel}
                </span>
                {!existingAppeal && eligibility && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-[10.5px] font-bold uppercase tracking-[0.18em] border border-border">
                    {eligibility.eligible
                      ? `Eligible · min ${eligibility.minimumStake} VETD`
                      : "Not eligible"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Original decision */}
            <Section
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
              title="Original decision"
            >
              <div className="space-y-3 text-sm">
                <p className="text-foreground font-medium">
                  Application to {guildName} was reviewed and rejected.
                </p>
                <p className="text-muted-foreground">
                  {rejectedApp.reviewCount && rejectedApp.reviewCount > 0 ? (
                    <>
                      Reviewed by{" "}
                      <span className="text-foreground font-semibold tabular-nums">
                        {rejectedApp.reviewCount}
                      </span>{" "}
                      expert{rejectedApp.reviewCount === 1 ? "" : "s"}
                      {rejectedApp.approvalCount !== undefined && (
                        <>
                          {" "}·{" "}
                          <span className="text-foreground font-semibold tabular-nums">
                            {rejectedApp.approvalCount}
                          </span>{" "}
                          approve vote
                          {rejectedApp.approvalCount === 1 ? "" : "s"}
                        </>
                      )}
                      .
                    </>
                  ) : (
                    "Detailed reviewer feedback isn't surfaced for candidate-side appeals — submit your justification below to begin arbitration."
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                  <KeyValue
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Submitted"
                    value={
                      submittedAt
                        ? new Date(submittedAt).toLocaleDateString()
                        : "—"
                    }
                  />
                  {rejectedApp.requiredStake !== undefined && (
                    <KeyValue
                      icon={<Scale className="w-3.5 h-3.5" />}
                      label="Required stake"
                      value={`${rejectedApp.requiredStake} VETD`}
                    />
                  )}
                  {rejectedApp.expertiseLevel && (
                    <KeyValue
                      icon={<ListChecks className="w-3.5 h-3.5" />}
                      label="Level"
                      value={rejectedApp.expertiseLevel}
                      capitalize
                    />
                  )}
                </div>
              </div>
            </Section>

            {/* Appeal status / submission */}
            {isLoadingAppeal ? (
              <div className="flex items-center justify-center py-12 rounded-xl border border-border bg-card">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : existingAppeal ? (
              <Section
                icon={<Gavel className="w-3.5 h-3.5" />}
                title="Appeal status"
              >
                <AppealStatusBanner appeal={existingAppeal} />
              </Section>
            ) : eligibility && !eligibility.eligible ? (
              <Section
                icon={<Gavel className="w-3.5 h-3.5" />}
                title="Your appeal"
              >
                <Alert variant="warning">
                  {eligibility.reason ||
                    "You are not eligible to file an appeal for this application."}
                </Alert>
              </Section>
            ) : (
              <Section
                icon={<Gavel className="w-3.5 h-3.5" />}
                title="Your appeal"
              >
                <AppealSubmissionForm
                  applicationId={rejectedApp.id}
                  applicationType="candidate"
                  applicationName={candidateName}
                  guildName={guildName}
                  guildId={guildId}
                  wallet={auth.walletAddress || ""}
                  minimumStake={eligibility?.minimumStake}
                  onSuccess={refetchAppeal}
                />
              </Section>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
            <SidebarCard title="Important dates">
              <KeyValue
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="Submitted"
                value={
                  submittedAt
                    ? new Date(submittedAt).toLocaleDateString()
                    : "—"
                }
              />
              {existingAppeal?.createdAt && (
                <KeyValue
                  icon={<Gavel className="w-3.5 h-3.5" />}
                  label="Appealed"
                  value={formatTimeAgo(existingAppeal.createdAt)}
                />
              )}
              {existingAppeal?.votingDeadline && (
                <KeyValue
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Decision by"
                  value={new Date(
                    existingAppeal.votingDeadline,
                  ).toLocaleDateString()}
                />
              )}
              {existingAppeal?.resolvedAt && (
                <KeyValue
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Resolved"
                  value={formatTimeAgo(existingAppeal.resolvedAt)}
                />
              )}
            </SidebarCard>

            {existingAppeal && (
              <SidebarCard title="Panel">
                <KeyValue
                  icon={<Scale className="w-3.5 h-3.5" />}
                  label="Voted"
                  value={`${existingAppeal.votes.length} / ${existingAppeal.panelSize}`}
                />
                <KeyValue
                  icon={<Gavel className="w-3.5 h-3.5" />}
                  label="Stake at risk"
                  value={`${existingAppeal.stakeAmount} VETD`}
                />
              </SidebarCard>
            )}

            <SidebarCard title="How appeals work">
              <ul className="space-y-2 text-[12px] text-muted-foreground leading-snug">
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  Stake VETD and write a justification (min 100 chars).
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  A panel of senior guild members reviews and votes.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  If overturned, your stake is returned and you&apos;re
                  admitted. If upheld, the stake is forfeited.
                </li>
              </ul>
            </SidebarCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
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
            "text-sm text-foreground font-medium leading-snug tabular-nums",
            capitalize && "capitalize",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
