# Expert Story Mode — Anchored Tour Redesign

Date: 2026-04-29
Status: Approved (revised after subagent review + devil's advocate pass)
Owner: TBD

## Goal

A first-run expert who hits `/story-lab/expert` is walked through the real expert routes by an anchored, eye-leading tour that highlights specific UI sections and tells one coherent story (the Maya Chen vote loop). Story content cannot leak into a returning expert's normal experience.

## Why this exists

Today's tour renders a fixed bottom-right card for every step. The user's eye doesn't follow the highlighted element. Each page gets one shallow blurb. The fixture data is loosely related but doesn't tell a single coherent story (e.g. earnings reward `12.5 VETD` doesn't tie back to the voted application). And several `if (isStoryLabPreview)` short-circuits sit outside the fixture-wrapper layer, so any dev-mode guardrail bound to fixture functions misses them.

## Scope

In scope:
- Anchored popover positioning via `@floating-ui/react`, with centered-modal fallback.
- Sub-stop step model (`storySub` URL param) — most pages get 2–4 anchored sub-stops.
- Single-source-of-truth fixture refactor + coherent narrative numbers.
- Dev-mode leak detector that catches DOM- and boolean-level leaks, not just fixture-wrapper calls.
- Active scrub on Finish.

Out of scope:
- Replacing the tour with screenshot-callouts pages.
- Moving story mode into an isolated simulated route.
- The `OuterLayoutRouter` "unique key" warning is gated on a captured React stack; if not captured at spec-review time, it ships as a separate ticket.

## Phase 0 — Fixture single-source-of-truth (lands first)

**Why first:** every other phase compounds on fixture coherence. Today the same conceptual reward is encoded as six independent `12.5` literals across `storyLabFixtures.ts`. Editing one decoheres the demo. This phase makes the canonical event a single constant.

**Changes:**

1. Add `STORY_LAB_VOTE_OUTCOME` to `src/components/expert/story-lab/storyLabFixtures.ts`:
   ```ts
   export const STORY_LAB_VOTE_OUTCOME = {
     applicationId: APPLICATION_ID,
     candidateName: "Maya Chen",
     stake: 100,                    // VETD staked at vote time
     reward: 139,                   // VETD credited after consensus
     reputationDelta: 12,           // points gained
     weightMultiplier: 1.4,         // existing my_vote_weight
     voteResolvedAt: "2026-04-29T12:00:00.000Z",
   } as const;
   ```

2. Replace hardcoded literals with references:
   - `storyLabFixtures.ts:169` (`"Reward posted: +12.50 VETD"`) → derive from `STORY_LAB_VOTE_OUTCOME.reward`.
   - `:183` (`amount: 12.5`) → `amount: STORY_LAB_VOTE_OUTCOME.reward`.
   - `:193` (`change_amount: 5`) → `change_amount: STORY_LAB_VOTE_OUTCOME.reputationDelta`.
   - `:200` (`reward_amount: 12.5`) → `reward_amount: STORY_LAB_VOTE_OUTCOME.reward`.
   - `:311, :316, :323` (three `12.5` in `withStoryLabEarnings`) → all reference `STORY_LAB_VOTE_OUTCOME.reward`.
   - `STORY_LAB_GOVERNANCE_PROPOSAL.my_vote_weight` already `1.4` — keep, but reference `STORY_LAB_VOTE_OUTCOME.weightMultiplier` for consistency.

3. New `withStoryLabGuildStakes(stakes: GuildStakeInfo[]): GuildStakeInfo[]` injector returning `[{ guildId: STORY_LAB_GUILD.id, stakedAmount: STORY_LAB_VOTE_OUTCOME.stake, meetsMinimum: true }]`. Today the dashboard staking widget has no fixture path — `useApplicationsData.ts:67` short-circuits a boolean. Adding the injector lets the UI surface "100 VETD staked" instead of just "yes you're staked."

4. Rebase guild aggregates on `STORY_LAB_EXPERT_GUILD`:
   - `totalEarnings` reflects only the canonical event (currently `138.5`, drift suspect).
   - `reputation` becomes a small starting baseline (e.g. `42`) plus `STORY_LAB_VOTE_OUTCOME.reputationDelta` so the timeline math reads cleanly.

5. **Unit test** in `src/__tests__/expert-story-lab.test.ts`:
   - `STORY_LAB_NOTIFICATIONS[reward].title` includes `String(STORY_LAB_VOTE_OUTCOME.reward)`.
   - `STORY_LAB_EARNINGS_ENTRY.amount === STORY_LAB_VOTE_OUTCOME.reward`.
   - `STORY_LAB_REPUTATION_ENTRY.change_amount === STORY_LAB_VOTE_OUTCOME.reputationDelta`.
   - `STORY_LAB_REPUTATION_ENTRY.reward_amount === STORY_LAB_VOTE_OUTCOME.reward`.
   - `withStoryLabEarnings(...)` totals derive from the constant (no `12.5` literals reachable).

## Phase 1 — Leak guardrail (replaces per-fixture asserts)

**Why this shape:** the original plan put a `assertStoryLabActive()` call inside each `withStoryLabXxx` function. That misses the leaks that exist today — boolean short-circuits (`useApplicationsData.ts:67, 71`) and id-equality checks (`ApplicationsPage.tsx`) never go through a fixture wrapper.

**Changes:**

1. Consolidate two existing "is story mode active" checks:
   - `src/lib/api.ts:160–164` (`isStoryLabRoute()`, reads `window.location.search`).
   - `src/components/expert/story-lab/storyLabData.ts:357` (`isExpertStoryLabSearchParams()`, takes URLSearchParams).
   Add `parseStoryLabActive(input: URLSearchParams | string): boolean` that both call. Documents that the API guard is intentionally synchronous on `window.location` while the React side reads `useSearchParams()`, but both go through one parser.

2. New hook `useStoryLabContext()` exporting `{ isActive, completionReady, ... }`. Replace direct `isExpertStoryLabSearchParams(searchParams)` callers in components with this hook so the call sites are uniform and greppable.

3. Audit `if (isStoryLabPreview)` short-circuits across the codebase (`useApplicationsData.ts:67, 71`, etc.) and route them through `useStoryLabContext` instead of standalone parsing. They become uniformly killable on URL strip.

4. New dev-only `<StoryLabLeakDetector />` mounted at `src/app/expert/layout.tsx`. In `process.env.NODE_ENV !== "production"`:
   - `MutationObserver` on `document.body` watching for `[data-story-lab-*]` attributes (we already use these — `data-story-lab-background-root` exists in `AppShell.tsx:24`) and elements whose `id` starts with story prefixes (`story-lab-engineering-guild`, `story-lab-application-001`, `story-lab-governance-…`).
   - If observed AND `parseStoryLabActive(window.location.search) === false`: `console.error` with the offending element's outerHTML and `throw new Error("StoryLab leak: <details>")`.
   - Production: detector is a no-op; nothing mounted.

5. Active scrub on Finish (`ExpertStoryLabDriver.tsx:goNext` last-step branch):
   - `router.replace("/expert/dashboard")` (strips `storyLab`/`storyStep`/`storySub`/`storyLabComplete` params; replaces history entry).
   - Reuse existing `markStoryLabCompletionReady()` / `consumeStoryLabCompletionReady()` (don't reinvent).
   - Call real `expertApi.updateOnboardingState({ ...state, finishedRouteStory: true })`.
   - Invalidate TanStack Query keys for the routes the user passed through so stale story-fixture data doesn't sit in cache.

## Phase 2 — Sub-stop model + Floating UI

**Type changes** (`src/components/expert/story-lab/storyLabData.ts`):

```ts
export type StoryLabSubStop = {
  id: string;                              // unique within a page step
  target: TourTargetValue;
  fallbackTarget?: TourTargetValue;
  placement?: "auto" | "right" | "left" | "top" | "bottom" | "center";
  eyebrow: string;
  title: string;
  body: string;                            // 2–4 sentences
  detail?: string;
  advance?:
    | { kind: "target-visible" }           // default
    | { kind: "user-click", target: TourTargetValue };  // reuses TourTargetValue, not a free-form selector
};

export type StoryLabStep = {
  id: string;
  route: string;
  navLabel: string;
  icon: LucideIcon;
  subStops: StoryLabSubStop[];             // 1–4 entries
  dynamicRoute?: "firstGuild" | "firstReview";
};
```

**URL state:**
- Add `storySub=<id>` alongside existing `storyLab` and `storyStep`.
- **`router.replace` for sub-stop transitions within one page step**, `router.push` only when the page step changes. (Avoids 35-deep history stack.)
- Centralize all URL construction in `buildStoryLabRoute(route, stepId, subStopId?)` — single point for adding/stripping the third param. Verify every call site (`getStoryLabLaunchRoute`, dynamic-route step navigation, completion route) is updated.

**Floating UI integration:**

Install `@floating-ui/react`. Re-measure actual bundle size (estimate ~30 kB min+gz; do not trust the 10 kB number from the brainstorm).

```tsx
const { refs, floatingStyles, placement, middlewareData, context } = useFloating({
  open: isOpen,
  onOpenChange: () => {},                  // tour is uncloseable; ignored
  placement: subStop.placement === "auto" ? "right-start" : subStop.placement,
  middleware: [
    offset(16),
    flip({ fallbackPlacements: ["right", "left", "top", "bottom"] }),
    shift({ padding: 16 }),
    size({ apply({ availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        maxHeight: `${Math.min(availableHeight, 540)}px`,
      });
    }}),
    arrow({ element: arrowRef }),
  ],
  whileElementsMounted: autoUpdate,
});
```

Centered-modal fallback when ANY of:
- `subStop.placement === "center"`.
- target rect unresolved.
- target wider than 80% of viewport.
- viewport width ≤ 640 px (mobile — anchored popover is unworkable).

**Spotlight + popover coordinates:** spotlight rect drives popover anchor (the popover follows the spotlight, not the other way around). Both portal to `document.body`, outside the inert subtree.

**Focus management — pick one:**
- **Delete** the manual focus trap at `ExpertStoryLabDriver.tsx:357–408, 411–429`.
- **Adopt** `<FloatingFocusManager modal>` from `@floating-ui/react`.
- Two focus traps fight on first paint (DA finding).

**Leader line:** `arrow` middleware renders a 12px primary-colored arrow from popover edge to spotlight edge. Hidden when in centered-modal fallback.

**Scroll behavior:** on sub-stop change, scroll target into view (`block: "center"`) before computing the float — same as today, just per-sub-stop.

## Phase 3 — Sub-stop content authoring

Total ~30–40 sub-stops. Page-level breakdown:

| Page | Sub-stops | Notes |
|---|---:|---|
| Dashboard | 3 | Hero + setup checklist + reputation tile |
| Guilds list | 2 | Guild card + "Stake VETD" CTA |
| Guild detail | 4 | Members tab + pending reviews + stake widget + post feed |
| Applications | 3 | Queue + filter chips + application card |
| Story application | 1 | Card spotlight, leads into review modal |
| Practice review (modal) | 4 | Evidence step + scoring rubric + red flags + commit step |
| Review result | 1 | Outcome popover |
| Notifications | 2 | Reward notification (references Maya/+139) + sidebar bell |
| Earnings | 2 | Reward row (+139) + cumulative tile |
| Reputation | 2 | Delta row (+12) + timeline |
| Endorsements | 2 | Riley card + endorsement modal entry |
| Governance | 2 | Live vote banner + proposal stats |
| Complete | 1 | Dashboard return + Finish CTA |

Authoring convention (enforced in code review, not at build time): every sub-stop body that references a number or character must interpolate from `STORY_LAB_VOTE_OUTCOME.*` (Phase 0 enables this). No bare strings like `"+12.50 VETD"` in sub-stop content. ESLint rule out of scope; reviewers flag in PR.

New `TOUR_TARGETS` entries added only where current targets are too coarse (e.g. need separate anchors for "evidence step" and "scoring rubric" inside the practice-review modal). Each new target documented in `tourTargets.ts` with its consumer.

## Phase 4 — Test plan

- **Unit (`src/__tests__/expert-story-lab.test.ts`):**
  - Fixture parity (Phase 0 #5, above).
  - `parseStoryLabActive` with both string and URLSearchParams input.
  - `useStoryLabContext` returns false when URL params absent.
  - `<StoryLabLeakDetector />` throws when a `data-story-lab-*` element is mounted with URL params absent (use a synthetic mount + jsdom MutationObserver shim).

- **Playwright (`e2e/expert-story-lab.spec.ts`):**
  - Existing 4 tests continue to pass (extend the arc test to walk all sub-stops; current arc-walker assumes 16 stops).
  - **New** test: visit `/expert/dashboard` (no story params); assert no leak detector throw fires; assert no `[data-story-lab-*]` elements in DOM.
  - **New** test: walk 3 sub-stops forward, click browser back; assert URL is at the *page-level* prior step, not the previous sub-stop.
  - **New** test: walk full tour, click Finish; assert URL has no `storyLab*` params, sessionStorage flag is consumed, onboarding state was POSTed.

- **Manual UX walkthrough** on http://localhost:3030/story-lab/expert after Phase 0 lands. Confirm popover anchors next to spotlight, fall-back centers when expected, every sub-stop's body references real numbers.

## Phase 5 — `OuterLayoutRouter` key warning (gated)

Pre-condition for inclusion in this spec: capture the dev console React component owner stack from the warning at `/expert/dashboard`. Without that, this item moves to a separate ticket.

Highest-prior suspect (per subagent review, unverified): `src/components/layout/AppSidebar.tsx:131` (`config.groups.map(...)`). Verify `groups` entries have stable `id` and the `.map` returns elements with `key={group.id}` before editing.

## Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Anchor brittleness — sub-stops break silently when consumer components refactor | High | Phase 4 Playwright walks every sub-stop; CI catches regressions. Plus `fallbackTarget` already in the type. |
| Bundle bloat from `@floating-ui/react` | Medium | Re-measure with `bundlephobia` / actual build output before merge; budget +35 kB ceiling. |
| Focus-trap fight | Medium | Phase 2 explicitly deletes manual trap. Code review must confirm. |
| URL param drift between API guard and React tree | Medium | Phase 1 consolidation. |
| Story leak via boolean short-circuit not gated by fixture wrapper | High | Phase 1 leak detector (DOM-level, not fixture-level). |

## Verification gate before merge

- All Phase 4 tests pass.
- Manual walkthrough completed on 3030.
- Bundle size delta documented in PR description.
- Leak detector confirmed to fire on a synthetic leak (planted `<div data-story-lab-test />` outside story mode, observed throw, removed).
- `npm run typecheck`, `npm run lint`, `npm test`, full Playwright suite all green.
