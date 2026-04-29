# Story Mode Anchored Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current fixed bottom-right story-mode card with an anchored, eye-leading tour over the real expert routes; tighten fixture coherence around a single Maya Chen vote loop; and prevent story-mode state from leaking into the regular expert experience.

**Architecture:** Phase 0 lands a single-source-of-truth refactor of `storyLabFixtures.ts` so every page tells the same numerical story. Phase 1 consolidates the two existing "is story lab active" code paths and adds a dev-only DOM leak detector. Phase 2 replaces the current driver panel with `@floating-ui/react`-anchored popovers and adds a `storySub` URL param. Phase 3 authors ~30–40 sub-stops. Phase 4 covers tests. Phase 5 (key-prop warning) is gated on a captured React owner stack.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, `@floating-ui/react` (new dep, ~30 kB min+gz budget), Vitest, Playwright, TailwindCSS 4.

**Repo / branch:** `/Users/svendaneel/Desktop/vetted/front-end`, branch `codex/beta-frontend-review-flow`.

**Spec:** `docs/superpowers/specs/2026-04-29-story-mode-anchored-tour-design.md`

---

## File Structure

**New files:**
- `src/lib/story-lab/parseStoryLabActive.ts` — single parser for "is story mode active".
- `src/lib/hooks/useStoryLabContext.ts` — React hook wrapping the parser + completion-readiness flag.
- `src/components/expert/story-lab/StoryLabLeakDetector.tsx` — dev-only DOM observer that throws on story content rendered without story params.
- `src/components/expert/story-lab/storyLabSubStops.ts` — declarative sub-stop content authored per page.

**Files modified:**
- `src/components/expert/story-lab/storyLabFixtures.ts` — adds `STORY_LAB_VOTE_OUTCOME`, replaces hardcoded literals, adds `withStoryLabGuildStakes`.
- `src/components/expert/story-lab/storyLabData.ts` — adds `StoryLabSubStop` type, migrates `STORY_LAB_STEPS` to nested sub-stops, extends `buildStoryLabRoute` for `storySub` param, adds `STORY_LAB_QUERY.subStep`.
- `src/components/expert/story-lab/ExpertStoryLabDriver.tsx` — replaces fixed panel with Floating UI anchored popover, deletes manual focus trap, adds active-scrub on finish, switches `router.push` to `router.replace` for intra-page hops.
- `src/lib/api.ts` — `isStoryLabRoute()` reroutes through `parseStoryLabActive`.
- `src/lib/hooks/useApplicationsData.ts` — replaces direct `isExpertStoryLabSearchParams` and the `isStakedInGuild` boolean short-circuit with `useStoryLabContext` + `withStoryLabGuildStakes`.
- `src/app/expert/layout.tsx` — mounts `<StoryLabLeakDetector />` in dev.
- `src/__tests__/expert-story-lab.test.ts` — adds parity tests, leak-detector test, parser test.
- `e2e/expert-story-lab.spec.ts` — adds tests for leak detector, browser-back, finish-scrub; extends story-arc test to walk every sub-stop.
- `playwright.config.ts` — already parameterized; no change.

**Files modified later (gated, Phase 5):** `src/components/layout/AppSidebar.tsx` (suspect for "unique key" warning, only after the React owner stack is captured).

---

# Phase 0 — Fixture single-source-of-truth

Lands first. Every later phase compounds on coherent fixtures.

### Task 0.1: Introduce `STORY_LAB_VOTE_OUTCOME` constant

**Files:**
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:21-33` (extend `STORY_LAB_TIMESTAMPS`).
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:35` (insert constant after timestamps).

- [ ] **Step 1: Add a unit test for the constant shape**

Add to `src/__tests__/expert-story-lab.test.ts` inside the existing `describe("expert story lab data", ...)`:

```ts
it("declares a single canonical vote outcome that drives every downstream display", async () => {
  const { STORY_LAB_VOTE_OUTCOME, STORY_LAB_REVIEW_APPLICATION_ID } =
    await import("@/components/expert/story-lab/storyLabFixtures");
  expect(STORY_LAB_VOTE_OUTCOME).toEqual({
    applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
    candidateName: "Maya Chen",
    stake: 100,
    reward: 139,
    reputationDelta: 12,
    weightMultiplier: 1.4,
    voteResolvedAt: "2026-04-29T12:00:00.000Z",
  });
});
```

- [ ] **Step 2: Run the test, confirm failure**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: fails because `STORY_LAB_VOTE_OUTCOME` is not exported.

- [ ] **Step 3: Implement the constant**

In `src/components/expert/story-lab/storyLabFixtures.ts`, add a new `voteResolvedAt` key to `STORY_LAB_TIMESTAMPS`, then add the constant after the timestamps block (before `STORY_LAB_GUILD`):

```ts
const STORY_LAB_TIMESTAMPS = {
  expertJoined: "2026-03-15T12:00:00.000Z",
  reviewApplied: "2026-04-27T12:00:00.000Z",
  reviewCommitDeadline: "2026-05-02T12:00:00.000Z",
  voteResolvedAt: "2026-04-29T12:00:00.000Z",   // NEW — canonical event time
  notificationResult: "2026-04-29T12:00:00.000Z",
  notificationReward: "2026-04-29T11:55:00.000Z",
  earningsPosted: "2026-04-29T11:50:00.000Z",
  reputationPosted: "2026-04-29T11:52:00.000Z",
  endorsementApplied: "2026-04-29T09:00:00.000Z",
  endorsementDeadline: "2026-04-30T08:00:00.000Z",
  governanceCreated: "2026-04-28T12:00:00.000Z",
  governanceDeadline: "2026-05-03T12:00:00.000Z",
} as const;

export const STORY_LAB_VOTE_OUTCOME = {
  applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
  candidateName: "Maya Chen",
  stake: 100,
  reward: 139,
  reputationDelta: 12,
  weightMultiplier: 1.4,
  voteResolvedAt: STORY_LAB_TIMESTAMPS.voteResolvedAt,
} as const;
```

Note: `STORY_LAB_REVIEW_APPLICATION_ID` is declared at line 56 today. Move the `STORY_LAB_VOTE_OUTCOME` declaration *after* line 58 so the reference resolves.

- [ ] **Step 4: Run the test, confirm pass**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/story-lab/storyLabFixtures.ts src/__tests__/expert-story-lab.test.ts
git commit -m "refactor(story-lab): add canonical STORY_LAB_VOTE_OUTCOME constant"
```

---

### Task 0.2: Replace hardcoded reward/reputation literals with the canonical constant

**Files:**
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:169` (notification title).
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:182-190` (`STORY_LAB_EARNINGS_ENTRY`).
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:192-206` (`STORY_LAB_REPUTATION_ENTRY`).
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:308-323` (`withStoryLabEarnings`).

- [ ] **Step 1: Add parity tests**

Add to the existing test file:

```ts
it("derives every reward/reputation display from STORY_LAB_VOTE_OUTCOME", async () => {
  const fx = await import("@/components/expert/story-lab/storyLabFixtures");
  const reward = fx.STORY_LAB_VOTE_OUTCOME.reward;
  const repDelta = fx.STORY_LAB_VOTE_OUTCOME.reputationDelta;

  expect(fx.STORY_LAB_EARNINGS_ENTRY.amount).toBe(reward);
  expect(fx.STORY_LAB_REPUTATION_ENTRY.change_amount).toBe(repDelta);
  expect(fx.STORY_LAB_REPUTATION_ENTRY.reward_amount).toBe(reward);

  const rewardNotification = fx.STORY_LAB_NOTIFICATIONS.find(
    (n) => n.type === "reward_earned",
  );
  expect(rewardNotification?.title).toContain(String(reward));
});

it("aggregates story earnings totals from the canonical reward", async () => {
  const fx = await import("@/components/expert/story-lab/storyLabFixtures");
  const result = fx.withStoryLabEarnings(null, [], null);
  expect(result.summary.totalVetd).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
  expect(result.summary.byGuild?.[0]?.total).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
  expect(result.summary.byType?.[0]?.total).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: both new tests fail (current literals are 12.5 / 5).

- [ ] **Step 3: Replace literals**

In `storyLabFixtures.ts`:

Replace line 169:
```ts
title: `Reward posted: +${STORY_LAB_VOTE_OUTCOME.reward} VETD`,
```

Replace `STORY_LAB_EARNINGS_ENTRY` body:
```ts
export const STORY_LAB_EARNINGS_ENTRY: EarningsEntry = {
  amount: STORY_LAB_VOTE_OUTCOME.reward,
  currency: "VETD",
  type: "voting_reward",
  guild_name: STORY_LAB_GUILD.name,
  candidate_name: STORY_LAB_VOTE_OUTCOME.candidateName,
  proposal_id: STORY_LAB_VOTE_OUTCOME.applicationId,
  created_at: STORY_LAB_TIMESTAMPS.earningsPosted,
};
```

Replace `STORY_LAB_REPUTATION_ENTRY`:
```ts
export const STORY_LAB_REPUTATION_ENTRY: ReputationTimelineEntry = {
  change_amount: STORY_LAB_VOTE_OUTCOME.reputationDelta,
  reason: "aligned",
  description: `Aligned review on ${STORY_LAB_VOTE_OUTCOME.candidateName}'s ${STORY_LAB_GUILD.name} guild application`,
  guild_name: STORY_LAB_GUILD.name,
  vote_score: 82,
  alignment_distance: 3.5,
  slash_percent: null,
  reward_amount: STORY_LAB_VOTE_OUTCOME.reward,
  consensus_score: 78.5,
  candidate_name: STORY_LAB_VOTE_OUTCOME.candidateName,
  outcome: "approved",
  proposal_id: STORY_LAB_VOTE_OUTCOME.applicationId,
  created_at: STORY_LAB_TIMESTAMPS.reputationPosted,
};
```

In `withStoryLabEarnings` (around lines 308–323), replace the three `12.5` literals with `STORY_LAB_VOTE_OUTCOME.reward`:

```ts
const byGuild = prependOrBumpTotal(
  currentByGuild,
  { guildId: STORY_LAB_GUILD.id, guildName: STORY_LAB_GUILD.name, total: STORY_LAB_VOTE_OUTCOME.reward },
  (item) => item.guildId
);
const byType = prependOrBumpTotal(
  currentByType,
  { type: "voting_reward", total: STORY_LAB_VOTE_OUTCOME.reward },
  (item) => item.type
);

return {
  summary: {
    ...currentSummary,
    totalVetd:
      Math.max(currentTotalVetd, 0) +
      (items.length === nextItems.length ? 0 : STORY_LAB_VOTE_OUTCOME.reward),
    byGuild,
    byType,
  },
  // …
};
```

Update the existing fixed-timestamp test at line 131 — `STORY_LAB_NOTIFICATIONS[0].createdAt` is still `notificationResult` (`12:00`) and `[1]` is still `notificationReward` (`11:55`). The expected array stays the same; only the *title* of `[1]` changed.

- [ ] **Step 4: Run all unit tests, confirm pass**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: all tests pass (existing 12 + 2 new from Task 0.1 + 2 new here = 16).

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/story-lab/storyLabFixtures.ts src/__tests__/expert-story-lab.test.ts
git commit -m "refactor(story-lab): derive reward/reputation displays from canonical outcome"
```

---

### Task 0.3: Add `withStoryLabGuildStakes` injector

**Files:**
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts` (add export at end of file).

- [ ] **Step 1: Test the injector**

Add to test file:

```ts
it("injects a deterministic story-mode guild stake matching the canonical stake amount", async () => {
  const { withStoryLabGuildStakes, STORY_LAB_VOTE_OUTCOME, STORY_LAB_GUILD } =
    await import("@/components/expert/story-lab/storyLabFixtures");
  const result = withStoryLabGuildStakes([]);
  expect(result).toEqual([
    {
      guildId: STORY_LAB_GUILD.id,
      stakedAmount: String(STORY_LAB_VOTE_OUTCOME.stake),
      meetsMinimum: true,
    },
  ]);
});

it("does not duplicate a real stake for the story guild", async () => {
  const { withStoryLabGuildStakes, STORY_LAB_GUILD } =
    await import("@/components/expert/story-lab/storyLabFixtures");
  const real = [
    { guildId: STORY_LAB_GUILD.id, stakedAmount: "200", meetsMinimum: true },
  ];
  expect(withStoryLabGuildStakes(real)).toEqual(real);
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: both new tests fail (function doesn't exist).

- [ ] **Step 3: Implement**

Add at the bottom of `storyLabFixtures.ts` (after `withStoryLabGovernance`, before `getStoryLabReviewModalStep`):

```ts
import type { GuildStakeInfo } from "@/types";

export function withStoryLabGuildStakes(
  stakes: GuildStakeInfo[] | null | undefined
): GuildStakeInfo[] {
  return prependUniqueById(
    stakes ?? [],
    {
      guildId: STORY_LAB_GUILD.id,
      stakedAmount: String(STORY_LAB_VOTE_OUTCOME.stake),
      meetsMinimum: true,
    },
    (item) => item.guildId
  );
}
```

If `GuildStakeInfo` already exists in the existing import block at the top, just reuse the import and don't add a second one. Verify with `grep -n "GuildStakeInfo" src/components/expert/story-lab/storyLabFixtures.ts`.

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/story-lab/storyLabFixtures.ts src/__tests__/expert-story-lab.test.ts
git commit -m "feat(story-lab): add withStoryLabGuildStakes injector"
```

---

### Task 0.4: Wire `withStoryLabGuildStakes` into `useApplicationsData`

This replaces the boolean short-circuit at `useApplicationsData.ts:67-71` so the dashboard staking widget surfaces a real "100 VETD staked" row instead of a silently-true boolean.

**Files:**
- Modify: `src/lib/hooks/useApplicationsData.ts:9-13` (extend imports).
- Modify: `src/lib/hooks/useApplicationsData.ts:61-71` (replace short-circuit).

- [ ] **Step 1: Test the integration**

Add `e2e/expert-story-lab.spec.ts` test (within the existing `describe`):

```ts
test("dashboard surfaces the canonical 100 VETD stake during story mode", async ({ page }) => {
  await setupStoryLabMocks(page);
  await page.goto("/story-lab/expert");
  await expect(page.getByText(/100 VETD/)).toBeVisible({ timeout: 15000 });
});
```

(Run only this test in step 4. The Playwright suite already exists and passes; this just adds one assertion.)

- [ ] **Step 2: Run, confirm failure**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts -g "100 VETD" --project=chromium --retries=0
```

Expected: fails (no "100 VETD" text rendered yet because there's no stake fixture path).

- [ ] **Step 3: Replace short-circuit with injector**

In `src/lib/hooks/useApplicationsData.ts`:

Add import (line 9 area):
```ts
import {
  buildStoryLabReviewApplication,
  prependUniqueById,
  withStoryLabGuildStakes,
} from "@/components/expert/story-lab/storyLabFixtures";
```

Replace lines 61–71:
```ts
const effectiveGuildStakes = useMemo(() => {
  if (!isStoryLabPreview) return guildStakes ?? [];
  return withStoryLabGuildStakes(guildStakes ?? []);
}, [guildStakes, isStoryLabPreview]);

const stakedGuildIds = useMemo(() => {
  return new Set(
    effectiveGuildStakes
      .filter((s) => parseFloat(s.stakedAmount) > 0)
      .map((s) => s.guildId),
  );
}, [effectiveGuildStakes]);

const isStakedInGuild = (guildId?: string) => {
  if (!guildId) return stakedGuildIds.size > 0;
  return stakedGuildIds.has(guildId);
};
const hasAnyStake = stakedGuildIds.size > 0;
```

And update the returned `guildStakes` field at line 296 so the consumer sees the merged list:
```ts
guildStakes: effectiveGuildStakes,
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm run typecheck
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts -g "100 VETD" --project=chromium --retries=0
```

Expected: typecheck clean, Playwright test passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useApplicationsData.ts e2e/expert-story-lab.spec.ts
git commit -m "refactor(story-lab): replace stake boolean short-circuit with fixture injector"
```

---

### Task 0.5: Rebase `STORY_LAB_EXPERT_GUILD` aggregates around the canonical event

**Files:**
- Modify: `src/components/expert/story-lab/storyLabFixtures.ts:40-54`.
- Modify: `src/__tests__/expert-story-lab.test.ts` (update the existing `STORY_LAB_EXPERT_GUILD.joinedAt` test if needed).

- [ ] **Step 1: Update aggregates to derive from the outcome**

In `storyLabFixtures.ts`:

```ts
export const STORY_LAB_EXPERT_GUILD: ExpertGuild = {
  id: STORY_LAB_GUILD.id,
  name: STORY_LAB_GUILD.name,
  description:
    "Software engineers, data scientists, and technical builders who review engineering applications.",
  memberCount: 128,
  expertRole: "craftsman",
  reputation: 42 + STORY_LAB_VOTE_OUTCOME.reputationDelta,   // baseline 42 + the canonical delta = 54
  totalEarnings: STORY_LAB_VOTE_OUTCOME.reward,              // matches earnings page exactly
  joinedAt: STORY_LAB_TIMESTAMPS.expertJoined,
  pendingProposals: 1,
  pendingApplications: 0,
  ongoingProposals: 2,
  closedProposals: 18,
};
```

- [ ] **Step 2: Update the parity assertion**

Add to existing test file:

```ts
it("rebases STORY_LAB_EXPERT_GUILD aggregates onto the canonical outcome", async () => {
  const fx = await import("@/components/expert/story-lab/storyLabFixtures");
  expect(fx.STORY_LAB_EXPERT_GUILD.totalEarnings).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
  expect(fx.STORY_LAB_EXPERT_GUILD.reputation).toBeGreaterThanOrEqual(
    fx.STORY_LAB_VOTE_OUTCOME.reputationDelta,
  );
});
```

- [ ] **Step 3: Run all unit tests**

```bash
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

Expected: all green. If the existing `joinedAt` test breaks, leave it as-is — `joinedAt` did not change.

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/story-lab/storyLabFixtures.ts src/__tests__/expert-story-lab.test.ts
git commit -m "refactor(story-lab): rebase guild aggregates onto canonical outcome"
```

---

# Phase 1 — Leak guardrail consolidation

### Task 1.1: Add `parseStoryLabActive` shared parser

**Files:**
- Create: `src/lib/story-lab/parseStoryLabActive.ts`.
- Modify: `src/lib/api.ts:160-164` (rewire `isStoryLabRoute`).

- [ ] **Step 1: Test the parser**

Create `src/__tests__/story-lab-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";

describe("parseStoryLabActive", () => {
  it("returns true for storyLab=expert in URLSearchParams", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLab=expert"))).toBe(true);
  });

  it("returns true for storyLabComplete=expert in URLSearchParams", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLabComplete=expert"))).toBe(true);
  });

  it("returns true for storyLab=expert in raw query string", () => {
    expect(parseStoryLabActive("?storyLab=expert&other=1")).toBe(true);
  });

  it("returns false for unrelated params", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLab=other"))).toBe(false);
    expect(parseStoryLabActive("")).toBe(false);
    expect(parseStoryLabActive("?foo=bar")).toBe(false);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- --run src/__tests__/story-lab-parser.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement parser**

Create `src/lib/story-lab/parseStoryLabActive.ts`:

```ts
import { STORY_LAB_QUERY } from "@/components/expert/story-lab/storyLabData";

type ParserInput =
  | URLSearchParams
  | Pick<URLSearchParams, "get">
  | string;

export function parseStoryLabActive(input: ParserInput): boolean {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;
  const expected = STORY_LAB_QUERY.value;
  return (
    params.get(STORY_LAB_QUERY.mode) === expected ||
    params.get(STORY_LAB_QUERY.completion) === expected
  );
}
```

- [ ] **Step 4: Reroute `isStoryLabRoute()` in `lib/api.ts`**

Replace `src/lib/api.ts:160-164` with:

```ts
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";

function isStoryLabRoute(): boolean {
  if (typeof window === "undefined") return false;
  return parseStoryLabActive(window.location.search);
}
```

(Add the import at the existing import block at the top of the file.)

- [ ] **Step 5: Run, confirm pass**

```bash
npm test -- --run src/__tests__/story-lab-parser.test.ts
npm test -- --run src/__tests__/expert-story-lab.test.ts
npm run typecheck
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/story-lab src/lib/api.ts src/__tests__/story-lab-parser.test.ts
git commit -m "refactor(story-lab): consolidate isStoryLabRoute through parseStoryLabActive"
```

---

### Task 1.2: Add `useStoryLabContext` hook

**Files:**
- Create: `src/lib/hooks/useStoryLabContext.ts`.

- [ ] **Step 1: Test the hook**

Create `src/__tests__/use-story-lab-context.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("storyLab=expert&storyStep=overview"),
  usePathname: () => "/expert/dashboard",
}));

describe("useStoryLabContext", () => {
  it("returns isActive=true when storyLab=expert is in the URL", () => {
    const { result } = renderHook(() => useStoryLabContext());
    expect(result.current.isActive).toBe(true);
    expect(result.current.activeStepId).toBe("overview");
  });
});
```

(If `@testing-library/react` is missing from devDependencies, skip this test and write a plain `parseStoryLabActive`-style assertion instead. Verify with `grep '@testing-library/react' package.json`.)

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- --run src/__tests__/use-story-lab-context.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/lib/hooks/useStoryLabContext.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";
import { STORY_LAB_QUERY } from "@/components/expert/story-lab/storyLabData";

export interface StoryLabContextValue {
  isActive: boolean;
  isCompletionReturn: boolean;
  activeStepId: string | null;
  activeSubStopId: string | null;
}

export function useStoryLabContext(): StoryLabContextValue {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const isActive = parseStoryLabActive(searchParams);
    return {
      isActive,
      isCompletionReturn:
        searchParams.get(STORY_LAB_QUERY.completion) === STORY_LAB_QUERY.value,
      activeStepId: searchParams.get(STORY_LAB_QUERY.step),
      activeSubStopId: searchParams.get(STORY_LAB_QUERY.subStep ?? "storySub"),
    };
  }, [searchParams]);
}
```

(`STORY_LAB_QUERY.subStep` will exist after Task 2.3. The `??` keeps this safe in the interim.)

- [ ] **Step 4: Run all tests**

```bash
npm test
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useStoryLabContext.ts src/__tests__/use-story-lab-context.test.tsx
git commit -m "feat(story-lab): add useStoryLabContext hook"
```

---

### Task 1.3: Migrate `useApplicationsData` to `useStoryLabContext`

**Files:**
- Modify: `src/lib/hooks/useApplicationsData.ts:1-9, 36`.

- [ ] **Step 1: Edit imports + replace direct parser call**

In `src/lib/hooks/useApplicationsData.ts`:

Replace the import of `isExpertStoryLabSearchParams`:
```ts
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
```
(Remove the now-unused `useSearchParams` import only if no other code in the file uses it — verify with `grep "useSearchParams" src/lib/hooks/useApplicationsData.ts`. The file still uses it on line 239, so leave the import.)

Replace line 36:
```ts
const { isActive: isStoryLabPreview } = useStoryLabContext();
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
npm test -- --run src/__tests__/expert-story-lab.test.ts
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0
```

All green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useApplicationsData.ts
git commit -m "refactor(story-lab): route useApplicationsData through useStoryLabContext"
```

---

### Task 1.4: Add `<StoryLabLeakDetector />` and mount it

**Files:**
- Create: `src/components/expert/story-lab/StoryLabLeakDetector.tsx`.
- Modify: `src/app/expert/layout.tsx` (mount detector inside `AppShell`).

- [ ] **Step 1: Test the detector**

Add to `src/__tests__/expert-story-lab.test.ts`:

```ts
it("StoryLabLeakDetector throws when story DOM appears outside story mode", async () => {
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const { StoryLabLeakDetector } = await import(
    "@/components/expert/story-lab/StoryLabLeakDetector"
  );
  // Static SSR render must not throw — observer only runs in the browser.
  expect(() =>
    renderToString(React.createElement(StoryLabLeakDetector)),
  ).not.toThrow();
});
```

A full DOM-mutation test belongs in Playwright (Task 4.2). Vitest only checks the SSR safety here.

- [ ] **Step 2: Implement detector**

Create `src/components/expert/story-lab/StoryLabLeakDetector.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";

const STORY_PREFIXES = ["story-lab-"] as const;

function looksLikeStoryDom(node: Element): boolean {
  if (node.id && STORY_PREFIXES.some((p) => node.id.startsWith(p))) return true;
  for (const attr of node.getAttributeNames()) {
    if (attr.startsWith("data-story-lab-")) return true;
  }
  return false;
}

export function StoryLabLeakDetector() {
  // eslint-disable-next-line no-restricted-syntax -- diagnostic-only effect; runs once and observes DOM
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const reportLeak = (node: Element) => {
      if (parseStoryLabActive(window.location.search)) return;
      const summary = node.outerHTML.slice(0, 240);
      // Visible in dev console; thrown error fails Playwright leak test.
      // eslint-disable-next-line no-console
      console.error("StoryLab leak detected:", summary);
      throw new Error(`StoryLab leak detected: ${summary}`);
    };

    const sweep = (root: ParentNode) => {
      const candidates = root.querySelectorAll<HTMLElement>(
        "[id^='story-lab-'], [data-story-lab-background-root], [data-story-lab-guild-id], [data-story-lab-review-url]",
      );
      candidates.forEach(reportLeak);
    };

    sweep(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element && looksLikeStoryDom(node)) reportLeak(node);
          if (node instanceof Element) sweep(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
```

- [ ] **Step 3: Mount in expert layout**

In `src/app/expert/layout.tsx`, add the import and render the detector inside the existing `<AppShell>` JSX, alongside `<ExpertStoryLabDriver />`:

```tsx
import { StoryLabLeakDetector } from "@/components/expert/story-lab/StoryLabLeakDetector";
// …
return (
  <AppShell config={activeConfig}>
    {shouldSuppressChildren ? null : children}
    <ExpertStoryLabDriver />
    <StoryLabLeakDetector />
    <ExpertSetupGuide
      enabled={false}
      checklistEvents={onboardingProgress.checklistEvents}
      markChecklistEvent={markOnboardingChecklistEvent}
    />
  </AppShell>
);
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
npm test -- --run src/__tests__/expert-story-lab.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/story-lab/StoryLabLeakDetector.tsx src/app/expert/layout.tsx src/__tests__/expert-story-lab.test.ts
git commit -m "feat(story-lab): add dev-only DOM leak detector"
```

---

### Task 1.5: Active scrub on Finish

Strip URL params, consume the completion flag, and write the real onboarding-state finish marker so a second visit to `/expert/dashboard` doesn't relaunch the story.

**Files:**
- Modify: `src/components/expert/story-lab/ExpertStoryLabDriver.tsx:241-251` (`goNext` final-step branch).

- [ ] **Step 1: Test**

Add to `e2e/expert-story-lab.spec.ts`:

```ts
test("Finish scrubs all story params and marks onboarding done", async ({ page }) => {
  await setupStoryLabMocks(page);
  // Walk to last step directly using URL state, then click Finish.
  await page.goto("/expert/dashboard?storyLab=expert&storyStep=complete");
  await page.getByRole("link", { name: "Finish" }).click();

  await expect(page).toHaveURL(/\/expert\/dashboard$/);
  expect(new URL(page.url()).searchParams.toString()).toBe("");
});
```

- [ ] **Step 2: Implement scrub**

In `ExpertStoryLabDriver.tsx`, replace the `goNext` last-step body (line 244–248):

```ts
if (isLastStep) {
  markStoryLabCompletionReady();
  void expertApi
    .updateOnboardingState({ ...EMPTY_ONBOARDING_STATE, finishedRouteStory: true })
    .catch(() => {});
  router.replace("/expert/dashboard");
  return;
}
```

Add the import block:
```ts
import { expertApi } from "@/lib/api";
import { EMPTY_ONBOARDING_STATE } from "@/lib/expert-onboarding-tour";
```

(Verify `EMPTY_ONBOARDING_STATE` exists; if not, replace with `{} as ExpertOnboardingState` and adjust types.)

- [ ] **Step 3: Verify**

```bash
npm run typecheck
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts -g "Finish scrubs" --project=chromium --retries=0
```

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/story-lab/ExpertStoryLabDriver.tsx e2e/expert-story-lab.spec.ts
git commit -m "feat(story-lab): scrub story params and persist completion on Finish"
```

---

# Phase 2 — Floating UI + sub-stop model

### Task 2.1: Install `@floating-ui/react`, measure bundle

**Files:**
- Modify: `package.json` (new dep).
- Modify: `package-lock.json`.

- [ ] **Step 1: Install**

```bash
npm install --save @floating-ui/react
```

- [ ] **Step 2: Measure delta**

```bash
npm run build 2>&1 | tail -40
```

Note bundle size delta in the commit message. Spec budget: ≤35 kB min+gz.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @floating-ui/react for story-mode anchored popover"
```

---

### Task 2.2: Add `StoryLabSubStop` type, migrate steps, extend URL state

**Files:**
- Modify: `src/components/expert/story-lab/storyLabData.ts`.

- [ ] **Step 1: Test new shape**

Add to `src/__tests__/expert-story-lab.test.ts`:

```ts
it("declares at least one sub-stop per step (default to a single stop preserving current behavior)", async () => {
  const { STORY_LAB_STEPS } = await import("@/components/expert/story-lab/storyLabData");
  for (const step of STORY_LAB_STEPS) {
    expect(step.subStops.length).toBeGreaterThanOrEqual(1);
    for (const sub of step.subStops) {
      expect(sub.id).toBeTruthy();
      expect(sub.target).toBeTruthy();
      expect(sub.title).toBeTruthy();
    }
  }
});

it("buildStoryLabRoute encodes the storySub param when provided", async () => {
  const { buildStoryLabRoute } = await import("@/components/expert/story-lab/storyLabData");
  expect(buildStoryLabRoute("/expert/voting", "applications", "queue")).toBe(
    "/expert/voting?storyLab=expert&storyStep=applications&storySub=queue",
  );
  expect(buildStoryLabRoute("/expert/voting", "applications")).toBe(
    "/expert/voting?storyLab=expert&storyStep=applications",
  );
});
```

The existing test `"moves across the real expert surfaces"` will need updating — total step count stays 16, just the data shape changes.

- [ ] **Step 2: Update types and `STORY_LAB_QUERY`**

In `storyLabData.ts`:

```ts
export const STORY_LAB_QUERY = {
  mode: "storyLab",
  step: "storyStep",
  subStep: "storySub",
  completion: "storyLabComplete",
  value: "expert",
} as const;

export type StoryLabPlacement =
  | "auto"
  | "right"
  | "left"
  | "top"
  | "bottom"
  | "center";

export type StoryLabAdvanceCondition =
  | { kind: "target-visible" }
  | { kind: "user-click"; target: TourTargetValue };

export interface StoryLabSubStop {
  id: string;
  target: TourTargetValue;
  fallbackTarget?: TourTargetValue;
  placement?: StoryLabPlacement;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  advance?: StoryLabAdvanceCondition;
}

export interface StoryLabStep {
  id: string;
  page: StoryLabPage;
  route: string;
  navLabel: string;
  icon: LucideIcon;
  subStops: StoryLabSubStop[];
  dynamicRoute?: "firstGuild" | "firstReview";
}
```

Convert each existing entry in `STORY_LAB_STEPS` to use `subStops: [...]` with one stop derived from the current `target/title/eyebrow/body/detail`. Example for `overview`:

```ts
{
  id: "overview",
  page: "dashboard",
  route: "/expert/dashboard",
  navLabel: "Dashboard",
  icon: ClipboardCheck,
  subStops: [
    {
      id: "overview",
      target: TOUR_TARGETS.dashboardOverview,
      placement: "auto",
      eyebrow: "Orientation",
      title: "Start with the expert loop",
      body:
        "The dashboard is the checkpoint, not the whole tour. It frames the work loop: guild context, applications, review, consensus, rewards, reputation, and governance.",
      detail:
        "This preview runs on the same expert routes you use after login, so the walkthrough can be judged against the actual page state.",
    },
  ],
},
```

Repeat for all 16 steps. (Phase 3 will add additional sub-stops to each.)

Remove the old top-level `target`/`fallbackTarget`/`title`/`eyebrow`/`body`/`detail`/`actionLabel` fields from every step.

Update `canAdvanceStoryLabStep` signature to operate on a sub-stop:

```ts
export function canAdvanceStoryLabSubStop(
  subStop: StoryLabSubStop,
  resolvedTarget: TourTargetValue | null,
): boolean {
  return resolvedTarget === subStop.target;
}
```

(Keep the old `canAdvanceStoryLabStep` as a thin wrapper that takes the *first* sub-stop, so other call sites compile until Task 2.4 swaps them.)

Extend `buildStoryLabRoute`:

```ts
export function buildStoryLabRoute(
  route: string,
  stepId: string,
  subStopId?: string,
): string {
  const [pathnameWithMaybeHash, hash = ""] = route.split("#", 2);
  const [pathname, query = ""] = pathnameWithMaybeHash.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(STORY_LAB_QUERY.mode, STORY_LAB_QUERY.value);
  params.set(STORY_LAB_QUERY.step, stepId);
  if (subStopId) params.set(STORY_LAB_QUERY.subStep, subStopId);
  const queryString = params.toString();
  return `${pathname}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}
```

- [ ] **Step 3: Run, fix all type errors**

```bash
npm run typecheck
```

Expected: errors in `ExpertStoryLabDriver.tsx` referencing the removed fields. Leave them for Task 2.4 (which fully rewrites the driver), or temporarily reach into `step.subStops[0]` to keep the build green if you commit between tasks. Prefer keeping the build green: in `ExpertStoryLabDriver.tsx`, change `activeStep.title`/`.body`/etc. to `activeStep.subStops[0].title`/`.body`/etc. as a stop-gap.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

The existing `"includes the full story arc"` test asserts `STORY_LAB_STEPS.map((step) => step.page)`. The page array stays identical — no change needed. The test that asserts `step.title` exists may need swapping to `step.subStops[0].title`. Update those assertions.

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/story-lab/storyLabData.ts src/components/expert/story-lab/ExpertStoryLabDriver.tsx src/__tests__/expert-story-lab.test.ts
git commit -m "refactor(story-lab): introduce sub-stop step model with storySub URL param"
```

---

### Task 2.3: Replace driver panel with Floating UI anchored popover

**Files:**
- Modify: `src/components/expert/story-lab/ExpertStoryLabDriver.tsx` (substantial rewrite of the render section + remove manual focus trap).

- [ ] **Step 1: Test target rendering**

Add to `e2e/expert-story-lab.spec.ts`:

```ts
test("popover anchors near the target instead of bottom-right", async ({ page }) => {
  await setupStoryLabMocks(page);
  await page.goto("/expert/dashboard?storyLab=expert&storyStep=overview");
  const popover = page.getByTestId("expert-story-lab-popover");
  const target = page.locator(`[data-tour-target="expert-dashboard-overview"]`).first();

  await expect(popover).toBeVisible();
  const popBox = await popover.boundingBox();
  const targetBox = await target.boundingBox();
  if (!popBox || !targetBox) throw new Error("missing layout boxes");

  // Popover overlap with target's vertical band — i.e. anchored, not pinned to viewport corner.
  const verticalProximity =
    Math.abs((popBox.y + popBox.height / 2) - (targetBox.y + targetBox.height / 2));
  expect(verticalProximity).toBeLessThan(targetBox.height * 1.5);
});
```

- [ ] **Step 2: Implement Floating UI popover**

In `ExpertStoryLabDriver.tsx`:

Add imports:
```ts
import {
  arrow,
  autoUpdate,
  flip,
  FloatingFocusManager,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react";
```

Replace the existing `<section ref={dialogRef} ...>` panel (lines 456–583) with a Floating UI–driven element. Compute `useCenteredFallback` first:

```tsx
const arrowRef = useRef<HTMLDivElement>(null);
const targetEl = resolvedTarget && /* from findTarget */ ...; // get the resolved Element

const useCenteredFallback = useMemo(() => {
  if (activeSubStop.placement === "center") return true;
  if (!targetRect) return true;
  if (typeof window === "undefined") return false;
  if (window.innerWidth <= 640) return true;
  return targetRect.width / window.innerWidth > 0.8;
}, [activeSubStop.placement, targetRect]);

const { refs, floatingStyles, placement: resolvedPlacement, middlewareData } =
  useFloating({
    placement: activeSubStop.placement && activeSubStop.placement !== "auto" && activeSubStop.placement !== "center"
      ? activeSubStop.placement
      : "right-start",
    middleware: [
      offset(16),
      flip({ fallbackPlacements: ["right", "left", "top", "bottom"] }),
      shift({ padding: 16 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight, 540)}px`,
          });
        },
      }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

useLayoutEffect(() => {
  if (targetEl) refs.setReference(targetEl);
}, [targetEl, refs]);
```

Render:

```tsx
<FloatingFocusManager context={context} modal initialFocus={refs.floating}>
  <section
    ref={refs.setFloating}
    data-testid="expert-story-lab-popover"
    style={useCenteredFallback
      ? { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", ...panelWidth }
      : floatingStyles
    }
    className="z-[1001] rounded-xl border border-border bg-card p-5 shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="story-lab-title"
  >
    {/* existing panel content — eyebrow, title, body, detail, progress, back/next */}
    {!useCenteredFallback && (
      <div
        ref={arrowRef}
        className="absolute h-3 w-3 rotate-45 bg-card border-l border-t border-border"
        style={{
          left: middlewareData.arrow?.x,
          top: middlewareData.arrow?.y,
        }}
      />
    )}
  </section>
</FloatingFocusManager>
```

(Keep the existing eyebrow/title/body/detail content but read from `activeSubStop` rather than `activeStep`. Drive Back/Next from sub-stop transitions — see Task 2.4.)

**Delete the manual focus trap** at lines 357–408 and the focus-restore at 411–429. `FloatingFocusManager modal` replaces them.

- [ ] **Step 3: Re-run all tests**

```bash
npm run typecheck
npm test
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0
```

Fix any failures by tightening selectors / waits before moving on.

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/story-lab/ExpertStoryLabDriver.tsx e2e/expert-story-lab.spec.ts
git commit -m "feat(story-lab): anchor popover to target via @floating-ui/react"
```

---

### Task 2.4: Drive transitions through sub-stops with `router.replace` for intra-page hops

**Files:**
- Modify: `src/components/expert/story-lab/ExpertStoryLabDriver.tsx` (the `goNext`, `goBack`, `goToStep` callbacks).

- [ ] **Step 1: Test back-button behavior**

Add to `e2e/expert-story-lab.spec.ts`:

```ts
test("intra-page sub-stop hops use replace so browser back exits the page step cleanly", async ({ page }) => {
  await setupStoryLabMocks(page);
  await page.goto("/expert/dashboard?storyLab=expert&storyStep=overview");
  // Walk forward through every sub-stop of the dashboard step (intra-page replaces),
  // then one more click crosses into the next page step (push).
  // After the cross-page push, browser back must return to the LAST dashboard URL,
  // not to a mid-substop history entry — because intra-page hops used replace.
  const popover = page.getByTestId("expert-story-lab-popover");

  // Click forward until the URL leaves /expert/dashboard.
  while (page.url().includes("/expert/dashboard?")) {
    await popover.getByRole("link", { name: /next|continue|go to|open/i }).first().click();
    await page.waitForLoadState("domcontentloaded");
  }
  // Now we're on /expert/guilds (or whichever the next step's route is).
  const afterCrossPage = page.url();
  expect(afterCrossPage).not.toContain("/expert/dashboard?");

  // Browser back: should return to the last dashboard URL (not an earlier sub-stop entry).
  await page.goBack();
  await expect(page).toHaveURL(/\/expert\/dashboard\?storyLab=expert&storyStep=overview/);

  // One more back: should leave story mode entirely (no extra dashboard sub-stop entries in history).
  await page.goBack();
  await expect(page).not.toHaveURL(/\/expert\/dashboard\?storyLab=expert/);
});
```

(Test goes green after Task 2.4 + the dashboard sub-stops from Task 3.1 land.)

- [ ] **Step 2: Implement transition logic**

In `ExpertStoryLabDriver.tsx`, derive sub-stop index and add helpers:

```ts
const activeSubIndex = useMemo(() => {
  const subId = searchParams.get(STORY_LAB_QUERY.subStep) ?? activeStep.subStops[0].id;
  const idx = activeStep.subStops.findIndex((s) => s.id === subId);
  return idx >= 0 ? idx : 0;
}, [searchParams, activeStep]);

const activeSubStop = activeStep.subStops[activeSubIndex];

const goNextSubStop = useCallback(() => {
  if (activeSubIndex < activeStep.subStops.length - 1) {
    const next = activeStep.subStops[activeSubIndex + 1];
    router.replace(buildStoryLabRoute(activeStep.route, activeStep.id, next.id), {
      scroll: false,
    });
    return;
  }
  // Last sub-stop on this page — advance to next page step.
  if (activeIndex < STORY_LAB_STEPS.length - 1) {
    const nextStep = STORY_LAB_STEPS[activeIndex + 1];
    const firstSub = nextStep.subStops[0];
    router.push(buildStoryLabRoute(getResolvedStepRoute(nextStep), nextStep.id, firstSub.id), {
      scroll: false,
    });
  }
}, [activeIndex, activeSubIndex, activeStep, getResolvedStepRoute, router]);

const goBackSubStop = useCallback(() => {
  if (activeSubIndex > 0) {
    const prev = activeStep.subStops[activeSubIndex - 1];
    router.replace(buildStoryLabRoute(activeStep.route, activeStep.id, prev.id), {
      scroll: false,
    });
    return;
  }
  if (activeIndex > 0) {
    const prevStep = STORY_LAB_STEPS[activeIndex - 1];
    const lastSub = prevStep.subStops[prevStep.subStops.length - 1];
    router.push(buildStoryLabRoute(getResolvedStepRoute(prevStep), prevStep.id, lastSub.id), {
      scroll: false,
    });
  }
}, [activeIndex, activeSubIndex, activeStep, getResolvedStepRoute, router]);
```

Replace `goBack` and `goNext` callsites in the render JSX with `goBackSubStop` / `goNextSubStop`. Keep the Finish branch (last sub-stop of last page) routing through the existing `markStoryLabCompletionReady` + scrub flow from Task 1.5.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0
```

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/story-lab/ExpertStoryLabDriver.tsx e2e/expert-story-lab.spec.ts
git commit -m "feat(story-lab): use router.replace for intra-page sub-stop hops"
```

---

# Phase 3 — Sub-stop content authoring

Each task adds the additional sub-stops for one page. The first sub-stop per page already exists from Task 2.2 (the migrated single stop). These tasks **append** new sub-stops to the same step.

Common pattern for every Phase 3 task:

1. Identify the page step in `storyLabData.ts`.
2. Append sub-stop objects to `subStops`.
3. Add new `TOUR_TARGETS` entries if a finer anchor doesn't exist yet (`tourTargets.ts`) and place `dataTourTarget(...)` on the consumer component.
4. Run typecheck + the unit test that walks every sub-stop (Task 2.2).
5. Commit.

Each sub-stop body must interpolate from `STORY_LAB_VOTE_OUTCOME.*` for any number/character mention. No bare `"+12.50 VETD"` strings. Code reviewer enforces.

### Task 3.1: Dashboard (3 sub-stops total: existing `overview` + 2 new)

Append to the `overview` step's `subStops` after the existing entry:

```ts
{
  id: "checklist",
  target: TOUR_TARGETS.onboardingChecklist,
  placement: "right",
  eyebrow: "Track your progress",
  title: "The setup checklist tracks first-run actions",
  body:
    "Setup tasks like staking VETD and joining a guild are tracked here. Story mode pretends these are already done so the tour can stay on the work loop.",
},
{
  id: "rewards-summary",
  target: TOUR_TARGETS.rewardsSummary,
  placement: "left",
  eyebrow: "Where rewards land",
  title: "Recent rewards summary",
  body:
    `When the demo finishes, this tile reflects the canonical event: a +${STORY_LAB_VOTE_OUTCOME.reward} VETD reward from the ${STORY_LAB_VOTE_OUTCOME.candidateName} review.`,
},
```

Add `import { STORY_LAB_VOTE_OUTCOME } from "./storyLabFixtures";` to `storyLabData.ts` if not already imported.

### Task 3.2: Guilds list (2 sub-stops)

Append to `guilds` step:

```ts
{
  id: "story-guild-card",
  target: TOUR_TARGETS.guildDirectory,
  placement: "right",
  eyebrow: "Test guild",
  title: "Click the Engineering guild to enter standards",
  body:
    "Story mode injects an Engineering guild so this list always has a clickable target. The next stop opens that guild's detail page.",
  advance: { kind: "user-click", target: TOUR_TARGETS.guildDirectory },
},
```

### Task 3.3: Guild detail (4 sub-stops)

Append to `guild-detail` step. Add new tour targets first if missing (suggested ids in `tourTargets.ts`): `guildMembers`, `guildPendingReviews`, `guildStakeWidget`, `guildPostFeed`. Place `dataTourTarget(...)` on the corresponding sections in `src/components/GuildDetailView.tsx`.

```ts
{
  id: "members",
  target: TOUR_TARGETS.guildMembers,
  placement: "auto",
  eyebrow: "Who's in the room",
  title: "Members and roles",
  body:
    "Each member has a role (craftsman, journeyman, apprentice) that affects their review weight. You can see your own row pinned at the top.",
},
{
  id: "pending-reviews",
  target: TOUR_TARGETS.guildPendingReviews,
  placement: "auto",
  eyebrow: "What's waiting on you",
  title: "Pending reviews",
  body:
    `Maya Chen's senior application is pending. The next page (Applications) is where you actually pick this up and review.`,
},
{
  id: "stake-widget",
  target: TOUR_TARGETS.guildStakeWidget,
  placement: "auto",
  eyebrow: "Skin in the game",
  title: `${STORY_LAB_VOTE_OUTCOME.stake} VETD staked`,
  body:
    `Story mode shows ${STORY_LAB_VOTE_OUTCOME.stake} VETD staked here. In production this is your guild stake; rewards and slashing are proportional to it.`,
},
{
  id: "post-feed",
  target: TOUR_TARGETS.guildPostFeed,
  placement: "auto",
  eyebrow: "Standards live in conversation",
  title: "Posts from the guild",
  body:
    "Standards-setting and disputes happen in this feed. You'll come back here when governance proposes a change.",
},
```

### Task 3.4: Applications (3 sub-stops)

Append to `applications` step (and to the existing `application-card` step, which becomes a sibling — keep the existing arc but add a queue + filters sub-stop on the prior page):

```ts
// In step "applications" subStops:
{
  id: "filters",
  target: TOUR_TARGETS.applicationsFilters,
  placement: "bottom",
  eyebrow: "Filter the queue",
  title: "Filters narrow the queue to your guilds",
  body:
    "Use these chips to scope to a guild, an applicant type, or a deadline state. The story leaves them on the default view.",
},
{
  id: "queue-item",
  target: TOUR_TARGETS.applicationReviewCard,
  placement: "right",
  eyebrow: "What you'll review",
  title: `${STORY_LAB_VOTE_OUTCOME.candidateName}'s application is the demo card`,
  body:
    `The card shows what you scan before opening: name, guild, current role, deadline. Open it to start the practice review.`,
},
```

### Task 3.5: Review modal (already 5 sub-stops in arc — extend bodies)

The review-modal arc already has five sub-stops authored (`review-evidence`, `review-scoring`, `review-red-flags`, `review-commit`, `review-result`). For Phase 3, only **rewrite the bodies** to reference `STORY_LAB_VOTE_OUTCOME` numbers. Example for `review-result`:

```ts
{
  id: "review-result",
  // …
  body:
    `Practice complete: aligned vote on ${STORY_LAB_VOTE_OUTCOME.candidateName} would credit +${STORY_LAB_VOTE_OUTCOME.reward} VETD and +${STORY_LAB_VOTE_OUTCOME.reputationDelta} reputation. Story mode will not actually submit.`,
},
```

### Task 3.6: Notifications (2 sub-stops)

```ts
{
  id: "result",
  target: TOUR_TARGETS.notificationResultCard,
  placement: "right",
  eyebrow: "Result lands first",
  title: "Consensus reached",
  body:
    `The first notification confirms ${STORY_LAB_VOTE_OUTCOME.candidateName}'s review reached consensus and your vote aligned.`,
},
{
  id: "reward",
  target: TOUR_TARGETS.notificationsList,
  placement: "right",
  eyebrow: "Reward posted",
  title: `+${STORY_LAB_VOTE_OUTCOME.reward} VETD credited`,
  body:
    `The reward notification points to the same applicationId as the result, so you can audit the chain end-to-end.`,
},
```

### Task 3.7: Earnings (2 sub-stops)

```ts
{
  id: "reward-row",
  target: TOUR_TARGETS.earningsRewardRow,
  placement: "right",
  eyebrow: "Story reward",
  title: `+${STORY_LAB_VOTE_OUTCOME.reward} VETD from ${STORY_LAB_VOTE_OUTCOME.candidateName}`,
  body:
    `This row matches the notification you just saw. Reward = consensus alignment + your stake at risk.`,
},
{
  id: "summary",
  target: TOUR_TARGETS.earningsSummary,
  placement: "left",
  eyebrow: "Aggregate view",
  title: "Earnings summary",
  body:
    `In production this is your lifetime VETD earned. In story mode, it equals the canonical reward (${STORY_LAB_VOTE_OUTCOME.reward} VETD).`,
},
```

### Task 3.8: Reputation (2 sub-stops)

```ts
{
  id: "delta-row",
  target: TOUR_TARGETS.reputationDeltaRow,
  placement: "right",
  eyebrow: "Reputation event",
  title: `+${STORY_LAB_VOTE_OUTCOME.reputationDelta} reputation`,
  body:
    `Reputation moved because your judgment aligned. The same applicationId ties this entry to the earnings row and the notification.`,
},
{
  id: "timeline",
  target: TOUR_TARGETS.reputationTimeline,
  placement: "auto",
  eyebrow: "Audit trail",
  title: "Reputation timeline",
  body:
    "Every change in your reputation has a row here, with the reason and the consensus distance. Reputation is not just a number — it's an audit log.",
},
```

### Task 3.9: Endorsements (2 sub-stops)

```ts
{
  id: "candidate-card",
  target: TOUR_TARGETS.endorsementCandidateCard,
  placement: "right",
  eyebrow: "Different mechanic",
  title: "Riley Park is a separate demo",
  body:
    "Endorsement happens after guild membership review. You back a candidate for a specific job, putting reputation behind a hiring outcome.",
},
{
  id: "marketplace",
  target: TOUR_TARGETS.endorsementMarketplace,
  placement: "auto",
  eyebrow: "Market view",
  title: "Endorsement marketplace",
  body:
    "Open positions appear here with current bids. Story mode shows one demo card; in production it's the live job market.",
},
```

### Task 3.10: Governance (2 sub-stops)

```ts
{
  id: "live-vote",
  target: TOUR_TARGETS.governanceProposalCard,
  placement: "auto",
  eyebrow: "Live vote",
  title: "Raise Engineering review quorum",
  body:
    `The story proposal is active and you've already voted "for" with ${STORY_LAB_VOTE_OUTCOME.weightMultiplier}× weight. The voting math reflects your current reputation.`,
},
{
  id: "voting-power",
  target: TOUR_TARGETS.governanceVotingPower,
  placement: "right",
  eyebrow: "Why your vote counts more",
  title: "Voting power tile",
  body:
    "Voting power scales with reputation and stake. Higher reputation = bigger weight on protocol decisions, not just on individual reviews.",
},
```

### Task 3.11: Apply Phase 3 changes

Each Phase 3 task above is a single edit + commit cycle:

- [ ] **Step 1: Edit `storyLabData.ts` per Task 3.x.**
- [ ] **Step 2: Add new `TOUR_TARGETS` entries to `tourTargets.ts` if needed and place `dataTourTarget(...)` on the consumer component.**
- [ ] **Step 3: Run typecheck + the unit test that walks every sub-stop.**

```bash
npm run typecheck && npm test -- --run src/__tests__/expert-story-lab.test.ts
```

- [ ] **Step 4: Commit.**

```bash
git add src/components/expert/story-lab/storyLabData.ts src/components/expert/onboarding/tourTargets.ts src/components/<consumer>.tsx
git commit -m "feat(story-lab): author sub-stops for <page>"
```

Do this once per Phase 3 sub-task (3.1 through 3.10).

---

# Phase 4 — Tests

### Task 4.1: Extend the Playwright story-arc test to walk every sub-stop

**Files:**
- Modify: `e2e/expert-story-lab.spec.ts` (the existing arc test).

- [ ] **Step 1: Replace the linear "click each Next link" pattern with a sub-stop loop**

```ts
test("walks every sub-stop in order without skip controls", async ({ page }) => {
  await setupStoryLabMocks(page);
  await page.goto("/story-lab/expert");

  for (;;) {
    // The next-button label is dynamic per sub-stop. We rely on the always-present
    // arrow icon button inside the popover.
    const next = page.getByTestId("expert-story-lab-popover").getByRole("link", { name: /finish|next|go to|open/i }).first();
    if (!(await next.isVisible().catch(() => false))) break;
    const before = page.url();
    await next.click();
    await page.waitForURL((u) => u.toString() !== before);
    if (page.url().endsWith("/expert/dashboard")) break;
  }

  await expect(page).toHaveURL(/\/expert\/dashboard$/);
  await expect(page.getByTestId("expert-story-lab-driver")).toHaveCount(0);
});
```

- [ ] **Step 2: Run, fix selector flakes, commit**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts -g "walks every sub-stop" --project=chromium --retries=0
git add e2e/expert-story-lab.spec.ts && git commit -m "test(story-lab): walk every sub-stop in arc test"
```

### Task 4.2: Leak-detector Playwright test

**Files:**
- Modify: `e2e/expert-story-lab.spec.ts`.

- [ ] **Step 1: Add the test**

```ts
test("non-story expert routes do not render any story-lab DOM", async ({ page }) => {
  // E2E mode + non-story dashboard visit.
  await page.route("**/api/experts/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) }),
  );
  await page.goto("/expert/dashboard");
  const leakNodes = page.locator("[id^='story-lab-'], [data-story-lab-background-root]");
  await expect(leakNodes).toHaveCount(0, { timeout: 10000 });
});
```

- [ ] **Step 2: Run, commit**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts -g "non-story expert routes" --project=chromium --retries=0
git add e2e/expert-story-lab.spec.ts && git commit -m "test(story-lab): assert no story DOM leaks on non-story routes"
```

### Task 4.3: Final gate run

- [ ] **Step 1: Full suite**

```bash
npm run typecheck
npm run lint
npm test
PLAYWRIGHT_BASE_URL=http://localhost:3031 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0
```

All must be green before merging.

- [ ] **Step 2: Manual UX walkthrough on 3030**

```bash
NEXT_PUBLIC_E2E_MODE=true npx dotenv -e .env.local -- npx next dev --turbopack --port 3030
```

Open `http://localhost:3030/story-lab/expert`. Walk every sub-stop. Confirm the popover anchors next to the spotlight, falls back to centered modal where expected, and every body that mentions a number references `STORY_LAB_VOTE_OUTCOME` values.

- [ ] **Step 3: Bundle delta**

Document the `@floating-ui/react` size delta in the merge PR description. Cap: 35 kB min+gz.

---

# Phase 5 — `OuterLayoutRouter` "unique key" warning (gated)

Pre-condition: capture the React component owner stack from the dev console while loading `/expert/dashboard?storyLab=expert&storyStep=overview`. Without that captured stack, this phase ships as a separate ticket and is removed from this plan.

If the stack points at `src/components/layout/AppSidebar.tsx:131` (`config.groups.map((group) => ...)`):

- [ ] **Step 1: Inspect and verify the suspect**

```bash
sed -n '125,140p' src/components/layout/AppSidebar.tsx
```

Expected: a `.map` returning JSX. Confirm whether the returned root element has a `key` and whether `group.id` (or equivalent stable property) exists on the iteree.

- [ ] **Step 2: Add stable key**

If missing, edit the JSX to:

```tsx
{config.groups.map((group) => (
  <SidebarGroup key={group.id} {...} />
))}
```

- [ ] **Step 3: Verify warning is gone**

```bash
NEXT_PUBLIC_E2E_MODE=true npx dotenv -e .env.local -- npx next dev --turbopack --port 3030
# Open dashboard in browser, watch dev console.
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "fix(layout): add stable key to AppSidebar groups (resolves React unique-key warning)"
```

---

## Self-review checklist (run after this plan is written, before execution)

- All spec phases mapped to at least one task: ✅ Phase 0 → Tasks 0.1–0.5; Phase 1 → 1.1–1.5; Phase 2 → 2.1–2.4; Phase 3 → 3.1–3.10 + 3.11; Phase 4 → 4.1–4.3; Phase 5 → gated.
- Placeholders: none. (`TBD` only for plan owner — that's a process field, not a code field.)
- Type names consistent across tasks: `StoryLabSubStop`, `STORY_LAB_VOTE_OUTCOME`, `parseStoryLabActive`, `useStoryLabContext`, `withStoryLabGuildStakes`, `StoryLabLeakDetector` — used identically wherever they appear.
- Each code-touching step contains the actual diff or full code block; tests come before implementation; commits between tasks.
