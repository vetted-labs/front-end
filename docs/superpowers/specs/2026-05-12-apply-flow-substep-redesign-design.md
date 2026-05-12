# Apply-Flow Substep Redesign

**Date:** 2026-05-12
**Scope:** Candidate guild-apply (`/guilds/[guildId]/apply`) and expert apply (`/expert/apply`) flows
**Status:** Design approved, ready for plan

## Problem

Both apply flows present each top-level step as a single long form. A candidate applying to a guild scrolls through resume upload, required social links, three to five open-ended general questions, a cover letter, screening questions, level selection, several domain topics in an accordion, and an attestation — most of it visible at once. The expert apply flow has the same problem in its application-questions step, where bio, motivation, and prompts all stack.

The expert-side **review** modal (`ReviewGuildApplicationModal.tsx` + `VerticalStepRail.tsx` + `GeneralReviewStep.tsx`) solved this for reviewers: a compact left rail with status circles, paginated content showing one question at a time, and a chip strip that lets the reviewer jump between substeps freely. The result is calmer, more focused, and visually tighter.

We want the same treatment for both apply flows.

## Goals

- Both apply flows adopt the review-modal visual language: compact rail, paginated content, chip-strip substep navigation.
- Keep both as full-page routes — no conversion to Dialog.
- Preserve all existing data hooks (`useGuildApplicationFlow`, `useExpertApplicationFlow`), draft autosave, validation rules, API contracts, and step content components' internals.
- Share the new chrome between both flows so the next wizard-style page (if any) gets it for free.

## Non-Goals

- No changes to the data layer, draft system, or API.
- No changes to the auth flow, wallet signing, or success states.
- No restructuring of which questions exist or what they ask — only how they're paginated.
- No conversion of the route to a Dialog/modal.
- No mobile-specific redesign beyond ensuring the new layout reflows cleanly. The rail collapses to the top edge below `lg` today; that behavior carries over.

## Approach

### Shared primitives — `src/components/wizard/`

Three small primitives + one hook, used by both apply flows.

**`WizardRail`** — extracted from `VerticalStepRail.tsx`. Compact left navigation, 24px status circles, single-line labels. Supports `completedSteps`, `incompleteSteps`, `maxUnlockedStep`, free-click navigation. Optional `children` slot renders below the step list (used by the review modal's commit-reveal sub-section; apply flows leave it empty).

Why extract rather than reuse `VerticalStepRail` directly: the review rail lives in `components/guild/review/` and pulls in review-specific defaults (REVIEW_STEPS constant, commit-reveal sub-section, "expert"/"candidate" variant labels). The extraction strategy:

1. Move the generic step-list rendering (the `stepList.map(...)` block in `VerticalStepRail.tsx:86–177`) and the section-label header into `components/wizard/WizardRail.tsx`.
2. `VerticalStepRail` becomes a thin wrapper: it imports `WizardRail`, supplies the review-flow defaults (REVIEW_STEPS, "Review" section label, expert/candidate label override), and renders the commit-reveal sub-section as `children` of `WizardRail`.
3. The review modal's import (`import { VerticalStepRail } from "@/components/guild/review/VerticalStepRail"`) and its props surface are unchanged. Zero behavior change for reviewers.

**`SubstepChipStrip`** — extracted from the chip block in `GeneralReviewStep.tsx:106–125`. Renders a horizontal list of chips, one per substep, with status (active / complete / incomplete) and click-to-jump. Hidden when only one substep exists in the current top step.

**`WizardFooter`** — Back / Continue / Submit with a progress bar. Replaces the two near-identical inline footers in `GuildApplicationFlow.tsx:334–395` and `ExpertApplicationFlow.tsx:412–485`.

**`useWizardSubsteps`** — small hook owning `currentSubstepIndex` per top step. Exposes:
- `currentSubstep` (the substep object under the active top step)
- `goNext()` / `goPrevious()` — advances within the current step, then jumps to the next/previous top step at boundaries
- `jumpTo(topStepIndex, substepIndex)` — for chip and rail clicks
- `isFirstSubstep` / `isLastSubstep` — for Back/Continue/Submit button states

The hook is presentation-only. It takes a description of substeps (`{ id, label, isComplete, isRequired }[]` per top step) and emits navigation events; it owns no domain state.

### Substep map — candidate apply

`/guilds/[guildId]/apply` keeps its 3 top steps. Substeps:

| Top step      | Substep 1 (setup)                                    | Substeps 2..N (prompts)                          |
| ------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Materials     | Resume + required social links + guidance card       | Each `template.generalQuestions[i]` on its own   |
| Role *(opt)*  | Cover letter                                         | Each `screeningQuestions[i]` on its own          |
| Guild         | Level select + no-AI attestation                     | Each domain topic on its own (replaces accordion) |

The "Role" top step is conditional on `flow.hasJobStep`, same as today.

### Substep map — expert apply

`/expert/apply` keeps its 4 top steps. Substeps:

| Top step                 | Substeps                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ |
| Personal info            | 1. Name + contact + resume (single substep)                                    |
| Professional background  | 1. Guild + level + expertise (single substep)                                  |
| Application questions    | 1. Bio + motivation · 2..N. Each general and level prompt on its own           |
| Review & submit          | 1. Verify wallet + submit (single substep)                                     |

Top steps with a single substep don't render the chip strip — only the standard eyebrow / headline / content.

### Step content components

Existing step components are refactored to render *one substep at a time*, controlled by a new `substepIndex` prop. The pattern follows `GeneralReviewStep.tsx`'s `currentQuestionIndex` (see `GeneralReviewStep.tsx:62–80`).

Affected files:
- `components/guild/application-steps/ResumeAndGeneralStep.tsx` — split internal sections so resume + social + guidance render on substep 0, and each `generalQuestions[i]` renders on substep `i + 1`.
- `components/guild/application-steps/JobQuestionsStep.tsx` — cover letter on substep 0, each screening question on substep `i + 1`.
- `components/guild/application-steps/GuildSpecificsStep.tsx` — level + attestation on substep 0, each domain topic on substep `i + 1`. Drop the accordion in favor of always-expanded single-topic-per-page.
- `components/expert/ApplicationQuestionsSection.tsx` — bio + motivation on substep 0, each prompt on substep `i + 1`.
- `components/expert/PersonalInfoSection.tsx`, `ProfessionalBackgroundSection.tsx`, `ReviewSubmitStep.tsx` — unchanged internals; they're always rendered as their step's only substep.

For each step component that's getting paginated, we'll keep the existing component the integration surface (no rename, no breaking change to its callers' props) and add a `substepIndex` prop. When omitted (e.g., from a hypothetical Story Lab preview), the component falls back to rendering everything stacked, the same way `GeneralReviewStep` does when `currentQuestionIndex` is `null`.

### Substep descriptor — derived in the flow component

Neither data hook needs to change. The flow component (`GuildApplicationFlow`, `ExpertApplicationFlow`) computes the substep list from the same template/job data the hook already exposes. Concretely:

```ts
// inside GuildApplicationFlow, after `flow.template` is loaded
const substepsPerStep: Substep[][] = useMemo(() => {
  const materials: Substep[] = [
    { id: "materials.setup", label: "Materials", isComplete: hasResume && allRequiredSocialLinksPresent },
    ...flow.template.generalQuestions.map((q, i) => ({
      id: `materials.general.${q.id}`,
      label: `Question ${i + 1}`,
      isComplete: (flow.generalAnswers[q.id]?.trim().length ?? 0) >= 100,
      isRequired: q.required,
    })),
  ];
  // ...likewise for role, guild
  return [materials, ...(flow.hasJobStep ? [role] : []), guild];
}, [flow.template, flow.generalAnswers, /* ... */]);
```

The hook continues to own all domain state; substep descriptors are pure derivations of it.

### Validation behavior

- **Setup substep** gates `Continue` — same required-field rules as today (resume present, all required social links connected, level selected, attestation checked, etc.).
- **Prompt substeps** allow `Continue` regardless of answer length. The chip strip and the rail entry surface the incomplete state. This mirrors the review modal, where a reviewer can advance past an unfinished rubric question and come back.
- **Final Submit** button is enabled only when every required substep across every top step is complete. We compute this from the substep descriptors (`allRequiredComplete = substepsPerStep.flat().every(s => !s.isRequired || s.isComplete)`).
- Free intra-step jumping via chips. Free inter-step jumping via the rail, subject to the existing `maxUnlockedStep` constraint that today's apply rail already enforces.

### Hero, nav, success states

Unchanged. The top sticky nav (`ApplyNav`), the hero card (guild avatar + progress bar), the success state, and the wallet-not-connected gate stay as they are. The redesign only touches the wizard chrome (rail + content + footer).

## Files affected

**New:**
- `src/components/wizard/WizardRail.tsx`
- `src/components/wizard/SubstepChipStrip.tsx`
- `src/components/wizard/WizardFooter.tsx`
- `src/components/wizard/useWizardSubsteps.ts`
- `src/components/wizard/types.ts` (the `Substep` shape)

**Modified — chrome:**
- `src/components/guild/GuildApplicationFlow.tsx` — drop inline rail + footer, consume new primitives, derive substep descriptors, render `currentSubstep` only.
- `src/components/expert/ExpertApplicationFlow.tsx` — same.
- `src/components/guild/review/VerticalStepRail.tsx` — internals replaced by `WizardRail`; export surface preserved.

**Modified — step content:**
- `src/components/guild/application-steps/ResumeAndGeneralStep.tsx`
- `src/components/guild/application-steps/JobQuestionsStep.tsx`
- `src/components/guild/application-steps/GuildSpecificsStep.tsx`
- `src/components/expert/ApplicationQuestionsSection.tsx`

**Untouched:**
- `src/lib/hooks/useGuildApplicationFlow.ts`
- `src/lib/hooks/useExpertApplicationFlow.ts`
- `src/components/expert/PersonalInfoSection.tsx`
- `src/components/expert/ProfessionalBackgroundSection.tsx`
- `src/components/expert/ReviewSubmitStep.tsx`
- All API code, draft persistence, types.

## Testing

- Manual: walk both flows end-to-end. Drafts persist across reloads. Submit succeeds. Chip-strip jumping works. Rail click + maxUnlockedStep behaves the same. Mobile layout reflows cleanly.
- Existing tests for the apply flows (if any) should still pass — the hook surface is unchanged.
- Review modal smoke test (manually clicking through commit/reveal) should be unaffected by the `VerticalStepRail` internals swap.

## Open questions

None — all clarifications resolved during brainstorming.
