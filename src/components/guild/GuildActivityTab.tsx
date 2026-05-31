"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useFetch } from "@/lib/hooks/useFetch";
import { guildsApi } from "@/lib/api";
import type {
  GuildActivity,
  GuildActivityJobApplication,
  GuildActivityJoinedMember,
  GuildActivityPendingReview,
  GuildActivityRejectedMember,
} from "@/types";
import {
  FileText,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Briefcase,
  Award,
  Activity,
  ArrowRight,
  ClipboardList,
  Coins,
  History as HistoryIcon,
  Shield,
  UserPlus,
  X,
  ShieldCheck,
  Send,
  ClipboardCheck,
} from "lucide-react";

/* ── Activity metadata (icon + colors per type) ── */

export const ACTIVITY_META: Record<
  string,
  { label: string; icon: typeof Activity; colorClass: string; badgeClass: string }
> = {
  expert_joined:         { label: "Expert Joined",       icon: ShieldCheck,   colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  candidate_joined:      { label: "Candidate Joined",    icon: UserPlus,      colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  application_submitted: { label: "Application",         icon: Send,          colorClass: STATUS_COLORS.info.text,     badgeClass: STATUS_COLORS.info.badge },
  job_posted:            { label: "Job Posted",           icon: Briefcase,     colorClass: "text-primary",              badgeClass: "bg-primary/10 text-primary border border-primary/20" },
  candidate_approved:    { label: "Candidate Approved",   icon: CheckCircle,   colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  member_approved:       { label: "Member Approved",      icon: CheckCircle,   colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  member_rejected:       { label: "Member Rejected",      icon: XCircle,       colorClass: STATUS_COLORS.negative.text, badgeClass: STATUS_COLORS.negative.badge },
  proposal_submitted:    { label: "Proposal",             icon: FileText,      colorClass: STATUS_COLORS.neutral.text,  badgeClass: STATUS_COLORS.neutral.badge },
  endorsement_given:     { label: "Endorsement",          icon: Award,         colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  expert_applied:        { label: "Expert Applied",       icon: ShieldCheck,   colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  candidate_applied:     { label: "Candidate Applied",    icon: UserPlus,      colorClass: STATUS_COLORS.info.text,     badgeClass: STATUS_COLORS.info.badge },
  application_reviewed:  { label: "Application Reviewed", icon: ClipboardCheck, colorClass: STATUS_COLORS.neutral.text, badgeClass: STATUS_COLORS.neutral.badge },
};

const FALLBACK_META = ACTIVITY_META.endorsement_given;

/* ── Helpers ── */

function groupByDate(activities: GuildActivity[]): Record<string, GuildActivity[]> {
  const grouped: Record<string, GuildActivity[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  activities.forEach((a) => {
    const d = new Date(a.timestamp);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  return grouped;
}

/* ── Component props ── */

interface GuildActivityFeedProps {
  activities: GuildActivity[];
  /** Compact mode hides filter pills and limits height — used in overview sidebars */
  compact?: boolean;
  /** Maximum items to show (default: all) */
  maxItems?: number;
  /** Max height for scrollable container (default: "600px") */
  maxHeight?: string;
  /** Called when user clicks "View all activity" in compact mode */
  onViewAll?: () => void;
}

/* ── Main component ── */

export function GuildActivityFeed({
  activities,
  compact = false,
  maxItems,
  maxHeight = "600px",
  onViewAll,
}: GuildActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const sorted = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sliced = maxItems ? sorted.slice(0, maxItems) : sorted;
  const activeTypes = [...new Set(sliced.map((a) => a.type))];
  const filtered = filter === "all" ? sliced : sliced.filter((a) => a.type === filter);
  const grouped = groupByDate(filtered);

  /* ── Empty state ── */
  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
          <Activity className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  /* ── Compact / sidebar mode ── */
  if (compact) {
    return (
      <div>
        <div
          className="relative pl-5 border-l-2 border-border space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight: maxHeight || "320px" }}
        >
          {sliced.map((activity) => {
            const meta = ACTIVITY_META[activity.type] || FALLBACK_META;
            const Icon = meta.icon;
            return (
              <div key={activity.id} className="relative">
                <div
                  className={`absolute -left-[calc(0.625rem+5px)] top-3 w-2 h-2 rounded-full ring-2 ring-background ${meta.colorClass.replace("text-", "bg-")}`}
                />
                <div className="rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={`w-3.5 h-3.5 ${meta.colorClass}`} />
                    <span className={`text-xs font-medium uppercase tracking-wider ${meta.colorClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground/50 ml-auto">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium">{activity.actor}</span>{" "}
                    <span className="text-muted-foreground">{activity.details}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="mt-3 w-full text-center text-sm text-primary hover:underline"
          >
            View all activity →
          </button>
        )}
      </div>
    );
  }

  /* ── Full mode with filters + timeline ── */
  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
            filter === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          All ({sliced.length})
        </button>
        {activeTypes.map((type) => {
          const meta = ACTIVITY_META[type] || FALLBACK_META;
          const count = sliced.filter((a) => a.type === type).length;
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filter === type
                  ? `${meta.badgeClass} border-current`
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div
          className="overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight }}
        >
          <div className="space-y-8">
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 z-10 bg-background pb-2 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {dateLabel}
                  </span>
                </div>
                <div className="relative pl-6 border-l-2 border-border space-y-2">
                  {items.map((activity) => {
                    const meta = ACTIVITY_META[activity.type] || FALLBACK_META;
                    const Icon = meta.icon;
                    return (
                      <div key={activity.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[calc(0.75rem+5px)] top-3.5 w-2.5 h-2.5 rounded-full ring-2 ring-background ${meta.colorClass.replace("text-", "bg-")}`}
                        />
                        <div className="rounded-xl border border-transparent bg-card px-4 py-3 hover:border-border hover:bg-card transition-all">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.badgeClass} border`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-foreground leading-snug">
                                    <span className="font-medium">{activity.actor}</span>{" "}
                                    <span className="text-muted-foreground">{activity.details}</span>
                                    {activity.target && (
                                      <span className="font-medium"> {activity.target}</span>
                                    )}
                                  </p>
                                  <span
                                    className={`inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${meta.badgeClass} border`}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <span className="flex-shrink-0 text-xs text-muted-foreground/60 mt-0.5">
                                  {formatTimeAgo(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
            <Activity className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground mb-1">No activity matching this filter</p>
          <button onClick={() => setFilter("all")} className="text-sm text-primary hover:underline">
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Guild Activity tab — private workspace surface (VET-101).
 *
 * Distinct from `GuildActivityFeed` (the public guild detail timeline above).
 * Renders three sections from the `GET /api/guilds/:guildId/activity` aggregate
 * (BE-C): Pending reviews (+ Stake-to-Review CTA for non-stakers), History
 * (joined + rejected), and Job applications (linking to the job detail).
 * ────────────────────────────────────────────────────────────────────────── */

interface GuildActivityTabProps {
  guildId: string;
  walletAddress?: string;
  /**
   * Whether the viewer has staked into this guild. Derived by the workspace
   * shell from the on-chain stake position. Gates the "Stake to Review" CTA in
   * the Pending reviews section — staked members already have review access.
   */
  isStaked: boolean;
}

const STAKE_HREF = "/expert/dashboard?openStaking=withdraw";

export function GuildActivityTab({
  guildId,
  walletAddress,
  isStaked,
}: GuildActivityTabProps) {
  const { data, isLoading, error } = useFetch(
    () => guildsApi.getGuildActivity(guildId, walletAddress),
    {
      // Soft-fail so the tab empty-states cleanly if the endpoint is down.
      onError: () => {},
    },
  );

  const pendingReviews = data?.pendingReviews ?? [];
  const rejectedMembers = data?.rejectedMembers ?? [];
  const joinedMembers = data?.joinedMembers ?? [];
  const jobApplications = data?.jobApplications ?? [];

  return (
    <div className="space-y-8">
      {error && !data && (
        <Alert variant="info">
          Guild activity is being prepared. Check back shortly.
        </Alert>
      )}

      {/* 1. Pending reviews */}
      <section>
        <ActivitySectionHead
          icon={ClipboardList}
          title="Pending reviews"
          countLabel={
            pendingReviews.length > 0 ? `${pendingReviews.length}` : undefined
          }
        />

        {!isStaked && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-sm font-bold text-foreground">
                  Stake to Review
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Stake VETD in this guild to review the candidates waiting
                  below. Your stake is returned after reviews, with bonus
                  rewards for voting with the majority.
                </p>
                <Link href={STAKE_HREF} className={buttonVariants()}>
                  <Coins className="mr-2 h-4 w-4" />
                  Stake to Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {isLoading && !data ? (
          <ActivityLoadingRows />
        ) : pendingReviews.length === 0 ? (
          <ActivityEmptyCard text="No candidates are waiting for review right now." />
        ) : (
          <ul className="space-y-2">
            {pendingReviews.map((p) => (
              <PendingReviewRow
                key={p.candidateId || p.candidateName}
                review={p}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 2. History — joined + rejected */}
      <section>
        <ActivitySectionHead icon={HistoryIcon} title="History" />

        <div className="space-y-5">
          <div>
            <HistoryGroupLabel
              text="Joined"
              count={joinedMembers.length}
              tone="positive"
            />
            {isLoading && !data ? (
              <ActivityLoadingRows count={2} />
            ) : joinedMembers.length === 0 ? (
              <ActivityEmptyCard text="No members have joined yet." />
            ) : (
              <ul className="space-y-2">
                {joinedMembers.map((m) => (
                  <JoinedRow key={m.candidateId || m.candidateName} member={m} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <HistoryGroupLabel
              text="Rejected"
              count={rejectedMembers.length}
              tone="negative"
            />
            {isLoading && !data ? (
              <ActivityLoadingRows count={2} />
            ) : rejectedMembers.length === 0 ? (
              <ActivityEmptyCard text="No rejected applications." />
            ) : (
              <ul className="space-y-2">
                {rejectedMembers.map((m) => (
                  <RejectedRow
                    key={m.candidateId || m.candidateName}
                    member={m}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 3. Job applications */}
      <section>
        <ActivitySectionHead
          icon={Briefcase}
          title="Job applications"
          countLabel={
            jobApplications.length > 0 ? `${jobApplications.length}` : undefined
          }
        />
        {isLoading && !data ? (
          <ActivityLoadingRows />
        ) : jobApplications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 py-2">
            <EmptyState
              icon={Briefcase}
              title="No job applications yet"
              description="Applications to jobs posted in this guild will appear here."
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {jobApplications.map((a) => (
              <JobApplicationRow
                key={a.applicationId || a.jobId}
                application={a}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActivitySectionHead({
  icon: Icon,
  title,
  countLabel,
}: {
  icon: typeof ClipboardList;
  title: string;
  countLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </span>
      {countLabel && (
        <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {countLabel}
        </span>
      )}
    </div>
  );
}

function HistoryGroupLabel({
  text,
  count,
  tone,
}: {
  text: string;
  count: number;
  tone: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? STATUS_COLORS.positive.text
      : STATUS_COLORS.negative.text;
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <span className={`text-xs font-semibold ${toneClass}`}>{text}</span>
      <span className="text-xs text-muted-foreground">· {count}</span>
    </div>
  );
}

function PendingReviewRow({ review }: { review: GuildActivityPendingReview }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {review.candidateName}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {review.expertiseLevel ? `${review.expertiseLevel}` : "Candidate"}
          {review.jobTitle ? ` · ${review.jobTitle}` : ""}
        </div>
      </div>
      {review.appliedAt && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatTimeAgo(review.appliedAt)}
        </span>
      )}
    </li>
  );
}

function JoinedRow({ member }: { member: GuildActivityJoinedMember }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STATUS_COLORS.positive.bgSubtle}`}
        >
          <UserPlus className={`h-4 w-4 ${STATUS_COLORS.positive.icon}`} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {member.candidateName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {member.expertiseLevel ? `${member.expertiseLevel} · ` : ""}Joined
          </div>
        </div>
      </div>
      {member.joinedAt && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatTimeAgo(member.joinedAt)}
        </span>
      )}
    </li>
  );
}

function RejectedRow({ member }: { member: GuildActivityRejectedMember }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 opacity-90">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STATUS_COLORS.negative.bgSubtle}`}
        >
          <X className={`h-4 w-4 ${STATUS_COLORS.negative.icon}`} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {member.candidateName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {member.expertiseLevel ? `${member.expertiseLevel} · ` : ""}Rejected
          </div>
        </div>
      </div>
      {(member.rejectedAt || member.appliedAt) && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatTimeAgo(member.rejectedAt ?? member.appliedAt!)}
        </span>
      )}
    </li>
  );
}

function JobApplicationRow({
  application,
}: {
  application: GuildActivityJobApplication;
}) {
  const company = application.companyName
    ? ` at ${application.companyName}`
    : "";
  return (
    <li>
      <Link
        href={`/jobs/${encodeURIComponent(application.jobId)}`}
        className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              <strong className="font-semibold">
                {application.candidateName}
              </strong>{" "}
              applied to{" "}
              <strong className="font-semibold">{application.jobTitle}</strong>
              {company}
            </p>
            {application.appliedAt && (
              <p className="truncate text-xs text-muted-foreground">
                {formatTimeAgo(application.appliedAt)}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </Link>
    </li>
  );
}

function ActivityEmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function ActivityLoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-border bg-card/40"
        />
      ))}
    </div>
  );
}
