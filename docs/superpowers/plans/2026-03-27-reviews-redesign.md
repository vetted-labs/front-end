# Reviews UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the reviews listing page (cards, stats), review wizard modal, and view review modal to use a "Glass + Accent Bar" design system — colored top bars per status, glass-morphism cards, consistent typography, and better data hierarchy.

**Architecture:** Visual-only refactor of existing components. No API changes, no new data flows. Each component keeps its existing props/interface and only changes its JSX/styling. The accent bar color conveys status: orange = pending review, green = approved/completed, red = rejected.

**Tech Stack:** React 19, TailwindCSS 4, Lucide icons, existing UI primitives (Card, Badge, Button, Modal)

---

## File Structure

### Modified Files (visual-only changes)
- `src/components/expert/applications/ExpertReviewCard.tsx` — Glass + accent bar redesign
- `src/components/expert/applications/CandidateReviewCard.tsx` — Glass + accent bar redesign
- `src/components/expert/applications/ApplicationsStatsRow.tsx` — Compact stats redesign
- `src/components/guild/review/StepIndicator.tsx` — Numbered step indicator redesign
- `src/components/guild/review/ReviewProfileStep.tsx` — Profile card with accent bar + info grid
- `src/components/expert/applications/ViewReviewModal.tsx` — Score cards, consensus strip, justification cards
- `src/components/guild/ReviewGuildApplicationModal.tsx` — Modal header/footer styling

### No New Files
All changes are visual-only modifications to existing components.

---

## Task 1: ExpertReviewCard Redesign

**Files:**
- Modify: `src/components/expert/applications/ExpertReviewCard.tsx`

The card currently uses a flat layout with badges scattered. Redesign to use accent bar + avatar with initials + two-row info layout.

- [ ] **Step 1: Replace card wrapper with glass + accent bar**

Replace the outer Card component with a div using rounded-2xl, glass background, overflow-hidden, and a 3px gradient accent bar at the top. The accent bar color is based on vetting state: orange for pending, green for reviewed/finalized, blue for in-progress.

- [ ] **Step 2: Redesign card content layout**

Structure as a flex row:
- Left: 46px avatar with initials (colored based on status), rounded-xl
- Middle (flex-1): Name + level badge + guild pill on first row, email on second row, date + review count + job title on third row with small icons
- Right: Review/View button

Key styling:
- Avatar: `w-[46px] h-[46px] rounded-xl` with gradient background matching accent color
- Name: `text-base font-bold text-foreground`
- Level badge: `text-[10px] uppercase tracking-wider` pill with muted background
- Guild pill: `text-[11px]` with indigo tint (`bg-indigo-500/8 border-indigo-500/15 text-indigo-400`)
- Meta row: `text-xs text-muted-foreground` with lucide icons (Clock, Users, Briefcase)
- Review button: gradient primary button
- View button: ghost with border

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/applications/ExpertReviewCard.tsx
git commit -m "refactor: redesign ExpertReviewCard with glass + accent bar"
```

---

## Task 2: CandidateReviewCard Redesign

**Files:**
- Modify: `src/components/expert/applications/CandidateReviewCard.tsx`

Same design language as ExpertReviewCard but for candidate applications.

- [ ] **Step 1: Apply glass + accent bar pattern**

Same structure as ExpertReviewCard:
- Accent bar: orange for pending, green if reviewed
- Avatar with initials derived from candidate name
- Info layout: Name + level badge + guild pill, email below, date + review count + job title meta row
- Action buttons right-aligned

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/applications/CandidateReviewCard.tsx
git commit -m "refactor: redesign CandidateReviewCard with glass + accent bar"
```

---

## Task 3: ApplicationsStatsRow Redesign

**Files:**
- Modify: `src/components/expert/applications/ApplicationsStatsRow.tsx`

Currently 4 separate cards. Merge into a single card with stat columns (same pattern as EndorsementHeader stats).

- [ ] **Step 1: Replace 4 separate cards with single card + stat columns**

Single card with:
- Glass background, rounded-2xl, overflow-hidden
- No accent bar (this is a neutral info section)
- Grid of 4 stat cells using `grid-cols-2 sm:grid-cols-4`
- Each cell: label (10px uppercase), value (xl bold), separated by `border-r border-border/40`
- Icons removed — the stats are self-explanatory with labels

Stats: Pending, To Vote, Completed, Guilds

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/applications/ApplicationsStatsRow.tsx
git commit -m "refactor: merge ApplicationsStatsRow into single compact card"
```

---

## Task 4: StepIndicator Redesign

**Files:**
- Modify: `src/components/guild/review/StepIndicator.tsx`

Replace icon-based stepper with numbered circles. Cleaner, more modern.

- [ ] **Step 1: Replace step circles with numbered design**

New design:
- Active step: 32px circle with `bg-primary/15 border-2 border-primary/50`, number in primary color
- Completed step: 32px circle with `bg-green-500/15 border-2 border-green-500/40`, checkmark SVG
- Pending step: 32px circle with `bg-muted/50 border border-border`, number in muted color
- Connector lines: 2px height, `bg-primary` for completed, `bg-border` for pending
- Labels: `text-xs font-semibold` — primary for active, foreground for completed, muted for pending
- Step labels simplified: "Profile", "General", "Domain", "Submit"

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/review/StepIndicator.tsx
git commit -m "refactor: redesign StepIndicator with numbered circles"
```

---

## Task 5: ReviewProfileStep Redesign

**Files:**
- Modify: `src/components/guild/review/ReviewProfileStep.tsx`

Redesign the applicant profile card shown in step 1 of the review wizard.

- [ ] **Step 1: Wrap content in accent bar card**

Outer container: glass card with 3px orange accent bar at top.

- [ ] **Step 2: Redesign profile header**

- 56px avatar with initials, rounded-xl, gradient background
- Name (20px bold) + type badge (Expert/Candidate pill) on same line
- Email below in muted color

- [ ] **Step 3: Add info grid**

2-column grid below the header:
- Position card: label "POSITION" (10px uppercase), value (14px semibold)
- Experience card: label "EXPERIENCE", value
- Each cell: `border border-border/40 rounded-lg bg-muted/20 p-3.5`

- [ ] **Step 4: Restyle links section**

Links as small ghost buttons with icons:
- `rounded-lg bg-muted/20 border border-border/40 px-3.5 py-2 text-xs`
- LinkedIn, Resume, Portfolio, GitHub icons from lucide

- [ ] **Step 5: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/guild/review/ReviewProfileStep.tsx
git commit -m "refactor: redesign ReviewProfileStep with accent bar + info grid"
```

---

## Task 6: ReviewGuildApplicationModal Header/Footer

**Files:**
- Modify: `src/components/guild/ReviewGuildApplicationModal.tsx`

Only touch the modal header and footer styling. Do NOT modify step content rendering or business logic.

- [ ] **Step 1: Restyle modal header (lines ~388-404)**

- Title: 20px font-extrabold
- Subtitle: 13px muted ("Expert membership review" or "Candidate application review")
- Close button: 32px square with rounded-lg, muted background, border

- [ ] **Step 2: Restyle modal footer/navigation area**

The ReviewNavigation component handles buttons. The modal wrapper should have:
- `border-t border-border/40` above the footer
- Adequate padding (20px 28px)

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/guild/ReviewGuildApplicationModal.tsx
git commit -m "refactor: restyle review modal header and footer"
```

---

## Task 7: ViewReviewModal Redesign

**Files:**
- Modify: `src/components/expert/applications/ViewReviewModal.tsx`

This is the largest change. Redesign score summary, consensus result, and justifications.

- [ ] **Step 1: Redesign modal header (lines ~106-120)**

- Name (20px bold) + status badge (Approved/Rejected pill) on same line
- Review date below in muted text
- Close button: 32px square, muted background

- [ ] **Step 2: Redesign score summary section (lines ~180-245)**

Replace current score cards with a 4-column grid:
- General score card: `text-2xl font-extrabold` value, `/20` in muted
- Domain score card: same style
- Deductions card: same style
- Overall card: green-tinted border/bg, percentage in green, raw score below

Add a 6px progress bar below the grid:
- `rounded-full bg-muted/20` track
- Fill width = overall percentage, gradient green

- [ ] **Step 3: Redesign consensus result section (lines ~247-313)**

Single card with horizontal data strip:
- Consensus score | Your score | Reputation change | VETD reward
- Separated by 1px vertical dividers
- Each: label (11px muted) above, value (18px bold) below
- Rep change colored green/red, VETD in primary

- [ ] **Step 4: Redesign justifications section (lines ~315-362)**

- Section header: "YOUR JUSTIFICATIONS" (10px uppercase muted)
- Group by "GENERAL" and "DOMAIN" with subtle divider headers
- Each justification: question label (12px semibold muted) + answer in a subtle card (`rounded-lg bg-muted/20 border border-border/40 p-3 text-sm`)

- [ ] **Step 5: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/expert/applications/ViewReviewModal.tsx
git commit -m "refactor: redesign ViewReviewModal with score cards and consensus strip"
```

---

## Task 8: Final Verification and Push

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Lint check**

Run: `npm run lint`

- [ ] **Step 3: Visual verification**

Run: `npm run dev` and verify:
- Reviews listing page: cards have accent bars, proper avatars, clean meta rows
- Review wizard: numbered stepper, profile card with accent bar + info grid
- View review modal: score cards, consensus strip, justification cards
- History tab: green accent bars on completed, rewards inline

- [ ] **Step 4: Push all commits**

```bash
git push
```
