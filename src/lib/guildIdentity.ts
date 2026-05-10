import type { VettedIconName } from "@/components/ui/vetted-icon";

/**
 * Canonical guild slug. Eight backend guilds plus an `unknown` fallback
 * the rest of the app uses when the inbound name doesn't match anything.
 */
export type GuildSlug =
  | "engineering"
  | "product"
  | "design"
  | "marketing"
  | "sales"
  | "operations"
  | "finance"
  | "hr";

/**
 * Tailwind utility presets per guild. Concrete colors (not CSS vars) so they
 * survive Tailwind's JIT — every class string here has to be statically
 * present in source for the JIT to keep it.
 */
export interface GuildClasses {
  /** Foreground / text utility (e.g. icon + chip text) */
  text: string;
  /** Tinted translucent background for chips and tiles */
  bg: string;
  /** Solid background — used by the dot variant of pills */
  bgSolid: string;
  /** Tinted border to pair with `bg` */
  border: string;
  /** Same as `bgSolid`; semantic alias for the small status dot */
  dot: string;
  /** Translucent ring for selected interactive states */
  ring: string;
}

export interface GuildIdentity {
  /** Canonical slug, or `"unknown"` when input doesn't resolve */
  slug: GuildSlug | "unknown";
  /** Full backend display name e.g. "Marketing & Growth Guild" */
  displayName: string;
  /** Short label for chips e.g. "Marketing" */
  shortName: string;
  /** Vetted icon to render inside chips / avatars */
  iconName: VettedIconName;
  /** Hex string for charts / SVGs / inline `style={{ color }}` */
  hex: string;
  /** Tailwind class presets — see `GuildClasses` */
  classes: GuildClasses;
  /** One-line summary of who's in the guild */
  description: string;
}

/**
 * Per-slug class presets. Color values match the existing GuildPickerModal
 * palette so users don't see an unexpected re-skin.
 */
const CLASSES: Record<GuildSlug | "unknown", GuildClasses> = {
  engineering: {
    text: "text-sky-400",
    bg: "bg-sky-400/10",
    bgSolid: "bg-sky-400",
    border: "border-sky-400/25",
    dot: "bg-sky-400",
    ring: "ring-sky-400/30",
  },
  product: {
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    bgSolid: "bg-violet-400",
    border: "border-violet-400/25",
    dot: "bg-violet-400",
    ring: "ring-violet-400/30",
  },
  design: {
    text: "text-pink-400",
    bg: "bg-pink-400/10",
    bgSolid: "bg-pink-400",
    border: "border-pink-400/25",
    dot: "bg-pink-400",
    ring: "ring-pink-400/30",
  },
  marketing: {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    bgSolid: "bg-emerald-400",
    border: "border-emerald-400/25",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
  },
  sales: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    bgSolid: "bg-amber-400",
    border: "border-amber-400/25",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
  },
  operations: {
    text: "text-slate-400",
    bg: "bg-slate-400/10",
    bgSolid: "bg-slate-400",
    border: "border-slate-400/25",
    dot: "bg-slate-400",
    ring: "ring-slate-400/30",
  },
  finance: {
    text: "text-lime-400",
    bg: "bg-lime-400/10",
    bgSolid: "bg-lime-400",
    border: "border-lime-400/25",
    dot: "bg-lime-400",
    ring: "ring-lime-400/30",
  },
  hr: {
    text: "text-rose-400",
    bg: "bg-rose-400/10",
    bgSolid: "bg-rose-400",
    border: "border-rose-400/25",
    dot: "bg-rose-400",
    ring: "ring-rose-400/30",
  },
  unknown: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    bgSolid: "bg-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
    ring: "ring-border",
  },
};

/**
 * Canonical identity registry. Names mirror
 * `backend/db/migrations/001_initial_schema.sql:121-129`.
 */
export const GUILD_IDENTITIES: Record<GuildSlug, GuildIdentity> = {
  engineering: {
    slug: "engineering",
    displayName: "Engineering Guild",
    shortName: "Engineering",
    iconName: "engineering",
    hex: "#60a5fa",
    classes: CLASSES.engineering,
    description:
      "Technical Excellence & Innovation — engineers, data, ML, and security review system design and code quality.",
  },
  product: {
    slug: "product",
    displayName: "Product Guild",
    shortName: "Product",
    iconName: "product",
    hex: "#c084fc",
    classes: CLASSES.product,
    description:
      "Strategy & Product Leadership — PMs and product leaders assess roadmap thinking and execution.",
  },
  design: {
    slug: "design",
    displayName: "Design Guild",
    shortName: "Design",
    iconName: "design",
    hex: "#f472b6",
    classes: CLASSES.design,
    description:
      "User-Centered Design & Creativity — senior designers evaluate portfolio quality and design thinking.",
  },
  marketing: {
    slug: "marketing",
    displayName: "Marketing & Growth Guild",
    shortName: "Marketing",
    iconName: "marketing",
    hex: "#34d399",
    classes: CLASSES.marketing,
    description:
      "Growth & Brand Strategy — marketers evaluate campaign strategy, growth metrics, and brand building.",
  },
  sales: {
    slug: "sales",
    displayName: "Sales & Success Guild",
    shortName: "Sales",
    iconName: "sales",
    hex: "#fbbf24",
    classes: CLASSES.sales,
    description:
      "Revenue Growth & Customer Success — sales leaders evaluate deal-closing ability and revenue impact.",
  },
  operations: {
    slug: "operations",
    displayName: "Operations & Strategy Guild",
    shortName: "Operations",
    iconName: "operations",
    hex: "#94a3b8",
    classes: CLASSES.operations,
    description:
      "Efficiency & Strategic Execution — ops experts assess process optimization and cross-functional leadership.",
  },
  finance: {
    slug: "finance",
    displayName: "Finance Legal & Compliance Guild",
    shortName: "Finance",
    iconName: "finance",
    hex: "#4ade80",
    classes: CLASSES.finance,
    description:
      "Financial Strategy, Legal & Compliance — finance and legal pros review modeling, regulation, and risk.",
  },
  hr: {
    slug: "hr",
    displayName: "People HR & Recruitment Guild",
    shortName: "People",
    iconName: "hr",
    hex: "#f87171",
    classes: CLASSES.hr,
    description:
      "Talent & Organizational Development — people leaders evaluate talent strategy and culture building.",
  },
};

const UNKNOWN_IDENTITY: GuildIdentity = {
  slug: "unknown",
  displayName: "Unassigned",
  shortName: "Unassigned",
  iconName: "guilds",
  hex: "#8b94a3",
  classes: CLASSES.unknown,
  description:
    "No guild assigned yet — assignment determines which experts will review candidates.",
};

/**
 * Normalize a raw input (display name, slug, object with `.name`) to a slug.
 * Strips a trailing " Guild" suffix and lowercases. Returns `"unknown"` when
 * no keyword matches.
 */
export function getGuildSlug(name: string): GuildSlug | "unknown" {
  const normalized = name.toLowerCase().replace(/ guild$/i, "").trim();

  if (
    normalized.includes("engineer") ||
    normalized.includes("technology") ||
    normalized.includes("data") ||
    normalized.includes("ml") ||
    normalized.includes("ai")
  ) {
    return "engineering";
  }
  if (normalized.includes("design") || normalized.includes("ux")) {
    return "design";
  }
  if (normalized.includes("product")) {
    return "product";
  }
  if (normalized.includes("market") || normalized.includes("growth")) {
    return "marketing";
  }
  if (normalized.includes("sales") || normalized.includes("success")) {
    return "sales";
  }
  if (normalized.includes("operations") || normalized.includes("strategy")) {
    return "operations";
  }
  if (
    normalized.includes("finance") ||
    normalized.includes("legal") ||
    normalized.includes("compliance")
  ) {
    return "finance";
  }
  if (
    normalized.includes("people") ||
    normalized.includes("hr") ||
    normalized.includes("recruitment")
  ) {
    return "hr";
  }
  return "unknown";
}

/**
 * Resolve any noisy guild reference — slug, full name, "Engineering Guild",
 * `{ name }`, null, undefined — into a stable `GuildIdentity`.
 *
 * The returned identity always has class strings safe to inline in JSX:
 * unmatched inputs fall back to a neutral "unknown" tone so chips don't
 * break visually.
 */
export function getGuildIdentity(
  input: string | { name?: string | null } | null | undefined,
): GuildIdentity {
  if (input == null) return UNKNOWN_IDENTITY;
  const raw = typeof input === "string" ? input : (input.name ?? "");
  if (!raw) return UNKNOWN_IDENTITY;
  const slug = getGuildSlug(raw);
  if (slug === "unknown") {
    // Preserve the caller's original label so chips don't lose their text.
    return { ...UNKNOWN_IDENTITY, displayName: raw, shortName: raw.replace(/ Guild$/i, "") };
  }
  return GUILD_IDENTITIES[slug];
}
