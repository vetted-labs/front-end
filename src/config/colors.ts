/**
 * Centralized color token system.
 *
 * ALL non-primitive colors in the app come from here.
 * Components import these instead of hardcoding Tailwind color classes.
 *
 * The classes reference CSS custom properties defined in globals.css,
 * which swap automatically between light and dark mode.
 */

// ─── Semantic Status Colors ─────────────────────────────────────────
// Use these for any success/error/warning/info/neutral/pending indicators.

export const STATUS_COLORS = {
  positive: {
    text: "text-positive",
    bg: "bg-positive",
    bgSubtle: "bg-positive/10",
    border: "border-positive/20",
    icon: "text-positive",
    badge: "bg-positive/10 text-positive border border-positive/20",
    dot: "bg-positive",
  },
  negative: {
    text: "text-negative",
    bg: "bg-negative",
    bgSubtle: "bg-negative/10",
    border: "border-negative/20",
    icon: "text-negative",
    badge: "bg-negative/10 text-negative border border-negative/20",
    dot: "bg-negative",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning",
    bgSubtle: "bg-warning/10",
    border: "border-warning/20",
    icon: "text-warning",
    badge: "bg-warning/10 text-warning border border-warning/20",
    dot: "bg-warning",
  },
  info: {
    text: "text-info-blue",
    bg: "bg-info-blue",
    bgSubtle: "bg-info-blue/10",
    border: "border-info-blue/20",
    icon: "text-info-blue",
    badge: "bg-info-blue/10 text-info-blue border border-info-blue/20",
    dot: "bg-info-blue",
  },
  neutral: {
    text: "text-neutral",
    bg: "bg-neutral",
    bgSubtle: "bg-neutral/10",
    border: "border-neutral/20",
    icon: "text-neutral",
    badge: "bg-neutral/10 text-neutral border border-neutral/20",
    dot: "bg-neutral",
  },
  pending: {
    text: "text-primary",
    bg: "bg-primary",
    bgSubtle: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
    badge: "bg-primary/10 text-primary border border-primary/20",
    dot: "bg-primary",
  },
} as const;

export type StatusIntent = keyof typeof STATUS_COLORS;

// ─── Rank Colors ────────────────────────────────────────────────────
// Single source of truth for guild rank colors across all pages.

export const RANK_COLORS = {
  recruit: {
    text: "text-rank-recruit",
    bg: "bg-rank-recruit",
    bgSubtle: "bg-rank-recruit/10",
    border: "border-rank-recruit/20",
    badge: "bg-rank-recruit/10 text-rank-recruit border border-rank-recruit/20",
    dot: "bg-rank-recruit",
    glow: "shadow-[0_0_12px_hsl(var(--rank-recruit)/0.2)]",
  },
  apprentice: {
    text: "text-rank-apprentice",
    bg: "bg-rank-apprentice",
    bgSubtle: "bg-rank-apprentice/10",
    border: "border-rank-apprentice/20",
    badge: "bg-rank-apprentice/10 text-rank-apprentice border border-rank-apprentice/20",
    dot: "bg-rank-apprentice",
    glow: "shadow-[0_0_12px_hsl(var(--rank-apprentice)/0.2)]",
  },
  craftsman: {
    text: "text-rank-craftsman",
    bg: "bg-rank-craftsman",
    bgSubtle: "bg-rank-craftsman/10",
    border: "border-rank-craftsman/20",
    badge: "bg-rank-craftsman/10 text-rank-craftsman border border-rank-craftsman/20",
    dot: "bg-rank-craftsman",
    glow: "shadow-[0_0_12px_hsl(var(--rank-craftsman)/0.2)]",
  },
  officer: {
    text: "text-rank-officer",
    bg: "bg-rank-officer",
    bgSubtle: "bg-rank-officer/10",
    border: "border-rank-officer/20",
    badge: "bg-rank-officer/10 text-rank-officer border border-rank-officer/20",
    dot: "bg-rank-officer",
    glow: "shadow-[0_0_12px_hsl(var(--rank-officer)/0.2)]",
  },
  master: {
    text: "text-rank-master",
    bg: "bg-rank-master",
    bgSubtle: "bg-rank-master/10",
    border: "border-rank-master/20",
    badge: "bg-rank-master/10 text-rank-master border border-rank-master/20",
    dot: "bg-rank-master",
    glow: "shadow-[0_0_12px_hsl(var(--rank-master)/0.2)]",
  },
} as const;

export type GuildRank = keyof typeof RANK_COLORS;

/** Look up rank colors with a fallback for unknown ranks */
export function getRankColors(rank: string) {
  return RANK_COLORS[rank as GuildRank] ?? RANK_COLORS.recruit;
}

// ─── Vote Colors ────────────────────────────────────────────────────

export const VOTE_COLORS = {
  for: {
    button: "bg-positive/15 text-positive border border-positive/30 hover:bg-positive/25",
    bar: "bg-positive",
    text: "text-positive",
  },
  against: {
    button: "bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25",
    bar: "bg-negative",
    text: "text-negative",
  },
  abstain: {
    button: "bg-neutral/15 text-neutral border border-neutral/30 hover:bg-neutral/25",
    bar: "bg-neutral",
    text: "text-neutral",
  },
} as const;

// ─── Notification Colors ────────────────────────────────────────────
// 3-tier priority system: urgent (highlighted bg), normal (brand icon), positive (green).

export const NOTIFICATION_COLORS = {
  /** Deadlines — gets a tinted background for urgency */
  urgent: {
    icon: "bg-primary/12 text-primary",
    bg: "bg-primary/[0.06] border-primary/15",
    title: "text-primary",
  },
  /** Standard actions — proposals, applications, status changes */
  action: {
    icon: "bg-primary/8 text-primary",
    bg: "",
    title: "",
  },
  /** Positive outcomes — rewards, completions */
  positive: {
    icon: "bg-positive/10 text-positive",
    bg: "",
    title: "text-positive",
  },
  /** Fallback */
  default: {
    icon: "bg-muted text-muted-foreground",
    bg: "",
    title: "",
  },
} as const;

export type NotificationPriority = keyof typeof NOTIFICATION_COLORS;

/** Map notification type strings to priority tiers */
export function getNotificationPriority(type: string): NotificationPriority {
  switch (type) {
    case "proposal_deadline":
    case "application_deadline":
      return "urgent";
    case "reward_earned":
    case "application_accepted":
    case "guild_report_ready":
      return "positive";
    case "proposal_new":
    case "application_new":
    case "application_status":
    case "guild_application":
    case "application_received":
    case "application_status_change":
    case "new_message":
    case "meeting_scheduled":
    case "interview_scheduled":
    case "job_recommendation":
    case "weekly_summary":
      return "action";
    default:
      return "default";
  }
}

// ─── Activity Event Colors ──────────────────────────────────────────
// 3 semantic categories: action (brand), positive (green), negative (red).

export const ACTIVITY_COLORS = {
  action: { dot: "bg-primary", text: "text-primary" },
  positive: { dot: STATUS_COLORS.positive.dot, text: STATUS_COLORS.positive.text },
  negative: { dot: STATUS_COLORS.negative.dot, text: STATUS_COLORS.negative.text },
} as const;

/** Map guild activity event types to semantic color categories */
export function getActivityColor(eventType: string) {
  switch (eventType) {
    case "candidate_joined":
    case "member_approved":
    case "candidate_approved":
      return ACTIVITY_COLORS.positive;
    case "member_rejected":
      return ACTIVITY_COLORS.negative;
    default:
      return ACTIVITY_COLORS.action;
  }
}

// ─── Proposal Type Colors ───────────────────────────────────────────

export const PROPOSAL_TYPE_COLORS: Record<string, { bar: string; badge: string }> = {
  parameter_change: {
    bar: "bg-primary",
    badge: STATUS_COLORS.pending.badge,
  },
  guild_master_election: {
    bar: "bg-warning",
    badge: STATUS_COLORS.warning.badge,
  },
  guild_creation: {
    bar: "bg-positive",
    badge: STATUS_COLORS.positive.badge,
  },
  general: {
    bar: "bg-info-blue",
    badge: STATUS_COLORS.info.badge,
  },
};

export function getProposalTypeColors(type: string) {
  return PROPOSAL_TYPE_COLORS[type] ?? {
    bar: "bg-primary",
    badge: STATUS_COLORS.pending.badge,
  };
}

// ─── Urgency / Countdown Colors ─────────────────────────────────────

export function getUrgencyColors(hoursLeft: number | null) {
  if (hoursLeft === null) return STATUS_COLORS.neutral.badge;
  if (hoursLeft <= 0) return "bg-muted text-muted-foreground border border-border";
  if (hoursLeft < 6) return STATUS_COLORS.negative.badge;
  if (hoursLeft < 24) return STATUS_COLORS.warning.badge;
  return STATUS_COLORS.positive.badge;
}

// ─── Match Score Colors ─────────────────────────────────────────────

export function getMatchScoreColors(pct: number) {
  if (pct >= 70) return STATUS_COLORS.positive;
  if (pct >= 40) return STATUS_COLORS.warning;
  return STATUS_COLORS.negative;
}

// ─── Candidate Status Dot Colors ─────────────────────────────────────
// Small 8px colored dots — the ONLY status indicator on candidate rows.

export const CANDIDATE_STATUS_DOT: Record<string, string> = {
  pending: "bg-primary",           // orange
  reviewing: "bg-info-blue",       // blue
  interviewed: "bg-rank-officer",  // purple
  accepted: "bg-positive",         // green
  rejected: "bg-negative",         // red
};

/** Return the dot class for a candidate application status */
export function getCandidateStatusDot(status: string): string {
  return CANDIDATE_STATUS_DOT[status] ?? "bg-neutral";
}

// ─── Surface Utilities (dark mode hierarchy) ────────────────────────
// Use these instead of bg-white/[0.0X] opacity hacks.

export const SURFACE = {
  base: "bg-surface-0",
  card: "bg-surface-1",
  elevated: "bg-surface-2",
  hover: "bg-surface-3",
  border: "border-surface-border",
} as const;

// ─── Guild Badge Colors (Job Listings) ─────────────────────────────
// Color-coded guild badges for job cards and detail pages.
// Uses semantic CSS vars where available, falls back to primary for unknowns.

export const GUILD_BADGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  engineering: {
    bg: "bg-info-blue/10",
    text: "text-info-blue",
    border: "border-info-blue/15",
    dot: "bg-info-blue",
  },
  design: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/15",
    dot: "bg-primary",
  },
  data: {
    bg: "bg-positive/10",
    text: "text-positive",
    border: "border-positive/15",
    dot: "bg-positive",
  },
  security: {
    bg: "bg-negative/10",
    text: "text-negative",
    border: "border-negative/15",
    dot: "bg-negative",
  },
  marketing: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/15",
    dot: "bg-primary",
  },
};

const DEFAULT_GUILD_BADGE = {
  bg: "bg-primary/10",
  text: "text-primary",
  border: "border-primary/15",
  dot: "bg-primary",
};

/** Get guild badge colors by guild name (case-insensitive, strips "Guild" suffix) */
export function getGuildBadgeColors(guildName: string) {
  const key = guildName.replace(/ Guild$/i, "").toLowerCase().trim();
  return GUILD_BADGE_COLORS[key] ?? DEFAULT_GUILD_BADGE;
}

// ─── Stat Icon Colors ───────────────────────────────────────────────
// All stat icons use brand primary — NO per-metric rainbow.

export const STAT_ICON = {
  bg: "bg-primary/[0.08]",
  text: "text-primary",
} as const;

// ─── Leaderboard Podium Colors ──────────────────────────────────────

export const PODIUM_COLORS = {
  1: {
    gradient: "from-rank-master to-rank-officer",
    solid: "bg-rank-master",
    ring: "ring-rank-master/60",
    platform: "from-rank-master/20 to-rank-officer/10",
    platformSolid: "bg-rank-master/15",
    border: "border-rank-master/40",
    label: "text-rank-master",
  },
  2: {
    gradient: "from-rank-recruit to-neutral",
    solid: "bg-rank-recruit",
    ring: "ring-rank-recruit/60",
    platform: "from-rank-recruit/20 to-neutral/10",
    platformSolid: "bg-rank-recruit/15",
    border: "border-rank-recruit/40",
    label: "text-rank-recruit",
  },
  3: {
    gradient: "from-rank-craftsman to-rank-officer",
    solid: "bg-rank-craftsman",
    ring: "ring-rank-craftsman/60",
    platform: "from-rank-craftsman/20 to-rank-officer/10",
    platformSolid: "bg-rank-craftsman/15",
    border: "border-rank-craftsman/40",
    label: "text-rank-craftsman",
  },
} as const;

// ─── Guild Accent Colors (listing page) ─────────────────────────────
// Each guild gets a unique accent.  The `data-guild` attribute on the card
// element drives CSS custom properties (--gc / --gc-rgb) defined in
// globals.css — these are the Tailwind-friendly tokens used in JSX.

export type GuildAccent = {
  /** data-guild attribute value for the CSS hook */
  dataGuild: string;
  /** Tailwind text color — uses the CSS var */
  text: string;
  /** Badge label for optional featured badges */
  badge?: { label: string; variant: "info" | "negative" | "positive" };
};

const GUILD_ACCENT_MAP: Record<string, GuildAccent> = {
  engineering:  { dataGuild: "engineering",  text: "text-[hsl(var(--gc))]", badge: { label: "Most Active",  variant: "info" } },
  design:       { dataGuild: "design",       text: "text-[hsl(var(--gc))]" },
  data:         { dataGuild: "data",         text: "text-[hsl(var(--gc))]" },
  security:     { dataGuild: "security",     text: "text-[hsl(var(--gc))]", badge: { label: "High Demand",  variant: "negative" } },
  marketing:    { dataGuild: "marketing",    text: "text-[hsl(var(--gc))]" },
  devops:       { dataGuild: "devops",       text: "text-[hsl(var(--gc))]", badge: { label: "Growing Fast", variant: "positive" } },
  product:      { dataGuild: "product",      text: "text-[hsl(var(--gc))]" },
  operations:   { dataGuild: "operations",   text: "text-[hsl(var(--gc))]" },
  finance:      { dataGuild: "finance",      text: "text-[hsl(var(--gc))]" },
  people:       { dataGuild: "people",       text: "text-[hsl(var(--gc))]" },
  sales:        { dataGuild: "sales",        text: "text-[hsl(var(--gc))]" },
};

/** Resolve a guild name to its accent config.  Falls back to brand orange. */
export function getGuildAccent(guildName: string): GuildAccent {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").split(/\s/)[0];
  return GUILD_ACCENT_MAP[key] ?? { dataGuild: key, text: "text-primary" };
}

// ─── Guild Detail Accent (for guild detail page) ────────────────────
// Returns the data-guild attribute value for the CSS-var-driven accents
// used by the .guild-detail-page class in globals.css.

export function getGuildDetailAccent(guildName: string): string {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").split(/\s/)[0];
  return key;
}

// ─── Reward Tier Colors ─────────────────────────────────────────────

export const REWARD_TIER_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  Foundation: {
    bg: STATUS_COLORS.neutral.bgSubtle,
    border: STATUS_COLORS.neutral.border,
    text: STATUS_COLORS.neutral.text,
    bar: STATUS_COLORS.neutral.bg,
  },
  Established: {
    bg: STATUS_COLORS.info.bgSubtle,
    border: STATUS_COLORS.info.border,
    text: STATUS_COLORS.info.text,
    bar: STATUS_COLORS.info.bg,
  },
  Authority: {
    bg: STATUS_COLORS.warning.bgSubtle,
    border: STATUS_COLORS.warning.border,
    text: STATUS_COLORS.warning.text,
    bar: STATUS_COLORS.warning.bg,
  },
};

// ─── Guild Hex Colors (for SVG charts / inline styles) ──────────────
// These match the --gc-rgb values in globals.css.

export const GUILD_HEX_COLORS: Record<string, string> = {
  engineering: "#3b82f6",
  design: "#a855f7",
  data: "#14b8a6",
  security: "#ef4444",
  marketing: "#f59e0b",
  devops: "#22c55e",
  product: "#ff6a00",
  operations: "#94a3b8",
  finance: "#f59e0b",
  people: "#a855f7",
  sales: "#22c55e",
};

const DEFAULT_GUILD_HEX = "#ff6a00";

/** Resolve a guild name to a hex color string for SVG/inline styles. */
export function getGuildHexColor(guildName: string): string {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").split(/[\s&,]+/)[0];
  return GUILD_HEX_COLORS[key] ?? DEFAULT_GUILD_HEX;
}
