"use client";

import Link from "next/link";
import { Zap, Sparkles, Users as UsersIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useFetch } from "@/lib/hooks/useFetch";
import { guildsApi } from "@/lib/api";
import { GuildQueueRow } from "./GuildQueueRow";
import type {
  GuildQueueItem,
  GuildWorkspacePeriodStats,
  GuildWorkspaceQueueResponse,
  GuildWorkspaceStakePosition,
} from "@/types";

interface GuildQueueTabProps {
  guildId: string;
  walletAddress?: string;
  /**
   * Pre-fetched queue payload. Provided by the workspace container so the
   * queue fetch happens once even when the user is on a different tab. When
   * omitted, the tab falls back to fetching on mount (kept so the tab is
   * still usable in isolation, e.g. inside Storybook).
   */
  queueData?: GuildWorkspaceQueueResponse;
  /** Pre-computed stake position from the workspace shell. */
  stakePosition?: GuildWorkspaceStakePosition;
  /** Pre-computed period stats from the workspace shell. */
  periodStats?: GuildWorkspacePeriodStats;
  /** Internal feed posts for the sidebar preview card. */
  internalChatter?: Array<{
    id: string;
    author: string;
    role?: string;
    timeAgo: string;
    body: string;
  }>;
}

interface QueueSidebarData {
  stakePosition?: GuildWorkspaceStakePosition;
  periodStats?: GuildWorkspacePeriodStats;
}

const SECTION_HEADINGS = {
  due_soon: { title: "Due soon", tone: "urgent" as const, hint: "" },
  waiting: { title: "Waiting on you", tone: "warm" as const, hint: "" },
  unclaimed: {
    title: "Unclaimed in this guild",
    tone: "info" as const,
    hint: "first reviewer earns +20% bonus",
  },
};

export function GuildQueueTab({
  guildId,
  walletAddress,
  queueData,
  stakePosition,
  periodStats,
  internalChatter = [],
}: GuildQueueTabProps) {
  // Only fetch on our own when the container didn't pass data in (keeps the
  // tab usable in isolation, e.g. inside Storybook).
  const { data: fetched, isLoading, error } = useFetch(
    () => guildsApi.getMemberQueue(guildId, walletAddress),
    {
      skip: queueData != null,
      // Soft-fail: empty-state when the Phase 5 endpoint isn't ready.
      onError: () => {},
    },
  );
  const data = queueData ?? fetched ?? undefined;

  const items = data?.items ?? [];
  const dueSoon = items.filter((i) => i.bucket === "due_soon");
  const waiting = items.filter((i) => i.bucket === "waiting");
  const unclaimed = items.filter((i) => i.bucket === "unclaimed");
  const sidebar: QueueSidebarData = {
    stakePosition: stakePosition ?? data?.stakePosition,
    periodStats: periodStats ?? data?.periodStats,
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error && !data && (
          <Alert variant="info">
            Your queue is being prepared. Check back shortly.
          </Alert>
        )}

        <Section
          title={SECTION_HEADINGS.due_soon.title}
          tone="urgent"
          countLabel={
            dueSoon.length > 0
              ? `${dueSoon.length} urgent`
              : isLoading
                ? "loading"
                : "0 urgent"
          }
        >
          {dueSoon.length === 0 ? (
            <EmptyRow
              text={isLoading ? "Loading…" : "Nothing urgent. Nice."}
            />
          ) : (
            <div className="space-y-2">
              {dueSoon.map((item) => (
                <GuildQueueRow key={item.id} item={item} variant="hot" />
              ))}
            </div>
          )}
        </Section>

        <Section
          title={SECTION_HEADINGS.waiting.title}
          tone="warm"
          countLabel={waiting.length > 0 ? `${waiting.length} reviews` : ""}
        >
          {waiting.length === 0 ? (
            <EmptyRow
              text={
                isLoading
                  ? "Loading…"
                  : "No reviews waiting on you right now."
              }
            />
          ) : (
            <div className="space-y-2">
              {waiting.map((item) => (
                <GuildQueueRow key={item.id} item={item} variant="warm" />
              ))}
            </div>
          )}
        </Section>

        <Section
          title={SECTION_HEADINGS.unclaimed.title}
          tone="info"
          countLabel={
            unclaimed.length > 0 ? `${unclaimed.length} candidates` : ""
          }
          hint={SECTION_HEADINGS.unclaimed.hint}
          link={
            <Link
              href={`/expert/voting?guildId=${encodeURIComponent(guildId)}`}
              className="text-xs font-medium text-primary"
            >
              Browse queue →
            </Link>
          }
        >
          {unclaimed.length === 0 ? (
            <EmptyRow
              text={
                isLoading
                  ? "Loading…"
                  : "No unclaimed candidates in this guild."
              }
            />
          ) : (
            <div className="space-y-2">
              {unclaimed.map((item) => (
                <GuildQueueRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-3.5">
        <SidebarStakeCard data={sidebar.stakePosition} />
        <SidebarPeriodStatsCard data={sidebar.periodStats} />
        <SidebarStreakCard />
        <SidebarChatterCard guildId={guildId} posts={internalChatter} />
        <SidebarPresenceCard />
      </aside>
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "urgent" | "warm" | "info";
  countLabel?: string;
  hint?: string;
  link?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, tone, countLabel, hint, link, children }: SectionProps) {
  const pillClass =
    tone === "urgent"
      ? "bg-negative/10 text-negative border-negative/30"
      : tone === "warm"
        ? "bg-warning/10 text-warning border-warning/25"
        : "bg-info-blue/10 text-info-blue border-info-blue/30";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
          {countLabel && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${pillClass}`}
            >
              {countLabel}
            </span>
          )}
          {hint && (
            <span className="text-[11px] text-muted-foreground">{hint}</span>
          )}
        </div>
        {link}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SidebarStakeCard({ data }: { data?: GuildWorkspaceStakePosition }) {
  const total = data?.totalStakedVetd ?? 0;
  const inReview = data?.inReviewVetd ?? 0;
  const available = data?.availableVetd ?? 0;
  const atRisk = data?.atRiskVetd ?? 0;
  const lockedPercent = data?.inReviewPercent ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Your stake position
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <StakeCell label="Total staked" value={total} caption="VETD" />
        <StakeCell
          label="In review"
          value={inReview}
          caption={`${Math.round(lockedPercent)}% locked`}
          tone="warning"
        />
        <StakeCell label="Available" value={available} caption="VETD" tone="positive" />
        <StakeCell label="At risk" value={atRisk} caption="slashable" />
      </div>
    </div>
  );
}

function StakeCell({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: number;
  caption: string;
  tone?: "default" | "warning" | "positive";
}) {
  const valueClass =
    tone === "warning"
      ? "text-warning"
      : tone === "positive"
        ? "text-positive"
        : "text-foreground";
  return (
    <div className="rounded-lg bg-muted px-3 py-2.5">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${valueClass}`}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div className="text-[10px] text-muted-foreground">{caption}</div>
    </div>
  );
}

function SidebarPeriodStatsCard({ data }: { data?: GuildWorkspacePeriodStats }) {
  const rows: Array<{ label: string; value: string; tone?: "positive" | "default" }> = [
    { label: "Reviews", value: String(data?.reviews ?? 0) },
    {
      label: "Consensus rate",
      value: `${Math.round(data?.consensusRate ?? 0)}%`,
      tone: "positive",
    },
    {
      label: "Avg conviction",
      value: data?.avgConviction != null ? `${data.avgConviction.toFixed(1)}/10` : "—",
    },
    {
      label: "Reputation",
      value:
        (data?.reputationDelta ?? 0) >= 0
          ? `+${data?.reputationDelta ?? 0}`
          : `${data?.reputationDelta ?? 0}`,
      tone: "positive",
    },
    { label: "Earned", value: `$${data?.earnedUsd ?? 0}` },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Your stats this period
      </div>
      <div className="text-sm">
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-2 ${
              idx === rows.length - 1 ? "" : "border-b border-border"
            }`}
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={`font-display text-base ${
                row.tone === "positive" ? "text-positive" : "text-foreground"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarStreakCard() {
  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.10] to-card p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Zap className="h-3.5 w-3.5 text-primary" />
        On a 5-review streak
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Keep matching consensus to lock in a streak bonus (+50 rep, +5% fee on the next review).
      </p>
    </div>
  );
}

function SidebarChatterCard({
  guildId,
  posts,
}: {
  guildId: string;
  posts: Array<{
    id: string;
    author: string;
    role?: string;
    timeAgo: string;
    body: string;
  }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Internal chatter
        </span>
        <Link
          href={`/expert/guild/${encodeURIComponent(guildId)}?tab=feed`}
          className="text-[11px] font-semibold text-primary"
        >
          Open feed
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No internal posts yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {posts.slice(0, 3).map((post, idx) => (
            <li
              key={post.id}
              className={`pb-3 ${idx === posts.slice(0, 3).length - 1 ? "" : "border-b border-border"}`}
            >
              <div className="text-xs">
                <strong className="text-foreground">{post.author}</strong>
                <span className="ml-1 text-muted-foreground">· {post.timeAgo}</span>
                {post.role && (
                  <span className="ml-1 inline-flex items-center rounded border border-warning/25 bg-warning/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.05em] text-warning">
                    {post.role}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {post.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SidebarPresenceCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <UsersIcon className="h-3 w-3" /> Reviewing nearby
        </span>
        <span className="text-[11px] font-semibold text-primary">
          <Sparkles className="inline h-3 w-3" /> live
        </span>
      </div>
      <ul className="space-y-2 text-xs text-muted-foreground">
        <PresenceRow tone="positive" name="Aisha K." action="reviewing Modal Labs" age="5m" />
        <PresenceRow tone="positive" name="Felix B." action="committed Linear · Staff" age="12m" />
        <PresenceRow tone="warning" name="Chen T." action="away · last review" age="2d" />
      </ul>
    </div>
  );
}

function PresenceRow({
  tone,
  name,
  action,
  age,
}: {
  tone: "positive" | "warning";
  name: string;
  action: string;
  age: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "positive" ? "bg-positive" : "bg-warning"
        }`}
      />
      <span>
        <strong className="text-foreground">{name}</strong> {action} ({age})
      </span>
    </li>
  );
}

// Re-export types so we can sub-prop without forcing parents to import from
// the workspace types module.
export type { GuildQueueItem };
