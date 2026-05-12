"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock,
  XCircle,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { candidateApi, extractApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { cn, formatDate } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import { GuildCard } from "@/components/guild/card";
import { DataSection } from "@/lib/motion";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { RejectionFeedbackCard } from "@/components/candidate/RejectionFeedbackCard";
import type {
  GuildApplicationSummary,
  CandidateRejectionFeedback,
} from "@/types";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CandidateGuilds() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  // eslint-disable-next-line react-hooks/purity -- stable snapshot of current time for waiting-days math, memoized once per mount
  const nowMs = useMemo(() => Date.now(), []);

  const { data: guildApplicationsData, isLoading, refetch } = useFetch(
    () => candidateApi.getGuildApplications(),
    { skip: !ready }
  );

  const guildApplications: GuildApplicationSummary[] = useMemo(
    () =>
      Array.isArray(guildApplicationsData) ? guildApplicationsData : [],
    [guildApplicationsData]
  );

  const rejectedApps = useMemo(
    () =>
      guildApplications.filter(
        (a) => a.status === "rejected" || a.status === "finalized"
      ),
    [guildApplications]
  );

  const { data: rejectionFeedbackData } = useFetch(
    async () => {
      if (rejectedApps.length === 0) return {};
      const feedback: Record<string, CandidateRejectionFeedback> = {};
      await Promise.all(
        rejectedApps.map(async (app) => {
          try {
            const fb = await candidateApi.getGuildApplicationFeedback(app.id);
            if (fb) feedback[app.id] = fb;
          } catch (err) {
            logger.debug(
              "Non-critical: could not load guild feedback",
              extractApiError(err)
            );
          }
        })
      );
      return feedback;
    },
    { skip: !ready || rejectedApps.length === 0 }
  );

  const rejectionFeedback: Record<string, CandidateRejectionFeedback> =
    rejectionFeedbackData ?? {};

  const { execute: resubmit } = useApi<{ id: string }>();

  const counts = useMemo(
    () => ({
      total: guildApplications.length,
      approved: guildApplications.filter((a) => a.status === "approved").length,
      pending: guildApplications.filter((a) => a.status === "pending").length,
    }),
    [guildApplications]
  );

  const sections = useMemo(() => {
    const approved: GuildApplicationSummary[] = [];
    const pending: GuildApplicationSummary[] = [];
    const closed: GuildApplicationSummary[] = [];
    guildApplications.forEach((app) => {
      if (app.status === "approved") approved.push(app);
      else if (app.status === "pending") pending.push(app);
      else closed.push(app);
    });
    return { approved, pending, closed };
  }, [guildApplications]);

  if (!ready) return null;

  const handleResubmit = (appId: string) => {
    resubmit(() => candidateApi.resubmitGuildApplication(appId, {}), {
      onSuccess: () => {
        toast.success("Application resubmitted successfully");
        refetch();
      },
      onError: (err) => toast.error(err),
    });
  };

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Candidate
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
              My guilds
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              Guilds vet candidates collectively — experts stake reputation on
              every approval. Apply to join, and your verified membership unlocks
              exclusive roles.
            </p>
          </div>
          <Button onClick={() => router.push("/guilds")}>
            Explore guilds
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </header>

        <DataSection isLoading={isLoading} skeleton={null}>
          {/* ── KPI tiles ────────────────────────────────────────── */}
          {guildApplications.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <KpiTile
                icon={<Users className="w-5 h-5" />}
                label="Total applied"
                value={counts.total}
                tone="info"
              />
              <KpiTile
                icon={<ShieldCheck className="w-5 h-5" />}
                label="Verified"
                value={counts.approved}
                tone="positive"
              />
              <KpiTile
                icon={<Clock className="w-5 h-5" />}
                label="Pending review"
                value={counts.pending}
                tone="warning"
              />
            </div>
          )}

          {guildApplications.length === 0 ? (
            <EmptyState onBrowse={() => router.push("/guilds")} />
          ) : (
            <>
              {/* ── My guilds ─────────────────────────────────────── */}
              {sections.approved.length > 0 && (
                <Section
                  icon={<ShieldCheck className="w-4 h-4" />}
                  title="My guilds"
                  meta={`${sections.approved.length} verified`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sections.approved.map((app, i) => {
                      const guildId = app.guildId ?? app.guild?.id;
                      const decidedDate = app.submittedAt || app.createdAt;
                      return (
                        <GuildCard
                          key={app.id}
                          variant="candidate"
                          application={app}
                          catalogueIndex={i + 1}
                          statusLabel="APPROVED"
                          cells={[
                            {
                              value: decidedDate ? formatDate(decidedDate) : "—",
                              label: "Decided on",
                            },
                            {
                              value: String(app.reviewersAssigned ?? "—"),
                              label: "Reviewers",
                            },
                            {
                              value: String(app.approvalCount ?? "—"),
                              label: "Approvals",
                              tone: "positive",
                            },
                          ]}
                          onClick={() => guildId && router.push(`/guilds/${guildId}`)}
                        />
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ── Pending applications ─────────────────────────── */}
              {sections.pending.length > 0 && (
                <Section
                  icon={<Clock className="w-4 h-4" />}
                  title="Pending applications"
                  meta={`${sections.pending.length} in review`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sections.pending.map((app, i) => {
                      const guildId = app.guildId ?? app.guild?.id;
                      const submittedAt = app.submittedAt || app.createdAt;
                      const waitingDays = submittedAt
                        ? Math.max(
                            0,
                            Math.floor(
                              (nowMs - new Date(submittedAt).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )
                        : null;
                      return (
                        <GuildCard
                          key={app.id}
                          variant="candidate"
                          application={app}
                          catalogueIndex={i + 1}
                          statusLabel="PENDING"
                          cells={[
                            {
                              value: String(app.reviewersAssigned ?? "—"),
                              label: "Reviewers",
                            },
                            {
                              value: String(
                                app.reviewsCompleted ?? app.reviewCount ?? "—"
                              ),
                              label: "Reviewed",
                            },
                            {
                              value: waitingDays !== null ? String(waitingDays) : "—",
                              unit: waitingDays !== null ? "d" : undefined,
                              label: "Waiting",
                            },
                          ]}
                          onClick={() => guildId && router.push(`/guilds/${guildId}`)}
                        />
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ── Closed / rejected ────────────────────────────── */}
              {sections.closed.length > 0 && (
                <Section
                  icon={<XCircle className="w-4 h-4" />}
                  title="Closed applications"
                  meta={`${sections.closed.length}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sections.closed.map((app, i) => {
                      const guildId = app.guildId ?? app.guild?.id;
                      const feedback = rejectionFeedback[app.id];
                      const isRejected =
                        app.status === "rejected" || app.status === "finalized";
                      const statusLabel = isRejected ? "REJECTED" : "CLOSED";
                      const decidedDate = app.submittedAt || app.createdAt;
                      const outcomeValue =
                        app.approvalCount != null
                          ? String(app.approvalCount)
                          : app.votesFor != null
                          ? String(app.votesFor)
                          : "—";
                      return (
                        <div key={app.id} className="space-y-2">
                          <GuildCard
                            variant="candidate"
                            application={app}
                            catalogueIndex={i + 1}
                            statusLabel={statusLabel}
                            cells={[
                              {
                                value: decidedDate ? formatDate(decidedDate) : "—",
                                label: "Decided on",
                              },
                              {
                                value: String(app.reviewersAssigned ?? "—"),
                                label: "Reviewers",
                              },
                              {
                                value: outcomeValue,
                                label: "Approvals",
                              },
                            ]}
                            onClick={() => guildId && router.push(`/guilds/${guildId}`)}
                          />
                          {feedback && (
                            <RejectionFeedbackCard
                              feedback={feedback}
                              onResubmit={() => handleResubmit(app.id)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ── Discover more ─────────────────────────────────── */}
              <Section
                icon={<Sparkles className="w-4 h-4" />}
                title="Discover more guilds"
              >
                <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Looking for another community?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Browse all guilds, find the one matching your craft, and
                      submit a verification application.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/guilds")}
                    variant="outline"
                  >
                    Browse all guilds
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Section>
            </>
          )}
        </DataSection>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        <ShieldCheck className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        No guild applications yet
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Apply to a guild to be vetted by expert reviewers and unlock access to
        exclusive job opportunities.
      </p>
      <div className="mt-5">
        <Button onClick={onBrowse}>
          Browse guilds
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
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
      {children}
    </section>
  );
}

// ─── KpiTile (shared inline helper) ──────────────────────────────────────────

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const TONE_STYLES: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: STATUS_COLORS.info.bgSubtle, text: STATUS_COLORS.info.text },
  positive: { bg: STATUS_COLORS.positive.bgSubtle, text: STATUS_COLORS.positive.text },
  info: { bg: STATUS_COLORS.info.bgSubtle, text: STATUS_COLORS.info.text },
  warning: { bg: STATUS_COLORS.warning.bgSubtle, text: STATUS_COLORS.warning.text },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const toneClass = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <span
        className={cn(
          "w-10 h-10 rounded-lg grid place-items-center flex-shrink-0",
          toneClass.bg,
          toneClass.text
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}
