# Guild Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **No TDD ceremony** — implement → verify (typecheck + relevant tests + dev-server visual check) → commit.

**Goal:** Replace the generic-feeling guild card system with a hero-grade "Catalogue" design — registry numerals, oversized names, member-count hero, mono ticker strip — and consolidate 5 duplicated card implementations into one component with 5 variants.

**Architecture:** New component at `src/components/guild/card/` with a tagged-union `variant` prop. Built alongside the old `GuildCard.tsx`; call-sites migrated one by one; old code deleted at the end. Backend `topMembers` field is **optional in v1**: the new card renders gracefully when it's absent (shows count + skeleton avatars).

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind 4, Vitest, Testing Library, RainbowKit. All colors via the existing token system (`bg-card`, `text-primary`, etc.), all data fetching via `useFetch`/`useApi`, all types from `@/types`.

**Mockup reference (the visual spec):**
- `/Users/svendaneel/Desktop/vetted/front-end/.superpowers/brainstorm/32981-1778572636/content/my-guilds-v4-membercount.html` — workspace variant, full fidelity, all 8 guilds
- `/Users/svendaneel/Desktop/vetted/front-end/.superpowers/brainstorm/32981-1778572636/content/adaptations.html` — marketplace, widget, profile variants

**Design spec:** `docs/superpowers/specs/2026-05-12-guild-card-redesign-design.md`

---

## File structure

**New files (created):**
- `src/config/guildThesis.ts` — static copy library
- `src/lib/monogramHelper.ts` — derive 2-letter monograms from a full name
- `src/components/guild/card/GuildCard.tsx` — main composer with `variant` prop
- `src/components/guild/card/GuildCardHeader.tsx` — registry chip + role pill + right-side status
- `src/components/guild/card/GuildMembersHero.tsx` — big count + avatar stack + sub-caption
- `src/components/guild/card/GuildTickerStrip.tsx` — 3-cell stat row
- `src/components/guild/card/GuildCardWatermark.tsx` — numeric watermark
- `src/components/guild/card/index.ts` — re-exports
- `src/__tests__/guild-card-variants.test.tsx` — smoke test per variant

**Modified files:**
- `src/types/guild.ts` — add optional `topMembers` to `Guild` and `ExpertGuild`
- `src/components/guilds/GuildsOverview.tsx` — swap to new card
- `src/components/dashboard/GuildsSection.tsx` — swap to new card (`widget` variant)
- `src/components/guilds/GuildsListingPage.tsx` — swap inline card to new card (`marketplace` variant), drop inline component
- `src/components/ExpertProfile.tsx` — swap to new card (`profile` variant)
- `src/components/candidate/CandidateGuilds.tsx` — collapse 3 inline status cards into new card (`candidate` variant)
- `src/app/globals.css` — add `.ambient-grid` utility for the card's grid texture

**Deleted at end:**
- `src/components/GuildCard.tsx` (old)
- `src/components/GuildMembershipCard.tsx` (replaced by `profile` variant)

---

## Wave Plan (for parallel subagent execution)

These groups have no file conflicts within them; dispatch each wave in parallel.

- **Wave 0:** Task 1 (thesis), Task 2 (monogram), Task 3 (type extension), Task 4 (globals.css utility) — all parallel
- **Wave 1:** Tasks 5–9 (sub-components + main composer + smoke test) — sequential, all touch `src/components/guild/card/`
- **Wave 2:** Tasks 10–14 (migrate 5 call-sites) — parallel; each touches a different file
- **Wave 3:** Task 15 (cleanup) — must follow Wave 2
- **Wave 4:** Task 16 (review gate)

---

## Wave 0: Foundation (parallel)

### Task 1: Thesis copy library

**Files:**
- Create: `src/config/guildThesis.ts`

- [ ] **Step 1: Write the library**

```ts
/**
 * Guild thesis lines — short, opinionated taglines shown on the new
 * Catalogue-style guild card.
 *
 * Keys are exact guild names as stored in the database. Names with
 * commas/special chars must match exactly. Falls back to the guild's
 * own `description` (or empty string) if no entry is found.
 */
export const GUILD_THESIS: Record<string, string> = {
  "Design":
    "Taste defended in public, with reputation at stake.",
  "Engineering":
    "Software written by people who would stake their reputation on it shipping.",
  "Finance, Legal & Compliance":
    "Numbers, contracts, and consequences — held to peer standard.",
  "Marketing & Growth":
    "Stories that move markets, vetted by people who built them.",
  "Operations & Strategy":
    "The work behind the work — judged by operators.",
  "People, HR & Recruitment":
    "Who you hire becomes who you are — vetted accordingly.",
  "Product":
    "Decisions that ship, defended by people who have shipped.",
  "Sales & Success":
    "Revenue closed by people who can tell the difference.",
};

/**
 * Resolve a thesis line for a guild. Returns the curated line if one
 * exists, otherwise falls back to the guild's stored description, then
 * to an empty string.
 */
export function getGuildThesis(name: string, fallbackDescription?: string): string {
  return GUILD_THESIS[name] ?? fallbackDescription ?? "";
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint -- --max-warnings=0 src/config/guildThesis.ts`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/config/guildThesis.ts
git commit -m "feat(guild-card): add thesis copy library"
```

---

### Task 2: Monogram helper

**Files:**
- Create: `src/lib/monogramHelper.ts`

- [ ] **Step 1: Write the helper**

```ts
/**
 * Derive a 2-character monogram from a full name. Used by the guild
 * card's member avatar stack.
 *
 * - "Sven Daneel" → "SD"
 * - "Cher" → "CH"
 * - "Jean-Paul Sartre" → "JS"
 * - "" / undefined → "··"
 */
export function getMonogram(fullName: string | undefined | null): string {
  if (!fullName) return "··";
  const cleaned = fullName.trim();
  if (!cleaned) return "··";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const single = parts[0];
  return (single[0] + (single[1] ?? single[0])).toUpperCase();
}
```

- [ ] **Step 2: Add a quick unit test**

Create: `src/__tests__/monogram-helper.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getMonogram } from "@/lib/monogramHelper";

describe("getMonogram", () => {
  it("returns initials for two-part names", () => {
    expect(getMonogram("Sven Daneel")).toBe("SD");
  });
  it("handles three+ part names with first and last", () => {
    expect(getMonogram("Jean Paul Sartre")).toBe("JS");
    expect(getMonogram("Mary Jane Watson")).toBe("MW");
  });
  it("doubles up single-letter or single-word names", () => {
    expect(getMonogram("Cher")).toBe("CH");
    expect(getMonogram("A")).toBe("AA");
  });
  it("falls back to ·· for empty/undefined", () => {
    expect(getMonogram(undefined)).toBe("··");
    expect(getMonogram(null)).toBe("··");
    expect(getMonogram("")).toBe("··");
    expect(getMonogram("   ")).toBe("··");
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/__tests__/monogram-helper.test.ts`
Expected: 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/monogramHelper.ts src/__tests__/monogram-helper.test.ts
git commit -m "feat(guild-card): add monogram helper for member avatars"
```

---

### Task 3: Extend Guild types with optional topMembers

**Files:**
- Modify: `src/types/guild.ts` (add field to `Guild` and `ExpertGuild`)

- [ ] **Step 1: Add the type**

In `src/types/guild.ts`, locate the `Guild` interface (around line 4) and add `topMembers` as an optional field. Also add it to `ExpertGuild` (around line 70):

```ts
/** Compact member preview used by the new Catalogue guild card. */
export interface GuildTopMember {
  id: string;
  fullName: string;
  reputation?: number;
}
```

Then update `Guild` and `ExpertGuild` to include:

```ts
  topMembers?: GuildTopMember[];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes (the field is optional; no callers break)

- [ ] **Step 3: Commit**

```bash
git add src/types/guild.ts
git commit -m "feat(guild-card): extend Guild types with optional topMembers"
```

---

### Task 4: Ambient-grid utility in globals.css

**Files:**
- Modify: `src/app/globals.css` (add a utility class at the bottom of the file)

- [ ] **Step 1: Add the utility**

Append to `src/app/globals.css`:

```css
/* Guild card ambient grid texture — a subtle 24px grid behind card content. */
.ambient-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
  background-size: 100% 24px, 24px 100%;
  background-position: 0 0;
  opacity: 0.5;
  pointer-events: none;
}

/* Card watermark numeral — used by the Catalogue guild card. */
.guild-card-watermark {
  font-family: var(--font-mono);
  font-size: 120px;
  line-height: 0.85;
  font-weight: 800;
  color: rgba(255, 106, 0, 0.045);
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  user-select: none;
}
.guild-card-watermark.size-sm { font-size: 90px; }
.guild-card-watermark.size-xs { font-size: 64px; }

/* Subtle pulse for LIVE dot — kept here so it's shared. */
@keyframes guild-card-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.guild-card-live-dot {
  animation: guild-card-pulse 2s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify no lint errors**

Run: `npm run lint -- --max-warnings=0 src/app/globals.css 2>&1 | head -20`
Expected: passes (CSS files might be skipped by ESLint, that's OK)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(guild-card): add ambient-grid + watermark utilities"
```

---

## Wave 1: Build the new card

All Wave 1 tasks touch files under `src/components/guild/card/`. Execute **sequentially** in this order so each task can reference the previously created sub-components.

### Task 5: GuildCardWatermark sub-component

**Files:**
- Create: `src/components/guild/card/GuildCardWatermark.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

interface GuildCardWatermarkProps {
  /** The numeral to render, e.g. 4 → "04", 12 → "12". */
  index: number;
  /** Render-size variant. */
  size?: "default" | "sm" | "xs";
}

/**
 * Low-contrast numeric watermark that anchors the bottom-right of a
 * guild card. Behind everything (z-index 0); does not intercept clicks.
 */
export function GuildCardWatermark({ index, size = "default" }: GuildCardWatermarkProps) {
  const display = String(index).padStart(2, "0");
  const positionClasses =
    size === "default"
      ? "right-[-6px] bottom-8"
      : size === "sm"
      ? "right-[-4px] bottom-[18px]"
      : "right-[-2px] bottom-[6px]";

  return (
    <div
      aria-hidden
      className={cn(
        "absolute pointer-events-none select-none z-0 guild-card-watermark",
        size === "sm" && "size-sm",
        size === "xs" && "size-xs",
        positionClasses,
      )}
    >
      {display}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/card/GuildCardWatermark.tsx
git commit -m "feat(guild-card): add Watermark sub-component"
```

---

### Task 6: GuildCardHeader sub-component

**Files:**
- Create: `src/components/guild/card/GuildCardHeader.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";
import type { ExpertRole } from "@/types";

interface GuildCardHeaderProps {
  /** Registry slug derived from the guild name, e.g. "DESIGN". */
  registrySlug: string;
  /** Padded registry number, e.g. "01". */
  registryNumber: string;
  /** Optional role pill displayed inline with the registry, e.g. "MASTER". */
  role?: ExpertRole;
  /** Right-side status. One of: "live" | { kind: "open", count: number } | "none". */
  status: "live" | { kind: "open"; count: number } | { kind: "applicationStatus"; label: string } | "none";
}

export function GuildCardHeader({
  registrySlug,
  registryNumber,
  role,
  status,
}: GuildCardHeaderProps) {
  return (
    <div className="flex justify-between items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
      <div className="truncate">
        <span>G-{registryNumber} · {registrySlug}</span>
        {role && (
          <span className="text-primary ml-1.5 capitalize">{role}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {status === "live" && (
          <>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-positive shadow-[0_0_8px_theme(colors.positive)] guild-card-live-dot" />
            <span className="text-positive tracking-[0.15em]">LIVE</span>
          </>
        )}
        {typeof status === "object" && status.kind === "open" && (
          <span className="text-primary tracking-[0.18em]">{status.count} OPEN</span>
        )}
        {typeof status === "object" && status.kind === "applicationStatus" && (
          <span className="text-warning tracking-[0.18em]">{status.label}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/card/GuildCardHeader.tsx
git commit -m "feat(guild-card): add Header sub-component"
```

---

### Task 7: GuildMembersHero sub-component

**Files:**
- Create: `src/components/guild/card/GuildMembersHero.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";
import { getMonogram } from "@/lib/monogramHelper";
import type { GuildTopMember } from "@/types";

interface GuildMembersHeroProps {
  /** Total members in the guild. */
  count: number;
  /** Up to 5 members shown as monogram avatars (typically top-rep). */
  topMembers?: GuildTopMember[];
  /** Current user's member id — gets the orange highlight. */
  currentUserId?: string;
  /** Optional sub-caption shown beneath the avatars (mono, 9px). */
  subCaption?: React.ReactNode;
  /** Compact mode (used in dashboard widget). Hides the sub-caption and tightens padding. */
  compact?: boolean;
}

const MAX_VISIBLE = 5;

export function GuildMembersHero({
  count,
  topMembers,
  currentUserId,
  subCaption,
  compact = false,
}: GuildMembersHeroProps) {
  const padded = String(count).padStart(2, "0");
  const visible = (topMembers ?? []).slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, count - visible.length);

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-md bg-primary/[0.04] border border-primary/20 mb-4",
        compact ? "py-2 px-2.5" : "py-3 px-3.5",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-start gap-0.5 border-r border-primary/20 pr-3.5",
          compact ? "min-w-[44px]" : "min-w-[56px]",
        )}
      >
        <span
          className={cn(
            "font-mono font-extrabold leading-[0.9] tracking-[-0.04em] text-primary tabular-nums",
            compact ? "text-2xl" : "text-[30px]",
          )}
        >
          {padded}
        </span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Members
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center">
          {visible.length === 0 ? (
            <span className="font-mono text-[9px] text-muted-foreground/60 tracking-[0.14em] uppercase">
              ——
            </span>
          ) : (
            <>
              {visible.map((m, i) => {
                const isMe = m.id === currentUserId;
                return (
                  <span
                    key={m.id}
                    className={cn(
                      "w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center font-mono border-[1.5px] border-card",
                      i > 0 && "-ml-1.5",
                      isMe
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/30 text-muted-foreground",
                    )}
                    title={m.fullName}
                  >
                    {getMonogram(m.fullName)}
                  </span>
                );
              })}
              {overflow > 0 && (
                <span className="w-5 h-5 flex items-center justify-center text-[8px] text-muted-foreground -ml-1.5 font-mono">
                  +{overflow}
                </span>
              )}
            </>
          )}
        </div>
        {!compact && subCaption && (
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground leading-none">
            {subCaption}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/card/GuildMembersHero.tsx
git commit -m "feat(guild-card): add MembersHero sub-component"
```

---

### Task 8: GuildTickerStrip sub-component

**Files:**
- Create: `src/components/guild/card/GuildTickerStrip.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

export interface TickerCell {
  /** The primary number / value. */
  value: string;
  /** Optional small unit suffix (e.g. "VETD", "USD"). */
  unit?: string;
  /** The label under the value (uppercase, mono). */
  label: string;
  /** Visual tint. */
  tone?: "default" | "accent" | "positive";
}

interface GuildTickerStripProps {
  cells: [TickerCell, TickerCell, TickerCell];
  compact?: boolean;
}

export function GuildTickerStrip({ cells, compact = false }: GuildTickerStripProps) {
  return (
    <div className="grid grid-cols-3 border-t border-border bg-black/25">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "border-r border-border last:border-r-0",
            compact ? "py-2.5 px-3" : "py-2.5 px-3.5",
          )}
        >
          <div
            className={cn(
              "font-mono font-semibold tracking-[-0.01em] tabular-nums leading-none",
              compact ? "text-[13px]" : "text-[15px]",
              cell.tone === "accent" && "text-primary",
              cell.tone === "positive" && "text-positive",
              (cell.tone === "default" || !cell.tone) && "text-foreground",
            )}
          >
            {cell.value}
            {cell.unit && (
              <span className="ml-1 text-[10px] text-muted-foreground font-medium tracking-[0.04em]">
                {cell.unit}
              </span>
            )}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/card/GuildTickerStrip.tsx
git commit -m "feat(guild-card): add TickerStrip sub-component"
```

---

### Task 9: GuildCard main composer (all 5 variants) + index

**Files:**
- Create: `src/components/guild/card/GuildCard.tsx`
- Create: `src/components/guild/card/index.ts`

- [ ] **Step 1: Write the main composer**

Create `src/components/guild/card/GuildCard.tsx`. The file is ~250 lines and implements all 5 variants. Use the sub-components from Tasks 5–8.

```tsx
"use client";

import { cn, formatVetd } from "@/lib/utils";
import { getGuildThesis } from "@/config/guildThesis";
import { GuildCardWatermark } from "./GuildCardWatermark";
import { GuildCardHeader } from "./GuildCardHeader";
import { GuildMembersHero } from "./GuildMembersHero";
import { GuildTickerStrip } from "./GuildTickerStrip";
import type {
  Guild,
  ExpertGuild,
  GuildApplicationSummary,
  ExpertRole,
} from "@/types";

/* ─── Variant types ──────────────────────────────────────────────── */

type WorkspaceProps = {
  variant: "workspace";
  guild: ExpertGuild;
  /** Index of this guild within the user's "My Guilds" list (1-based, for the registry number + watermark). */
  catalogueIndex: number;
  currentUserId?: string;
  stakedAmount?: string;
  onClick?: () => void;
};

type MarketplaceProps = {
  variant: "marketplace";
  guild: Guild;
  catalogueIndex: number;
  onClick?: () => void;
};

type WidgetProps = {
  variant: "widget";
  guild: ExpertGuild;
  catalogueIndex: number;
  currentUserId?: string;
  stakedAmount?: string;
  onClick?: () => void;
};

type ProfileProps = {
  variant: "profile";
  guild: ExpertGuild;
  catalogueIndex: number;
  onClick?: () => void;
};

type CandidateProps = {
  variant: "candidate";
  application: GuildApplicationSummary;
  catalogueIndex: number;
  statusLabel: string;
  /** Three ticker cells; caller decides which dates/counts to surface. */
  cells: Parameters<typeof GuildTickerStrip>[0]["cells"];
  onClick?: () => void;
};

export type GuildCardProps =
  | WorkspaceProps
  | MarketplaceProps
  | WidgetProps
  | ProfileProps
  | CandidateProps;

/* ─── Shell ──────────────────────────────────────────────────────── */

function CardShell({
  children,
  onClick,
  ariaLabel,
  hasPendingBanner,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  hasPendingBanner?: boolean;
}) {
  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-border bg-card",
        "transition-colors duration-200 hover:border-border/80",
        onClick && "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <div aria-hidden className="absolute inset-0 ambient-grid" />
      {children}
    </article>
  );
}

function PendingBanner({ count }: { count: number }) {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-warning/[0.07] border-b border-warning/20 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-warning">
      <span className="font-bold">&gt;</span>
      <span>{count} pending review{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

function CardNameBlock({ name, thesis }: { name: string; thesis: string }) {
  return (
    <>
      <div className="w-8 h-px bg-primary mb-3.5" />
      <h3 className="font-display text-[22px] font-bold tracking-[-0.025em] leading-[1.05] mb-1.5 text-foreground">
        {name}.
      </h3>
      {thesis && (
        <p className="font-serif italic text-[12px] text-muted-foreground leading-[1.35] mb-4 max-w-[88%]">
          "{thesis}"
        </p>
      )}
    </>
  );
}

/* ─── Slug helper ────────────────────────────────────────────────── */

function toRegistrySlug(name: string): string {
  // "Finance, Legal & Compliance" → "FINANCE"
  return name.split(/[,&]/)[0].trim().toUpperCase();
}

/* ─── Main composer ──────────────────────────────────────────────── */

export function GuildCard(props: GuildCardProps) {
  const idx = String(props.catalogueIndex).padStart(2, "0");

  /* — workspace variant — */
  if (props.variant === "workspace") {
    const { guild, currentUserId, stakedAmount, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const thesis = getGuildThesis(guild.name, guild.description);
    const pending = guild.pendingProposals ?? 0;
    const tenureDays = guild.joinedAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(guild.joinedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;
    const reviewedRecent = guild.closedProposals ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild — workspace`}>
        {pending > 0 && <PendingBanner count={pending} />}
        <GuildCardWatermark index={props.catalogueIndex} />
        <div className={cn("relative z-10", pending > 0 ? "pt-9 px-5 pb-0" : "p-5 pb-0")}>
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            role={guild.expertRole}
            status="live"
          />
          <CardNameBlock name={guild.name} thesis={thesis} />
          <GuildMembersHero
            count={guild.memberCount ?? 0}
            topMembers={guild.topMembers}
            currentUserId={currentUserId}
            subCaption={
              <>
                <span className="text-foreground/80">{reviewedRecent}</span>{" "}
                reviewed
                {tenureDays !== null && (
                  <>
                    <span className="text-border mx-1.5">·</span>
                    <span className="text-foreground/80">{tenureDays}d</span>{" "}
                    tenure
                  </>
                )}
              </>
            }
          />
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: stakedAmount
                ? parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })
                : "0",
              unit: "VETD",
              label: "Staked",
              tone: "accent",
            },
            {
              value: `$${formatVetd(guild.totalEarnings ?? 0)}`,
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Reputation",
            },
          ]}
        />
      </CardShell>
    );
  }

  /* — marketplace variant — */
  if (props.variant === "marketplace") {
    const { guild, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const thesis = getGuildThesis(guild.name, guild.description);
    const open = guild.openPositions ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild`}>
        <GuildCardWatermark index={props.catalogueIndex} />
        <div className="relative z-10 p-5 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status={open > 0 ? { kind: "open", count: open } : "live"}
          />
          <CardNameBlock name={guild.name} thesis={thesis} />
          <GuildMembersHero
            count={guild.expertCount ?? guild.totalMembers ?? 0}
            topMembers={guild.topMembers}
            subCaption={<><span className="text-foreground/80">Top-rep</span> reviewers shown</>}
          />
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: String(guild.expertCount ?? 0),
              label: "Experts",
            },
            {
              value: String(guild.totalProposalsReviewed ?? 0),
              label: "Reviewed",
            },
            {
              value: String(open),
              label: "Open Roles",
              tone: "accent",
            },
          ]}
        />
      </CardShell>
    );
  }

  /* — widget variant (compact) — */
  if (props.variant === "widget") {
    const { guild, currentUserId, stakedAmount, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const pending = guild.pendingProposals ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild — widget`}>
        {pending > 0 && <PendingBanner count={pending} />}
        <GuildCardWatermark index={props.catalogueIndex} size="sm" />
        <div className={cn("relative z-10", pending > 0 ? "pt-9 px-4 pb-0" : "p-4 pb-0")}>
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            role={guild.expertRole}
            status="live"
          />
          <div className="w-8 h-px bg-primary mb-3" />
          <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] mb-3 text-foreground">
            {guild.name}.
          </h3>
          <GuildMembersHero
            compact
            count={guild.memberCount ?? 0}
            topMembers={guild.topMembers}
            currentUserId={currentUserId}
          />
        </div>
        <GuildTickerStrip
          compact
          cells={[
            {
              value: stakedAmount
                ? parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "0",
              unit: "V",
              label: "Staked",
              tone: "accent",
            },
            {
              value: `$${formatVetd(guild.totalEarnings ?? 0)}`,
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Rep",
            },
          ]}
        />
      </CardShell>
    );
  }

  /* — profile variant — */
  if (props.variant === "profile") {
    const { guild, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const tenureDays = guild.joinedAt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(guild.joinedAt).getTime()) / (1000 * 60 * 60 * 24)),
        )
      : null;
    const joinedLabel = guild.joinedAt
      ? new Date(guild.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : null;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} — guild position`}>
        <GuildCardWatermark index={props.catalogueIndex} size="sm" />
        <div className="relative z-10 p-4 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status="none"
          />
          <div className="w-8 h-px bg-primary mb-3" />
          <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] mb-1 text-foreground">
            {guild.name}.
          </h3>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground mt-1 mb-3">
            <span className="text-primary capitalize">{guild.expertRole}</span>
            {joinedLabel && (
              <>
                <span className="text-border mx-1.5">·</span>
                <span>Member since {joinedLabel}</span>
              </>
            )}
            {tenureDays !== null && (
              <>
                <span className="text-border mx-1.5">·</span>
                <span>{tenureDays}d tenure</span>
              </>
            )}
          </div>
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: "—",
              unit: "VETD",
              label: "Staked",
              tone: "accent",
            },
            {
              value: `$${formatVetd(guild.totalEarnings ?? 0)}`,
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Reputation",
            },
          ]}
        />
      </CardShell>
    );
  }

  /* — candidate variant — */
  if (props.variant === "candidate") {
    const { application, statusLabel, cells, onClick } = props;
    const name = application.guildName ?? application.guild?.name ?? "Guild";
    const slug = toRegistrySlug(name);
    const thesis = getGuildThesis(name);
    return (
      <CardShell onClick={onClick} ariaLabel={`${name} guild — application ${statusLabel.toLowerCase()}`}>
        <GuildCardWatermark index={props.catalogueIndex} size="sm" />
        <div className="relative z-10 p-5 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status={{ kind: "applicationStatus", label: statusLabel }}
          />
          <CardNameBlock name={name} thesis={thesis} />
        </div>
        <GuildTickerStrip cells={cells} />
      </CardShell>
    );
  }

  return null;
}
```

- [ ] **Step 2: Write the index re-export**

Create `src/components/guild/card/index.ts`:

```ts
export { GuildCard } from "./GuildCard";
export type { GuildCardProps } from "./GuildCard";
export { GuildCardHeader } from "./GuildCardHeader";
export { GuildMembersHero } from "./GuildMembersHero";
export { GuildTickerStrip } from "./GuildTickerStrip";
export { GuildCardWatermark } from "./GuildCardWatermark";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 4: Smoke render — write a quick test**

Create `src/__tests__/guild-card-variants.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuildCard } from "@/components/guild/card";
import type { ExpertGuild, Guild } from "@/types";

const baseExpertGuild: ExpertGuild = {
  id: "g-1",
  name: "Engineering",
  description: "",
  memberCount: 8,
  expertRole: "master",
  reputation: 500,
  totalEarnings: 0,
  joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 47).toISOString(),
  pendingProposals: 1,
  ongoingProposals: 0,
  closedProposals: 12,
  topMembers: [
    { id: "m1", fullName: "Sven Kim" },
    { id: "m2", fullName: "Jane Marx" },
  ],
};

const basePublicGuild: Guild = {
  id: "g-1",
  name: "Engineering",
  description: "",
  expertCount: 48,
  totalProposalsReviewed: 1247,
  openPositions: 6,
};

describe("GuildCard variants render", () => {
  it("workspace shows pending banner, name, members hero, and ticker", () => {
    render(
      <GuildCard
        variant="workspace"
        guild={baseExpertGuild}
        catalogueIndex={2}
        currentUserId="m1"
      />,
    );
    expect(screen.getByText(/pending review/i)).toBeInTheDocument();
    expect(screen.getByText("Engineering.")).toBeInTheDocument();
    expect(screen.getByText("08")).toBeInTheDocument(); // member count
    expect(screen.getByText("Staked")).toBeInTheDocument();
  });
  it("marketplace shows N OPEN tag and 'Experts' label", () => {
    render(
      <GuildCard variant="marketplace" guild={basePublicGuild} catalogueIndex={2} />,
    );
    expect(screen.getByText(/6 OPEN/)).toBeInTheDocument();
    expect(screen.getByText("Experts")).toBeInTheDocument();
  });
  it("widget compact still shows name and ticker", () => {
    render(
      <GuildCard
        variant="widget"
        guild={baseExpertGuild}
        catalogueIndex={2}
        currentUserId="m1"
      />,
    );
    expect(screen.getByText("Engineering.")).toBeInTheDocument();
    expect(screen.getByText("Rep")).toBeInTheDocument();
  });
  it("profile shows tenure row, hides member hero", () => {
    render(
      <GuildCard variant="profile" guild={baseExpertGuild} catalogueIndex={2} />,
    );
    expect(screen.getByText(/Member since/i)).toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/__tests__/guild-card-variants.test.tsx`
Expected: 4 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/guild/card/ src/__tests__/guild-card-variants.test.tsx
git commit -m "feat(guild-card): add main composer with 5 variants + smoke tests"
```

---

## Wave 2: Migrate call-sites (parallelizable)

Each of Tasks 10–14 touches a different file. Dispatch all five in parallel.

### Task 10: Migrate GuildsOverview (workspace)

**Files:**
- Modify: `src/components/guilds/GuildsOverview.tsx`

- [ ] **Step 1: Read the file to find the current `GuildCard` usage**

Run: `grep -n "GuildCard\b" src/components/guilds/GuildsOverview.tsx`
Expected: shows the import + 1–2 render sites

- [ ] **Step 2: Replace the import and the render**

- Replace `import { GuildCard } from "@/components/GuildCard";` with `import { GuildCard } from "@/components/guild/card";`
- Replace each `<GuildCard guild={guild} variant="browse" … />` invocation with:

```tsx
<GuildCard
  variant="workspace"
  guild={guild}
  catalogueIndex={i + 1}
  currentUserId={currentUser?.id}
  stakedAmount={guild.stakedAmount}
  onClick={() => router.push(`/expert/guilds/${guild.id}`)}
/>
```

(where `i` is the map index — change the surrounding `.map((guild) => …)` to `.map((guild, i) => …)`)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 4: Visual verify**

Run: `npm run dev` (in another shell)
Navigate to: `http://localhost:3000/expert/guilds`
Verify: cards render in the new Catalogue style, member-count hero is visible, pending banner appears for any guild with `pendingProposals > 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/guilds/GuildsOverview.tsx
git commit -m "feat(guild-card): migrate My Guilds to new workspace variant"
```

---

### Task 11: Migrate dashboard widget

**Files:**
- Modify: `src/components/dashboard/GuildsSection.tsx`

- [ ] **Step 1: Read the current usage**

Run: `grep -n "GuildCard\b" src/components/dashboard/GuildsSection.tsx`
Expected: shows the import + a `.map(…)` render

- [ ] **Step 2: Replace the import + render**

- Import: `import { GuildCard } from "@/components/guild/card";`
- Render block:

```tsx
{displayed.map((guild, i) => (
  <GuildCard
    key={guild.id}
    variant="widget"
    guild={guild}
    catalogueIndex={i + 1}
    stakedAmount={guildStakes[guild.id]}
    onClick={() => router.push(`/expert/guilds/${guild.id}`)}
  />
))}
```

- [ ] **Step 3: Typecheck + visual**

Run: `npx tsc --noEmit`
Then `npm run dev`, navigate to dashboard, verify the "Your Guilds" widget shows compact Catalogue cards.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/GuildsSection.tsx
git commit -m "feat(guild-card): migrate dashboard widget to new widget variant"
```

---

### Task 12: Migrate marketplace listing (collapse inline duplicate)

**Files:**
- Modify: `src/components/guilds/GuildsListingPage.tsx`

- [ ] **Step 1: Locate the inline `GuildCard` defined at the bottom of the file**

Run: `grep -n "function GuildCard\b" src/components/guilds/GuildsListingPage.tsx`
Expected: a `function GuildCard(...)` near the end of the file

- [ ] **Step 2: Delete the inline component**

Delete the entire local `function GuildCard({ guild, onClick }: GuildCardProps) { … }` and its `interface GuildCardProps` from the bottom of the file. Also remove now-unused imports (`GuildAvatar`, `ArrowUpRight` if only used by the inline, etc.) — keep what's still referenced elsewhere on the page.

- [ ] **Step 3: Replace the render in the grid**

Add to imports at top: `import { GuildCard } from "@/components/guild/card";`
Replace the grid `.map(…)` block (currently lines ~196-204) with:

```tsx
{pageGuilds.map((guild, i) => (
  <GuildCard
    key={guild.id}
    variant="marketplace"
    guild={guild}
    catalogueIndex={(currentPage - 1) * PER_PAGE + i + 1}
    onClick={() => navigateToGuild(guild.id)}
  />
))}
```

- [ ] **Step 4: Typecheck + visual**

Run: `npx tsc --noEmit`
Then `npm run dev`, navigate to `/guilds`, verify the marketplace cards render in Catalogue style with the `N OPEN` tag.

- [ ] **Step 5: Commit**

```bash
git add src/components/guilds/GuildsListingPage.tsx
git commit -m "feat(guild-card): migrate marketplace + drop inline duplicate"
```

---

### Task 13: Migrate ExpertProfile (profile variant)

**Files:**
- Modify: `src/components/ExpertProfile.tsx`

- [ ] **Step 1: Locate current usage**

Run: `grep -n "GuildCard\|GuildMembershipCard" src/components/ExpertProfile.tsx`
Expected: imports + 1 render block

- [ ] **Step 2: Replace import + render**

- Import: `import { GuildCard } from "@/components/guild/card";`
- Remove the `GuildMembershipCard` import if it exists.
- Replace each rendered guild membership card with:

```tsx
<GuildCard
  variant="profile"
  guild={guild}
  catalogueIndex={i + 1}
  onClick={() => router.push(`/guilds/${guild.id}`)}
/>
```

- [ ] **Step 3: Typecheck + visual**

Run: `npx tsc --noEmit`
Visit any expert profile page, verify the "Guild Positions" section renders Catalogue profile-variant cards.

- [ ] **Step 4: Commit**

```bash
git add src/components/ExpertProfile.tsx
git commit -m "feat(guild-card): migrate ExpertProfile to new profile variant"
```

---

### Task 14: Migrate CandidateGuilds (collapse 3 inline status cards)

**Files:**
- Modify: `src/components/candidate/CandidateGuilds.tsx`

- [ ] **Step 1: Find the three inline card renders**

Run: `grep -n "rounded-\|className=\".*bg-card" src/components/candidate/CandidateGuilds.tsx | head -20`
Expected: shows the inline card markup at the three render sites (approved / pending / closed sections)

- [ ] **Step 2: Replace each inline render with the new `candidate` variant**

- Import: `import { GuildCard } from "@/components/guild/card";`
- For each status section, build the ticker cells appropriate to that status. Example for the **pending** section:

```tsx
<GuildCard
  variant="candidate"
  application={app}
  catalogueIndex={i + 1}
  statusLabel="PENDING"
  cells={[
    { value: app.reviewersAssigned?.toString() ?? "—", label: "Reviewers" },
    { value: app.reviewsCompleted?.toString() ?? "0", label: "Reviewed" },
    {
      value: app.submittedAt
        ? `${Math.floor((Date.now() - new Date(app.submittedAt).getTime()) / (1000*60*60*24))}d`
        : "—",
      label: "Waiting",
    },
  ]}
  onClick={() => router.push(`/guilds/${app.guild?.id ?? app.guildId}`)}
/>
```

For **approved**: ticker = `Approved on / Reviewers / Final rating` (use whatever the underlying summary exposes). For **closed/rejected**: `Decided on / Reviewers / Outcome`.

- [ ] **Step 3: Typecheck + visual**

Run: `npx tsc --noEmit`
Navigate to `/candidate/guilds`, verify each status section renders Catalogue candidate-variant cards.

- [ ] **Step 4: Commit**

```bash
git add src/components/candidate/CandidateGuilds.tsx
git commit -m "feat(guild-card): collapse candidate-side cards into new variant"
```

---

## Wave 3: Cleanup

### Task 15: Delete old GuildCard + GuildMembershipCard

**Files:**
- Delete: `src/components/GuildCard.tsx`
- Delete: `src/components/GuildMembershipCard.tsx`

- [ ] **Step 1: Verify nothing else imports them**

Run:
```bash
grep -rn 'from "@/components/GuildCard"\|from "@/components/GuildMembershipCard"' src/
```
Expected: no results (the test file under `src/__tests__/vetted-icon-presentation.test.tsx` may reference `GuildCard` — verify it doesn't import the old component path; if it does, update the import to `@/components/guild/card`)

- [ ] **Step 2: Delete the files**

```bash
rm src/components/GuildCard.tsx
rm src/components/GuildMembershipCard.tsx
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: typecheck passes, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/GuildCard.tsx src/components/GuildMembershipCard.tsx
git commit -m "chore(guild-card): delete old GuildCard + GuildMembershipCard"
```

---

## Wave 4: Review gate

### Task 16: Post-implementation review

This is the **user-requested second review gate**.

- [ ] **Step 1: Run full verification**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
```
Expected: all pass

- [ ] **Step 2: Visual diff against mockups**

Start dev server (`npm run dev`), then for each of the five surfaces:
1. `/expert/guilds` (workspace)
2. `/dashboard` widget (workspace compact)
3. `/guilds` (marketplace)
4. any expert profile page (profile)
5. `/candidate/guilds` (candidate)

Compare against:
- `.superpowers/brainstorm/32981-1778572636/content/my-guilds-v4-membercount.html`
- `.superpowers/brainstorm/32981-1778572636/content/adaptations.html`

Note any visual drift (sizing, spacing, color, copy) and fix inline before review.

- [ ] **Step 3: Dispatch code-review subagent**

Dispatch a subagent with the `code-review:code-review` skill, passing the branch's diff. Reviewer must check:
- Spec compliance (5 variants present, correct data flows)
- Color-system adherence (no hardcoded Tailwind color names — everything via tokens)
- No `any`, no `as unknown as`
- Hook discipline (`useFetch`/`useApi`, no manual `useState(isLoading) + useEffect + try/catch`)
- `apiRequest` only — no raw `fetch`
- No duplicate utilities

- [ ] **Step 4: Address review findings and re-verify**

Fix anything the reviewer flags. Re-run typecheck + tests. Commit fixes individually.

- [ ] **Step 5: Final commit — declare ready**

```bash
git commit --allow-empty -m "chore(guild-card): complete — ready for user QA"
```

Then notify the user that the redesign is ready for their visual review.

---

## Self-review (executed inline during plan-writing)

**Spec coverage:**
- ✅ Workspace variant — Task 9 + Task 10
- ✅ Marketplace variant — Task 9 + Task 12
- ✅ Widget variant — Task 9 + Task 11
- ✅ Profile variant — Task 9 + Task 13
- ✅ Candidate variant — Task 9 + Task 14
- ✅ Thesis library — Task 1
- ✅ Monogram helper — Task 2
- ✅ topMembers type — Task 3
- ✅ Watermark / ambient grid — Task 4
- ✅ Sub-components (Header, MembersHero, TickerStrip, Watermark) — Tasks 5–8
- ✅ Old GuildCard + GuildMembershipCard deletion — Task 15
- ✅ Inline duplicate in GuildsListingPage collapsed — Task 12
- ✅ 3 candidate inline cards collapsed — Task 14
- ✅ Post-implementation review gate — Task 16

**Out-of-scope items in spec (left out of plan, as intended):**
- Light mode — separate pass
- Backend `topMembers` endpoint — front-end ships graceful fallback; backend ask is documented in spec for a separate PR
- Animation polish beyond CSS transitions
- "+25 VETD" pending-banner reward preview — banner ships as plain count

**Placeholder scan:** No "TBD", no "TODO", no "implement later". Each task has either complete code or an explicit pointer to the mockup HTML.

**Type consistency:** `GuildCardProps` tagged union uses `variant` discriminant consistently in Tasks 9–14. All sub-components are imported via `@/components/guild/card`. `GuildTopMember` defined once in Task 3.

**Backend dependency clarification:** The plan does **not** ship a backend change. The new card renders gracefully when `topMembers` is absent (shows `——` placeholder). A separate backend ticket for the `topMembers` field is filed but not gated on this plan.
