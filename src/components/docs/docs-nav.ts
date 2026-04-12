import {
  BookOpen,
  Compass,
  Users,
  Building2,
  Shield,
  BookText,
  Sparkles,
  Vote,
  Coins,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export interface DocsNavItem {
  label: string;
  href: string;
  /** Marks a "new" label next to the item */
  isNew?: boolean;
}

export interface DocsNavSection {
  label: string;
  icon: LucideIcon;
  items: DocsNavItem[];
  /** Which persona this section belongs to. "shared" shows for all personas. */
  persona: "experts" | "candidates" | "companies" | "shared";
  /** Default-collapsed on desktop */
  defaultCollapsed?: boolean;
}

/**
 * Single source of truth for the /docs sidebar.
 *
 * Expert links are split into 4 sub-groups (Start here / Core workflows /
 * Economics / Advanced) so the sidebar stays scannable — not a flat wall
 * of 11 items.
 *
 * Order is meaningful — it drives:
 *   - sidebar render order (within the active persona)
 *   - prev/next pagination (via docsFlatOrder)
 *   - breadcrumb section lookup
 */
export const docsNav: DocsNavSection[] = [
  // ── Shared ──
  {
    label: "Getting started",
    icon: Sparkles,
    persona: "shared",
    items: [
      { label: "What is Vetted?", href: "/docs/what-is-vetted" },
      { label: "How it works", href: "/docs/how-it-works" },
      { label: "Quickstart", href: "/docs/quickstart" },
    ],
  },

  // ── Expert (4 sub-groups) ──
  {
    label: "Start here",
    icon: Sparkles,
    persona: "experts",
    items: [
      { label: "Overview", href: "/docs/experts" },
      { label: "Expert quickstart", href: "/docs/experts/quickstart" },
      { label: "Applying to a guild", href: "/docs/experts/applying-to-a-guild" },
    ],
  },
  {
    label: "Core workflows",
    icon: Vote,
    persona: "experts",
    items: [
      { label: "Reviewing candidates", href: "/docs/experts/reviewing-candidates" },
      { label: "Commit-reveal voting", href: "/docs/experts/commit-reveal-voting" },
      { label: "Reputation & ranks", href: "/docs/experts/reputation-and-ranks" },
    ],
  },
  {
    label: "Economics",
    icon: Coins,
    persona: "experts",
    items: [
      { label: "Endorsements", href: "/docs/experts/endorsements" },
      { label: "Slashing & accountability", href: "/docs/experts/slashing-and-accountability" },
      { label: "Earnings & withdrawals", href: "/docs/experts/earnings-and-withdrawals" },
    ],
  },
  {
    label: "Advanced",
    icon: Landmark,
    persona: "experts",
    items: [
      { label: "Governance & proposals", href: "/docs/experts/governance" },
      { label: "Expert FAQ", href: "/docs/experts/faq" },
    ],
  },

  // ── Candidate ──
  {
    label: "For candidates",
    icon: Users,
    persona: "candidates",
    items: [
      { label: "Overview", href: "/docs/candidates" },
      { label: "Candidate quickstart", href: "/docs/candidates/quickstart" },
      { label: "Building your profile", href: "/docs/candidates/profile" },
      { label: "Endorsements & reputation", href: "/docs/candidates/endorsements" },
    ],
  },

  // ── Company ──
  {
    label: "For companies",
    icon: Building2,
    persona: "companies",
    items: [
      { label: "Overview", href: "/docs/companies" },
      { label: "Company quickstart", href: "/docs/companies/quickstart" },
      { label: "Guild-backed vetting", href: "/docs/companies/guild-vetting" },
      { label: "Why Web3 for hiring", href: "/docs/companies/why-web3" },
    ],
  },

  // ── Reference (shared) ──
  {
    label: "Reference",
    icon: BookText,
    persona: "shared",
    items: [
      { label: "Glossary", href: "/docs/glossary" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
];

/** Flat, ordered list of every doc page — used for prev/next navigation. */
export const docsFlatOrder: DocsNavItem[] = docsNav.flatMap((section) => section.items);

export interface DocsAdjacent {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
  section: DocsNavSection | null;
}

/** Look up prev/next siblings for a given doc href (stays within persona boundaries). */
export function getDocsAdjacent(href: string): DocsAdjacent {
  const section =
    docsNav.find((s) => s.items.some((i) => i.href === href)) ?? null;
  const persona = section?.persona ?? null;
  if (!persona) return { prev: null, next: null, section: null };

  // Build a persona-scoped flat order: all sections for this persona + shared
  const personaFlatOrder = docsNav
    .filter((s) => s.persona === persona || s.persona === "shared")
    .flatMap((s) => s.items);

  const index = personaFlatOrder.findIndex((i) => i.href === href);
  if (index === -1) return { prev: null, next: null, section };

  return {
    prev: index > 0 ? personaFlatOrder[index - 1] : null,
    next: index < personaFlatOrder.length - 1 ? personaFlatOrder[index + 1] : null,
    section,
  };
}

export const DOCS_HOME: DocsNavItem = { label: "Docs", href: "/docs" };

/** Quick icon reference for persona cards on the docs landing page. */
export const DOCS_PERSONAS = {
  experts: {
    label: "Experts",
    description:
      "Vet candidates, stake reputation, and earn rewards. The most in-depth path — start here if you're joining a guild.",
    icon: Shield,
    href: "/docs/experts",
    accent: "primary",
  },
  candidates: {
    label: "Candidates",
    description:
      "Get discovered by companies through expert-backed endorsements instead of a traditional resume screen.",
    icon: Users,
    href: "/docs/candidates",
    accent: "positive",
  },
  companies: {
    label: "Companies",
    description:
      "Post a job and receive a guild-vetted shortlist. Hire with confidence backed by on-chain accountability.",
    icon: Building2,
    href: "/docs/companies",
    accent: "info",
  },
} as const;

export const DOCS_TOP_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/docs", icon: BookOpen },
  { label: "How it works", href: "/docs/how-it-works", icon: Compass },
  { label: "Glossary", href: "/docs/glossary", icon: BookText },
];
