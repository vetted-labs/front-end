# Guild Card Redesign — "Catalogue"

**Status:** Spec — awaiting user review before implementation plan
**Author:** Sven + Claude (brainstorming session, 2026-05-12)
**Mockup reference:** `.superpowers/brainstorm/32981-*/content/my-guilds-v4-membercount.html`, `adaptations.html`

## Goal

Replace the current generic stat-tile guild cards (admin-grade) with a hero-grade "Catalogue" system that signals an elite, peer-curated community worth joining. One shared shell, four context variants. The new card must be **memorable in a single glance** and **scale from the marketplace down to a sidebar widget** without losing its identity.

## Why now

The current `GuildCard.tsx` reads as a SaaS admin tile (three boxed stat tiles, generic icon, low typographic ambition). Guilds are the most important entity on the page — the entire platform's credibility rests on them feeling elite. Today they don't. Additionally the codebase has duplicate inline guild-card implementations in `GuildsListingPage.tsx` and `CandidateGuilds.tsx` that drift; this redesign consolidates them.

## The signature move

Each guild becomes a **catalogued entity** with a permanent registry number (`G-01` … `G-08`, indexed by guild order) rendered as a low-contrast watermark numeral bleeding off the bottom-right of every card. Borrowed from Stripe Press spine numbers and FT supplement covers. The number becomes the guild's identity across the product (and can later appear on share cards, badges, the detail page, etc.).

## Anatomy of the card (workspace variant — full spec)

Top → bottom inside a 10px-radius dark card with a 1-px hairline border and subtle ambient grid background:

1. **Pending banner (conditional)** — `> 1 PENDING REVIEW    +25 VETD` in mono caps, warning-orange. Only when `pendingProposals > 0`.
2. **Header row (mono caps, 9.5px, 0.18em tracking)** — left: `G-## · GUILD_NAME` + role pill (`MASTER` in brand orange). Right: live status `● LIVE` pulse OR a context-specific tag (e.g. `6 OPEN` on the marketplace variant). `LIVE` is shown for any active guild — no toggle, no "stale" state in v1.
3. **Orange accent rule** — 32×1px, brand orange. Single load-bearing accent.
4. **Display name** — 22px display weight, -0.025em tracking. Period at the end of the name (`Engineering.`) is appended in the component (the period is a deliberate editorial mark, not part of the stored name).
5. **Thesis line** — 12px serif italic (Bree Serif), ~12 words max, max-width 88%. One human sentence among the data. (See [Thesis library](#thesis-library) below.)
6. **Members hero block** — bordered orange-tinted strip containing:
   - **Big member-count number** in mono, 30px, 800 weight, brand orange (e.g. `04`, `08`, `48` — zero-padded to two digits below 10)
   - **`MEMBERS` label** beneath, 8.5px mono caps
   - **Avatar stack** of top-reputation members as 20px circular monograms (initials), max 5 visible + `+N` overflow. Current user marked in orange tint.
   - **Sub-caption** below avatars (mono, 9px): `12 reviewed / 30d · 47d tenure` or context-specific stats
7. **Ticker strip** — full-width grid at the bottom with hairline dividers and a darkened background tint. Three cells, mono numerics with unit suffixes:
   - `STAKED` — brand orange, with `VETD` unit
   - `EARNED` — positive green, with `USD` unit
   - `REPUTATION` — neutral foreground
8. **Watermark** — `01` / `02` / … in mono, 120px, 800 weight, white at 4.5% opacity, positioned bottom-right, bleeding off the card edge. Behind everything (z-index 0).

## Surface variants

The shell is the same. Only what's shown in the header chip, members block, and ticker strip changes per context.

| Variant | Data shape | Header right | Members hero | Ticker cells |
|---|---|---|---|---|
| `workspace` (My Guilds, full) | `ExpertGuild` | `● LIVE` + role pill | Big count + me-highlighted avatars + tenure/reviewed sub-caption | Staked / Earned / Rep |
| `marketplace` (public browse) | `Guild` | `N OPEN` orange tag | Big total-experts + top-rep avatars + "Top-rep reviewers shown" caption | Experts / Reviewed / Open Roles |
| `widget` (dashboard top-3 compact) | `ExpertGuild` | `● LIVE` + role pill | Smaller count, no sub-caption | Same as workspace, "V" unit instead of "VETD" |
| `profile` (read-only credential) | `ExpertGuild` | (none) | Hidden — replaced by `Master · Member since Mar 2024 · 47d tenure` row | Staked / Earned / Rep |
| `candidate` (status-aware) | `GuildApplicationSummary` + guild ref | Status pill (`PENDING`, `APPROVED`, etc.) | Hidden | Status-specific metadata (applied date, decision date, etc.) |

## Component API

A single `<GuildCard>` component with a tagged-union `variant` prop, replacing today's `GuildCard.tsx` (`browse`/`membership`/`dashboard`), the inline card in `GuildsListingPage.tsx`, and the three inline status cards in `CandidateGuilds.tsx`.

```tsx
type GuildCardProps =
  | { variant: "workspace"; guild: ExpertGuild; onClick?: () => void; isFirstTourTarget?: boolean }
  | { variant: "marketplace"; guild: Guild; onClick?: () => void }
  | { variant: "widget"; guild: ExpertGuild; onClick?: () => void }
  | { variant: "profile"; guild: ExpertGuild; onClick?: () => void }
  | { variant: "candidate"; application: GuildApplicationSummary; onClick?: () => void };
```

Sub-components extracted for reuse and isolation:
- `<GuildCardHeader>` — registry chip + role pill + right-side status
- `<GuildCardThesis>` — name + serif tagline
- `<GuildMembersHero>` — count + avatar stack + sub-caption
- `<GuildTickerStrip>` — 3-cell stat row, slot-based
- `<GuildCardWatermark>` — numeric watermark

The existing `GuildMembershipCard.tsx` (separate file) is replaced by `<GuildCard variant="profile">`. The existing `GuildRankCard.tsx` is **kept** (it's the ranks-progression-specific UI). The existing `GuildAvatar` primitive stays.

## Data model

### What's available today (no backend change)
- `Guild`: `id`, `name`, `description`, `expertCount`, `totalProposalsReviewed`, `openPositions`, `jobCount`
- `ExpertGuild`: above + `expertRole`, `reputation`, `totalEarnings`, `joinedAt`, `pendingProposals`, `ongoingProposals`, `closedProposals`
- `GuildPublicDetail` adds: `experts: ExpertMember[]`, `totalVetdStaked`, `establishedDate`

### What we need to wire for the hero member block

The **avatar stack of top-reputation members** is the load-bearing visual of the redesign. The marketplace card needs the top-N members at list time — but `guildsApi.getAll()` returns only `Guild` (no expert array).

**Decision:** add a new field `topMembers: Array<{ id: string; fullName: string; reputation: number }>` to the `Guild` list response, capped at 5. The frontend derives 2-letter monograms from `fullName`. This is a backend change but cheap (single JOIN with a LIMIT 5 ORDER BY reputation DESC).

For the workspace variant, the shell already has `ExpertGuild` and the top-N members can be fetched from the existing `expertApi.getGuildDetails` endpoint or added to the list endpoint similarly.

### Data we are NOT adding
- Block-height references — rejected during brainstorm (felt gimmicky)
- Contract-hash IDs (`0x…`) — rejected
- "+25 VETD" reward preview in the pending banner — defer until the reward estimator endpoint exists; banner ships as `> 1 PENDING REVIEW` only
- Reviewed/30d, tenure days — already in `closedProposals` (proxy) and derived from `joinedAt`; no new backend work

## Thesis library

A static copy library at `src/config/guildThesis.ts` mapping guild name → tagline. Strings are short, opinionated, ~12 words max. Falls back to `Guild.description` if missing, then to empty if neither. Initial set (subject to wordsmithing review):

```ts
export const GUILD_THESIS: Record<string, string> = {
  "Design": "Taste defended in public, with reputation at stake.",
  "Engineering": "Software written by people who would stake their reputation on it shipping.",
  "Finance, Legal & Compliance": "Numbers, contracts, and consequences — held to peer standard.",
  "Marketing & Growth": "Stories that move markets, vetted by people who built them.",
  "Operations & Strategy": "The work behind the work — judged by operators.",
  "People, HR & Recruitment": "Who you hire becomes who you are — vetted accordingly.",
  "Product": "Decisions that ship, defended by people who have shipped.",
  "Sales & Success": "Revenue closed by people who can tell the difference.",
};
```

## Migration plan

1. Build new `<GuildCard>` component (with all 5 variants) alongside the current `GuildCard.tsx` — do NOT delete the old one yet
2. Migrate call-sites one by one, in this order, so any regressions are caught early:
   - `GuildsOverview.tsx` (expert "My Guilds")
   - `dashboard/GuildsSection.tsx` (dashboard widget)
   - `guilds/GuildsListingPage.tsx` (marketplace — also collapse the inline duplicate)
   - `ExpertProfile.tsx` (profile membership)
   - `candidate/CandidateGuilds.tsx` (collapse the three inline status cards)
3. Delete the old `GuildCard.tsx`, the inline cards, and `GuildMembershipCard.tsx` once all sites are migrated
4. `GuildRankCard.tsx` is left untouched (specialized progression UI)
5. `GuildAvatar` primitive stays — still used in `FeaturedGuildsSection.tsx`, `JobDetailPage.tsx` sidebar, etc.

## Out of scope

- Light mode (the design works in dark; light variant is a separate pass)
- Mobile-specific layout beyond the current responsive 3 → 2 → 1 column breakpoints
- Animation/motion (hover transitions are CSS-only, no Framer)
- Backend changes beyond the `topMembers` field above

## Open questions to resolve during implementation

- Should the watermark number be sourced from a stable `guild.catalogueNumber` field (backend) or computed client-side from the guild's index in the guilds list? Recommend client-side for v1 — stable for any single user session, can be promoted to a backend-issued ID if/when we decide it's part of the guild's permanent identity.
- Are we okay with placeholder monogram fallbacks when `topMembers` is empty (new/empty guild)? Recommend yes — show a quiet "—" in place of the avatar stack and `00` for the count.

## Review gates

Per user request (2026-05-12):
1. **Pre-implementation:** User reviews this spec before any code is written. Changes get folded in before transition to writing-plans.
2. **Post-implementation:** Implementation is verified against the mockups (visual diff in the browser companion) and reviewed by a code-review subagent before being declared "done". Spec compliance, color-system adherence, no-`any`, hook discipline (`useFetch`/`useApi`, no manual `useEffect` for data), all enforced.
