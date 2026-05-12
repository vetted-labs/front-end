# Apply-Flow Substep Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long-form-per-step apply flows at `/guilds/[guildId]/apply` and `/expert/apply` with a paginated substep UX that mirrors the expert review modal — compact rail, chip-strip substep navigation, one focused question per page.

**Architecture:** Extract reusable wizard primitives (`WizardRail`, `SubstepChipStrip`, `WizardFooter`, `useSubstepIndex`) from the patterns already proven in `VerticalStepRail.tsx` and `GeneralReviewStep.tsx`. Existing data hooks and step content components stay intact; step content gains an optional `substepIndex` prop and the two flow components are rewritten to consume the new chrome.

**Tech Stack:** Next.js 15, React 19, TailwindCSS 4, lucide-react. No new dependencies.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-12-apply-flow-substep-redesign-design.md`
- Visual model: `src/components/guild/review/VerticalStepRail.tsx`, `src/components/guild/review/GeneralReviewStep.tsx:106–125`

**Execution note:** Per user preference, skip the failing-test-first ceremony — implement → verify (lint/typecheck/grep) → commit. Tasks within the same wave are independent and should be dispatched as parallel subagents.

---

## File map

**New:**
- `src/components/wizard/types.ts`
- `src/components/wizard/WizardRail.tsx`
- `src/components/wizard/SubstepChipStrip.tsx`
- `src/components/wizard/WizardFooter.tsx`
- `src/components/wizard/useSubstepIndex.ts`

**Modified (chrome):**
- `src/components/guild/review/VerticalStepRail.tsx` (becomes a thin wrapper over `WizardRail`)
- `src/components/guild/GuildApplicationFlow.tsx`
- `src/components/expert/ExpertApplicationFlow.tsx`

**Modified (step content — add optional `substepIndex` prop):**
- `src/components/guild/application-steps/ResumeAndGeneralStep.tsx`
- `src/components/guild/application-steps/JobQuestionsStep.tsx`
- `src/components/guild/application-steps/GuildSpecificsStep.tsx`
- `src/components/expert/ApplicationQuestionsSection.tsx`

**Untouched:**
- `src/lib/hooks/useGuildApplicationFlow.ts`, `src/lib/hooks/useExpertApplicationFlow.ts`
- `src/components/expert/PersonalInfoSection.tsx`, `ProfessionalBackgroundSection.tsx`, `ReviewSubmitStep.tsx`
- All API code, draft persistence, types

---

## Wave 1 — Shared wizard primitives (parallel)

### Task 1: Substep types + `useSubstepIndex` hook

**Files:**
- Create: `src/components/wizard/types.ts`
- Create: `src/components/wizard/useSubstepIndex.ts`

- [ ] **Step 1: Write `src/components/wizard/types.ts`**

```tsx
export interface SubstepDescriptor {
  /** Stable id used as React key and analytics handle. */
  id: string;
  /** Human label shown in the chip strip. Keep short (≤ 24 chars). */
  label: string;
  /** Whether the user has completed this substep's required fields. */
  isComplete: boolean;
  /**
   * Whether the substep must be complete before the whole form can submit.
   * Required substeps that are incomplete render a warning chip and block
   * the final Submit button. Non-required substeps never block submission.
   */
  isRequired?: boolean;
}
```

- [ ] **Step 2: Write `src/components/wizard/useSubstepIndex.ts`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface UseSubstepIndexArgs {
  /** Index of the active top-level step. When this changes, the substep
   *  index resets to 0 unless a pending value was queued via
   *  `queuePendingSubstep` before the change. */
  topStepIndex: number;
}

/**
 * Owns the active substep index for the current top-level step. When the
 * top step changes, the substep resets to 0 — unless `queuePendingSubstep`
 * was called immediately before the change, in which case it lands on the
 * queued value. That hook lets a Back button at substep 0 retreat to the
 * *last* substep of the previous top step in one click.
 */
export function useSubstepIndex({ topStepIndex }: UseSubstepIndexArgs) {
  const [substepIndex, setSubstepIndex] = useState(0);
  const pendingRef = useRef<number | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- this hook IS the abstraction over top-step transitions; resetting the substep index when the parent step changes is its core responsibility.
  useEffect(() => {
    if (pendingRef.current !== null) {
      setSubstepIndex(pendingRef.current);
      pendingRef.current = null;
    } else {
      setSubstepIndex(0);
    }
  }, [topStepIndex]);

  const queuePendingSubstep = (index: number) => {
    pendingRef.current = index;
  };

  return { substepIndex, setSubstepIndex, queuePendingSubstep };
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit -p .
```

Expected: no errors related to these new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/types.ts src/components/wizard/useSubstepIndex.ts
git commit -m "feat(wizard): substep descriptor type and index hook"
```

---

### Task 2: `WizardRail` component

**Files:**
- Create: `src/components/wizard/WizardRail.tsx`

- [ ] **Step 1: Write `src/components/wizard/WizardRail.tsx`**

Port the step-list rendering from `src/components/guild/review/VerticalStepRail.tsx:86–177` into a reusable component. Drop the review-specific defaults (REVIEW_STEPS, "expert" variant override, commit-reveal block) — the wrapper in Task 5 reintroduces them.

```tsx
"use client";

import { STATUS_COLORS } from "@/config/colors";

export interface WizardRailStep {
  /** 1-indexed step number used inside the circle. */
  number: number;
  label: string;
}

export interface WizardRailProps {
  /** Optional small label above the list (e.g. "Application", "Review"). */
  sectionLabel?: string;
  steps: ReadonlyArray<WizardRailStep>;
  /** 1-indexed active step. */
  currentStep: number;
  completedSteps?: ReadonlyArray<number>;
  incompleteSteps?: ReadonlyArray<number>;
  /** Steps with number > this render as locked. Defaults to no lock. */
  maxUnlockedStep?: number;
  onStepClick?: (step: number) => void;
  /** Override the label rendered for a given step (for variants). */
  labelOverride?: (step: WizardRailStep) => string;
  /** Content rendered below the step list (e.g. commit-reveal sub-rail). */
  children?: React.ReactNode;
}

export function WizardRail({
  sectionLabel,
  steps,
  currentStep,
  completedSteps,
  incompleteSteps,
  maxUnlockedStep,
  onStepClick,
  labelOverride,
  children,
}: WizardRailProps) {
  const completedSet = new Set(completedSteps ?? []);
  const incompleteSet = new Set(incompleteSteps ?? []);
  const lockBoundary =
    typeof maxUnlockedStep === "number" ? maxUnlockedStep : Number.POSITIVE_INFINITY;

  return (
    <nav
      aria-label={`${sectionLabel ?? "Wizard"} steps`}
      className="flex flex-col gap-1 px-3 py-5 text-sm select-none"
    >
      {sectionLabel && (
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
          {sectionLabel}
        </p>
      )}

      {steps.map((step) => {
        const isActive = currentStep === step.number;
        const isCompleted =
          completedSet.has(step.number) ||
          (!completedSteps && currentStep > step.number);
        const isIncomplete = incompleteSet.has(step.number) && !isCompleted;
        const isLocked = step.number > lockBoundary && !isCompleted;
        const clickable = !!onStepClick && !isLocked;
        const tooltip = isLocked
          ? "Complete prior steps first"
          : isIncomplete
            ? "Unfinished required fields"
            : undefined;

        const circleClass = isCompleted
          ? `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}`
          : isActive
            ? "bg-primary border-primary text-primary-foreground"
            : isIncomplete
              ? `${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.border}`
              : "bg-muted/40 border-border text-muted-foreground";

        const rowClass = isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground";

        const lockedClass = isLocked ? "opacity-50 cursor-not-allowed" : "";
        const labelText = labelOverride ? labelOverride(step) : step.label;

        const inner = (
          <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold ${circleClass}`}
              aria-hidden="true"
            >
              {isCompleted ? (
                <svg
                  className={`w-3 h-3 ${STATUS_COLORS.positive.icon}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : isIncomplete ? (
                <span className={STATUS_COLORS.warning.text}>!</span>
              ) : (
                step.number
              )}
            </span>
            <span
              className={`text-[13px] font-medium ${
                isActive ? "text-foreground" : ""
              }`}
            >
              {labelText}
            </span>
          </span>
        );

        if (clickable) {
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onStepClick?.(step.number)}
              title={tooltip}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${labelText}${isCompleted ? " (complete)" : isIncomplete ? " (incomplete)" : ""}`}
              className={`text-left rounded-lg transition-colors ${rowClass} ${lockedClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={step.number}
            title={tooltip}
            aria-current={isActive ? "step" : undefined}
            className={`rounded-lg ${rowClass} ${lockedClass}`}
          >
            {inner}
          </div>
        );
      })}

      {children}
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/WizardRail.tsx
git commit -m "feat(wizard): extract WizardRail primitive"
```

---

### Task 3: `SubstepChipStrip` component

**Files:**
- Create: `src/components/wizard/SubstepChipStrip.tsx`

- [ ] **Step 1: Write `src/components/wizard/SubstepChipStrip.tsx`**

```tsx
"use client";

import { STATUS_COLORS } from "@/config/colors";
import type { SubstepDescriptor } from "./types";

export interface SubstepChipStripProps {
  /** Substeps for the current top step. */
  substeps: ReadonlyArray<SubstepDescriptor>;
  /** Active substep index (0-based). */
  activeIndex: number;
  onJumpTo: (index: number) => void;
}

/**
 * Horizontal chip strip for paginated substeps. Hidden when ≤ 1 substep —
 * single-substep steps don't need navigation.
 *
 * Visual model: `GeneralReviewStep.tsx:106–125` (question jump strip).
 */
export function SubstepChipStrip({
  substeps,
  activeIndex,
  onJumpTo,
}: SubstepChipStripProps) {
  if (substeps.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-6">
      {substeps.map((substep, idx) => {
        const isActive = idx === activeIndex;
        const cls = isActive
          ? "bg-primary text-primary-foreground border-primary"
          : substep.isComplete
            ? `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.text}`
            : substep.isRequired
              ? "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground";
        return (
          <button
            key={substep.id}
            type="button"
            onClick={() => onJumpTo(idx)}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${substep.label}${substep.isComplete ? " (complete)" : substep.isRequired ? " (incomplete)" : ""}`}
            className={`h-8 px-3 rounded-md border text-xs font-semibold transition-colors ${cls}`}
          >
            <span className="tabular-nums mr-1.5 opacity-70">
              {String(idx + 1).padStart(2, "0")}
            </span>
            {substep.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/SubstepChipStrip.tsx
git commit -m "feat(wizard): substep chip strip primitive"
```

---

### Task 4: `WizardFooter` component

**Files:**
- Create: `src/components/wizard/WizardFooter.tsx`

- [ ] **Step 1: Write `src/components/wizard/WizardFooter.tsx`**

Replaces the two near-identical inline footers in `GuildApplicationFlow.tsx:334–395` and `ExpertApplicationFlow.tsx:412–485`.

```tsx
"use client";

import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";

export interface WizardFooterProps {
  /** Display: "Step N of M · X%". */
  stepLabel: string;
  /** 0..100 — drives the progress bar. */
  progressPct: number;
  isSubmitting: boolean;
  /** True when the active substep is the last one of the last top step. */
  isFinalSubstep: boolean;
  /** True when Back should be enabled. Cancel renders in its place when false. */
  canGoBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function WizardFooter({
  stepLabel,
  progressPct,
  isSubmitting,
  isFinalSubstep,
  canGoBack,
  onBack,
  onContinue,
  onCancel,
}: WizardFooterProps) {
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky bottom-0">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="w-44 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="tabular-nums">{stepLabel}</span>
      </div>

      <div className="flex gap-2.5">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-foreground bg-muted hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-muted-foreground bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : isFinalSubstep ? (
            <>
              <Send className="w-3.5 h-3.5" />
              Submit application
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/WizardFooter.tsx
git commit -m "feat(wizard): footer primitive"
```

---

## Wave 2 — Re-point existing review rail to `WizardRail`

### Task 5: Refactor `VerticalStepRail` to wrap `WizardRail`

**Files:**
- Modify: `src/components/guild/review/VerticalStepRail.tsx`

**Depends on:** Task 2 (`WizardRail` must exist).

- [ ] **Step 1: Replace `src/components/guild/review/VerticalStepRail.tsx` content**

Replace the entire file with the version below. Public props (`VerticalStepRailProps`, exported `StepDef`) are unchanged so the review modal needs no edits.

```tsx
"use client";

import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";

export interface StepDef {
  number: number;
  label: string;
}

const REVIEW_STEPS: ReadonlyArray<StepDef> = [
  { number: 1, label: "Materials" },
  { number: 2, label: "General rubric" },
  { number: 3, label: "Domain rubric" },
  { number: 4, label: "Confirm & submit" },
];

const COMMIT_REVEAL_STEPS: ReadonlyArray<{ label: string; sub: string }> = [
  { label: "Sign commit", sub: "after Submit" },
  { label: "Reveal", sub: "after deadline" },
];

export interface VerticalStepRailProps {
  currentStep: number;
  completedSteps?: ReadonlyArray<number>;
  incompleteSteps?: ReadonlyArray<number>;
  maxUnlockedStep?: number;
  onStepClick?: (step: number) => void;
  isCommitPhase?: boolean;
  variant?: "candidate" | "expert";
  steps?: ReadonlyArray<StepDef>;
  sectionLabel?: string;
  showCommitReveal?: boolean;
}

export function VerticalStepRail({
  currentStep,
  completedSteps,
  incompleteSteps,
  maxUnlockedStep,
  onStepClick,
  isCommitPhase = false,
  variant = "candidate",
  steps,
  sectionLabel = "Review",
  showCommitReveal = true,
}: VerticalStepRailProps) {
  const stepList = steps ?? REVIEW_STEPS;

  const labelOverride = (step: WizardRailStep): string => {
    if (variant === "expert" && step.number === 2) return "Sponsor vouch";
    if (variant === "expert" && step.number === 3) return "Membership rubric";
    return step.label;
  };

  return (
    <WizardRail
      sectionLabel={sectionLabel}
      steps={stepList}
      currentStep={currentStep}
      completedSteps={completedSteps}
      incompleteSteps={incompleteSteps}
      maxUnlockedStep={maxUnlockedStep}
      onStepClick={onStepClick}
      labelOverride={labelOverride}
    >
      {showCommitReveal && (
        <>
          <p className="mt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
            Commit-Reveal
          </p>

          {COMMIT_REVEAL_STEPS.map((step, idx) => {
            const isActive = isCommitPhase && idx === 0;
            const circleClass = isActive
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-muted/40 border-border text-muted-foreground";

            return (
              <div
                key={step.label}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                  isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold ${circleClass}`}
                  aria-hidden="true"
                >
                  {idx + 5}
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-medium">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {step.sub}
                  </span>
                </span>
              </div>
            );
          })}
        </>
      )}
    </WizardRail>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/guild/review/VerticalStepRail.tsx
```

Expected: clean.

- [ ] **Step 3: Manual smoke (review modal)**

Open `http://localhost:3030/expert/dashboard`, click into any pending application, open the review modal. Verify the rail renders identically to before (numbered circles, "Review" header, commit-reveal sub-section visible).

- [ ] **Step 4: Commit**

```bash
git add src/components/guild/review/VerticalStepRail.tsx
git commit -m "refactor(review): VerticalStepRail wraps WizardRail"
```

---

## Wave 3 — Add `substepIndex` to step content (parallel)

Each task in this wave is independent. The pattern: add an optional `substepIndex?: number` prop. When `undefined`, the component renders everything stacked (existing behavior — important for fallback / preview surfaces). When defined, it renders only the substep's slice.

### Task 6: `ResumeAndGeneralStep` substep support

**Files:**
- Modify: `src/components/guild/application-steps/ResumeAndGeneralStep.tsx`

Substep mapping for this component:
- `substepIndex === 0` → Guidance card + Required social links + Resume upload (the existing setup sections)
- `substepIndex >= 1` → render `template.generalQuestions[substepIndex - 1]` only

- [ ] **Step 1: Modify component signature and add slicing logic**

In `src/components/guild/application-steps/ResumeAndGeneralStep.tsx`:

Add `substepIndex?: number` to `ResumeAndGeneralStepProps` and destructure it. Then wrap the existing JSX so:
- the guidance / required-social-links / resume sections render only when `substepIndex === undefined || substepIndex === 0`
- the general-questions block renders the full list when `substepIndex === undefined`, otherwise renders only the question at index `substepIndex - 1`

Concrete change to the props interface (insert near line 23):

```tsx
interface ResumeAndGeneralStepProps {
  template: GuildApplicationTemplate;
  profileResume: ProfileResume | null;
  useProfileResume: boolean;
  setUseProfileResume: (val: boolean) => void;
  resumeFile: File | null;
  resumeUrl: string;
  uploadingResume: boolean;
  onResumeSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveResume: () => void;
  generalAnswers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  requiredSocialLinks?: string[];
  candidateSocialLinks?: SocialLink[];
  /** When set, render only the slice for this substep. Undefined = render all (legacy). */
  substepIndex?: number;
}
```

Add destructure default + helper near the top of the component:

```tsx
const isSetupSubstep = substepIndex === undefined || substepIndex === 0;
const generalQs = template.generalQuestions ?? [];
const promptQ = substepIndex !== undefined && substepIndex > 0
  ? generalQs[substepIndex - 1]
  : null;
```

Wrap the existing guidance/social/resume `<section>`s in `{isSetupSubstep && (<>...</>)}`.

For the general-questions block, replace the `generalQs.map(...)` body with:

```tsx
{(substepIndex === undefined
  ? generalQs
  : promptQ
    ? [promptQ]
    : []
).map((q, localIdx) => {
  const qIndex = substepIndex === undefined ? localIdx : substepIndex - 1;
  return (
    <div key={q.id} className="space-y-3">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
          Question {String(qIndex + 1).padStart(2, "0")}
          {q.required && <span className="text-destructive ml-1">·  required</span>}
        </p>
        <p className="text-[15px] font-semibold text-foreground leading-snug">
          {q.prompt}
        </p>
      </div>

      {q.hints && q.hints.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
            Touch on
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground leading-relaxed">
            {q.hints.map((hint, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground/50 mt-1.5 leading-none">•</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Textarea
        value={generalAnswers[q.id] || ""}
        onChange={(e) => onAnswerChange(q.id, e.target.value)}
        rows={6}
        placeholder="Your answer…"
        showCounter
        minLength={100}
        maxLength={2500}
      />
    </div>
  );
})}
```

Wrap the `{template.generalQuestions && template.generalQuestions.length > 0 && (<section>...</section>)}` block so it also renders when `substepIndex === undefined` OR `substepIndex >= 1` (i.e., hide it on the setup page only):

```tsx
{!isSetupSubstep && template.generalQuestions && template.generalQuestions.length > 0 && (
  <section>
    {/* ...existing header + the new question-rendering block... */}
  </section>
)}
{substepIndex === undefined && template.generalQuestions && template.generalQuestions.length > 0 && (
  <section>
    {/* same content for the legacy "render all" path */}
  </section>
)}
```

Avoid the duplication by extracting the question block into a local helper inside the same file:

```tsx
function GeneralQuestionsBlock({
  questions,
  generalAnswers,
  onAnswerChange,
  startIndex,
}: {
  questions: GuildApplicationQuestion[];
  generalAnswers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  startIndex: number;
}) { /* …extracted JSX… */ }
```

(Import `GuildApplicationQuestion` from `@/types` if not already imported.)

The final render becomes:

```tsx
return (
  <div className="space-y-10">
    {isSetupSubstep && (
      <>
        {/* guidance section */}
        {/* required-social-links section */}
        {/* resume section */}
      </>
    )}

    {(substepIndex === undefined || promptQ) && generalQs.length > 0 && (
      <section>
        <SectionHeader
          title="General questions"
          description="Short prompts to assess judgment and clarity. Three to five sentences each is usually enough."
        />
        <div className="space-y-8">
          <GeneralQuestionsBlock
            questions={substepIndex === undefined ? generalQs : [promptQ!]}
            generalAnswers={generalAnswers}
            onAnswerChange={onAnswerChange}
            startIndex={substepIndex === undefined ? 0 : substepIndex - 1}
          />
        </div>
      </section>
    )}
  </div>
);
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/guild/application-steps/ResumeAndGeneralStep.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/application-steps/ResumeAndGeneralStep.tsx
git commit -m "feat(apply): substepIndex support in ResumeAndGeneralStep"
```

---

### Task 7: `JobQuestionsStep` substep support

**Files:**
- Modify: `src/components/guild/application-steps/JobQuestionsStep.tsx`

Substep mapping:
- `substepIndex === 0` → Job context card + Cover letter
- `substepIndex >= 1` → render `screeningQuestions[substepIndex - 1]` only

- [ ] **Step 1: Modify component**

Add `substepIndex?: number` to `JobQuestionsStepProps`. Destructure it. Add at top of component body:

```tsx
const isSetupSubstep = substepIndex === undefined || substepIndex === 0;
const promptIndex = substepIndex !== undefined && substepIndex > 0
  ? substepIndex - 1
  : null;
```

Wrap the "Job context" section and the "Cover letter" section so they only render when `isSetupSubstep`.

Replace the screening-questions `.map` body with:

```tsx
{!isSetupSubstep && screeningQuestions.length > 0 && promptIndex !== null && screeningQuestions[promptIndex] && (
  <section>
    <SectionHeader
      title={
        <span className="inline-flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          Screening question {promptIndex + 1}
        </span>
      }
      description="Custom question from the hiring team. Be specific — your answer goes directly to recruiters."
    />
    <div className="space-y-3">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
          Question {String(promptIndex + 1).padStart(2, "0")}{" "}
          <span className="text-destructive">·  required</span>
        </p>
        <p className="text-[15px] font-semibold text-foreground leading-snug">
          {screeningQuestions[promptIndex]}
        </p>
      </div>
      <Textarea
        value={screeningAnswers[promptIndex] || ""}
        onChange={(e) => onScreeningAnswerChange(promptIndex, e.target.value)}
        rows={4}
        placeholder="Your answer…"
      />
    </div>
  </section>
)}

{substepIndex === undefined && screeningQuestions.length > 0 && (
  /* preserve the original full-list rendering — copy the existing block here verbatim */
)}
```

For the legacy `substepIndex === undefined` branch, keep the original screening-questions block from the current file (the existing `<section>` with the `.map`).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/guild/application-steps/JobQuestionsStep.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/application-steps/JobQuestionsStep.tsx
git commit -m "feat(apply): substepIndex support in JobQuestionsStep"
```

---

### Task 8: `GuildSpecificsStep` substep support

**Files:**
- Modify: `src/components/guild/application-steps/GuildSpecificsStep.tsx`

Substep mapping:
- `substepIndex === 0` → Experience level + No-AI declaration
- `substepIndex >= 1` → render `currentDomainLevel.topics[substepIndex - 1]` only (always expanded, no accordion)

- [ ] **Step 1: Modify component**

Add `substepIndex?: number` to `GuildSpecificsStepProps`. Destructure it.

Add at top of component body:

```tsx
const isSetupSubstep = substepIndex === undefined || substepIndex === 0;
const promptIndex = substepIndex !== undefined && substepIndex > 0
  ? substepIndex - 1
  : null;
const promptTopic = currentDomainLevel && promptIndex !== null
  ? currentDomainLevel.topics[promptIndex] ?? null
  : null;
```

Wrap the "Experience Level" section in `{isSetupSubstep && (...)}`.
Wrap the "No-AI Declaration" section in `{isSetupSubstep && template.noAiDeclarationText && (...)}`.

Replace the "Domain Questions" `currentDomainLevel.topics.map(...)` body with two branches:

```tsx
{/* Legacy fallback: render full accordion */}
{substepIndex === undefined && currentDomainLevel && currentDomainLevel.topics.length > 0 && (
  <section>
    <SectionHeader
      title={currentDomainLevel.templateName}
      description={currentDomainLevel.description}
    />
    <div className="space-y-2">
      {currentDomainLevel.topics.map((topic, tIndex) => {
        /* …existing accordion item code… */
      })}
    </div>
  </section>
)}

{/* Substep mode: render single topic, always expanded */}
{!isSetupSubstep && promptTopic && (
  <section>
    <SectionHeader
      title={promptTopic.title}
      description={currentDomainLevel?.description ?? ""}
    />
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
        {promptTopic.prompt}
      </div>
      <textarea
        value={domainAnswers[`domain.${promptTopic.id}`] || ""}
        onChange={(e) => onDomainAnswerChange(`domain.${promptTopic.id}`, e.target.value)}
        placeholder="Your answer…"
        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none transition-shadow"
        rows={10}
      />
      {(() => {
        const len = (domainAnswers[`domain.${promptTopic.id}`] || "").trim().length;
        const answered = len >= 50;
        return (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-[11px] font-medium tabular-nums",
                answered ? STATUS_COLORS.positive.text : "text-muted-foreground",
              )}
            >
              {len} / 50 min characters
            </span>
          </div>
        );
      })()}
    </div>
  </section>
)}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/guild/application-steps/GuildSpecificsStep.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/guild/application-steps/GuildSpecificsStep.tsx
git commit -m "feat(apply): substepIndex support in GuildSpecificsStep"
```

---

### Task 9: `ApplicationQuestionsSection` (expert) substep support

**Files:**
- Modify: `src/components/expert/ApplicationQuestionsSection.tsx`

Substep mapping for expert step 3:
- `substepIndex === 0` → Guidance + Bio + Motivation + No-AI declaration
- `substepIndex` ∈ `[1, generalCount]` → render that general question
- `substepIndex` ∈ `[generalCount + 1, generalCount + levelCount]` → render that level topic

Where `generalCount = generalTemplate?.generalQuestions?.length ?? 0` and `levelCount = levelTemplate?.topics?.length ?? 0`.

- [ ] **Step 1: Modify component**

Add `substepIndex?: number` to `ApplicationQuestionsSectionProps`. Destructure it.

At the top of the component body, compute slicing:

```tsx
const generalQs = generalTemplate?.generalQuestions ?? [];
const levelTopics = levelTemplate?.topics ?? [];
const generalCount = generalQs.length;
const isSetupSubstep = substepIndex === undefined || substepIndex === 0;

let activeGeneralQ: GuildApplicationQuestion | null = null;
let activeLevelTopic: GuildDomainTopic | null = null;
let activeQuestionLabel = "";

if (substepIndex !== undefined && substepIndex > 0) {
  const slotIndex = substepIndex - 1; // 0..(generalCount + levelCount - 1)
  if (slotIndex < generalCount) {
    activeGeneralQ = generalQs[slotIndex] ?? null;
    activeQuestionLabel = `General question ${slotIndex + 1}`;
  } else {
    const levelOffset = slotIndex - generalCount;
    activeLevelTopic = levelTopics[levelOffset] ?? null;
    activeQuestionLabel = activeLevelTopic?.title ?? `Level question ${levelOffset + 1}`;
  }
}
```

Restructure the return JSX. Today the component renders four `<div className="p-8 ...">` sections in this order: (1) Guidance + NoAI, (2) General questions, (3) Level questions, (4) Bio + Motivation. For substep mode, the order on substep 0 should be: Guidance → Bio → Motivation → NoAI declaration (so the "intro/setup" experience reads naturally). Substep 1..N each render a single question card.

Concretely, replace the existing return with:

```tsx
return (
  <>
    {isSetupSubstep && (
      <>
        {/* Application Guidance + NoAI */}
        <div className="p-8 space-y-6 bg-muted/30">
          {/* existing guidance block from lines 51–104 verbatim */}
        </div>

        {/* Bio & Motivation (moved up from the bottom of the file) */}
        <div className="p-8 space-y-6 bg-muted/30">
          {/* existing bio + motivation block, currently at lines 254–end */}
        </div>
      </>
    )}

    {!isSetupSubstep && activeGeneralQ && (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className={`w-10 h-10 ${STATUS_COLORS.warning.bgSubtle} rounded-lg flex items-center justify-center`}>
            <FileText className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{activeQuestionLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {activeGeneralQ.title}
            </p>
          </div>
        </div>
        {/* render the existing single general-question card from lines 134–185 using activeGeneralQ */}
      </div>
    )}

    {!isSetupSubstep && activeLevelTopic && (
      <div className="p-8 space-y-6 bg-muted/30">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className={`w-10 h-10 ${STATUS_COLORS.info.bgSubtle} rounded-lg flex items-center justify-center`}>
            <Briefcase className={`w-5 h-5 ${STATUS_COLORS.info.icon}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{activeLevelTopic.title}</h2>
            <p className="text-sm text-muted-foreground">Level-specific question</p>
          </div>
        </div>
        {/* render the existing single level-topic card from lines 207–245 using activeLevelTopic */}
      </div>
    )}

    {substepIndex === undefined && (
      <>
        {/* Legacy full-stack rendering — keep the original four sections intact for any non-paginated caller */}
      </>
    )}
  </>
);
```

To avoid duplicating ~150 lines of JSX, extract three local components inside this file:
- `GeneralQuestionCard({ question, answerKey, generalAnswers, onUpdateGeneralAnswer, fieldErrors, onBlur })`
- `LevelTopicCard({ topic, levelAnswers, onUpdateLevelAnswer, fieldErrors, onBlur })`
- `GuidanceAndNoAiBlock({...props})` and `BioMotivationBlock({...props})` for the setup substep

Then the substep branches and the legacy `substepIndex === undefined` branch both call into these helpers.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/expert/ApplicationQuestionsSection.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/ApplicationQuestionsSection.tsx
git commit -m "feat(expert-apply): substepIndex support in ApplicationQuestionsSection"
```

---

## Wave 4 — Integrate flows (parallel)

### Task 10: Refactor `GuildApplicationFlow.tsx`

**Files:**
- Modify: `src/components/guild/GuildApplicationFlow.tsx`

**Depends on:** Tasks 1–4, 6, 7, 8.

- [ ] **Step 1: Add imports**

At the top of the file, alongside the existing imports:

```tsx
import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";
import { SubstepChipStrip } from "@/components/wizard/SubstepChipStrip";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { useSubstepIndex } from "@/components/wizard/useSubstepIndex";
import type { SubstepDescriptor } from "@/components/wizard/types";
```

- [ ] **Step 2: Derive substep descriptors inside the component**

After `if (!flow.template) return null;` add a `useMemo` that builds the substep list for every top step. Place this between the `flow.template` null-check and the existing `stepDefs` computation:

```tsx
const substepsPerStep = useMemo<SubstepDescriptor[][]>(() => {
  const result: SubstepDescriptor[][] = [];
  const template = flow.template;
  if (!template) return result;

  // ── Step: Materials ───────────────────────────────────────────────
  const hasResume =
    !!flow.resumeUrl ||
    (flow.useProfileResume && !!flow.profileResume?.resumeUrl);
  const allRequiredSocials = (template.requiredSocialLinks ?? []).every((p) =>
    flow.candidateSocialLinks?.some((l) => l.platform === p && l.url?.trim()),
  );
  const materialsSetupComplete = hasResume && allRequiredSocials;

  const materials: SubstepDescriptor[] = [
    {
      id: "materials.setup",
      label: "Resume & links",
      isComplete: materialsSetupComplete,
      isRequired: true,
    },
    ...(template.generalQuestions ?? []).map((q, i) => ({
      id: `materials.general.${q.id}`,
      label: `Question ${i + 1}`,
      isComplete: (flow.generalAnswers[q.id]?.trim().length ?? 0) >= 100,
      isRequired: q.required ?? false,
    })),
  ];
  result.push(materials);

  // ── Step: Role (if hasJobStep) ────────────────────────────────────
  if (flow.hasJobStep && flow.jobData) {
    const coverLetterDone = flow.coverLetter.trim().length >= 50;
    const role: SubstepDescriptor[] = [
      {
        id: "role.cover",
        label: "Cover letter",
        isComplete: coverLetterDone,
        isRequired: true,
      },
      ...(flow.jobData.screeningQuestions ?? []).map((_, i) => ({
        id: `role.screening.${i}`,
        label: `Question ${i + 1}`,
        isComplete: (flow.screeningAnswers[i]?.trim().length ?? 0) >= 10,
        isRequired: true,
      })),
    ];
    result.push(role);
  }

  // ── Step: Guild specifics ─────────────────────────────────────────
  const levelTopics = flow.selectedLevel
    ? template.domainQuestions[flow.selectedLevel as keyof typeof template.domainQuestions]?.topics ?? []
    : [];
  const guildSetupComplete =
    !!flow.selectedLevel &&
    (!template.noAiDeclarationText || flow.noAiDeclaration);

  const guild: SubstepDescriptor[] = [
    {
      id: "guild.setup",
      label: "Level & attestation",
      isComplete: guildSetupComplete,
      isRequired: true,
    },
    ...levelTopics.map((topic) => ({
      id: `guild.${topic.id}`,
      label: topic.title,
      isComplete:
        (flow.domainAnswers[`domain.${topic.id}`]?.trim().length ?? 0) >= 50,
      isRequired: true,
    })),
  ];
  result.push(guild);

  return result;
}, [
  flow.template,
  flow.resumeUrl,
  flow.useProfileResume,
  flow.profileResume,
  flow.candidateSocialLinks,
  flow.generalAnswers,
  flow.hasJobStep,
  flow.jobData,
  flow.coverLetter,
  flow.screeningAnswers,
  flow.selectedLevel,
  flow.noAiDeclaration,
  flow.domainAnswers,
]);
```

- [ ] **Step 3: Wire up substep index hook + derived state**

After the `useMemo`:

```tsx
const { substepIndex, setSubstepIndex, queuePendingSubstep } = useSubstepIndex({
  topStepIndex: flow.currentStep,
});

const currentSubsteps = substepsPerStep[flow.currentStep] ?? [];
const safeSubstepIndex = Math.min(substepIndex, Math.max(currentSubsteps.length - 1, 0));
const isLastSubstepInStep = safeSubstepIndex >= currentSubsteps.length - 1;
const isFinalSubstep = flow.isLastStep && isLastSubstepInStep;

const totalSubsteps = substepsPerStep.reduce((acc, s) => acc + s.length, 0);
const completedSubsteps = substepsPerStep
  .flat()
  .filter((s, idx, all) => {
    // Count substeps that come before the active position OR are marked complete.
    return s.isComplete;
  }).length;
const progressPct = totalSubsteps === 0 ? 0 : Math.round((completedSubsteps / totalSubsteps) * 100);

const incompleteTopSteps: number[] = substepsPerStep
  .map((substeps, idx) => ({
    stepNum: idx + 1,
    anyRequiredIncomplete: substeps.some((s) => s.isRequired && !s.isComplete),
  }))
  .filter((s) => s.anyRequiredIncomplete && s.stepNum !== flow.currentStep + 1)
  .map((s) => s.stepNum);
```

- [ ] **Step 4: Define navigation handlers**

```tsx
const handleContinue = () => {
  if (!isLastSubstepInStep) {
    setSubstepIndex(safeSubstepIndex + 1);
    return;
  }
  // Crossing into next top step (or submitting) — delegate to the flow hook,
  // which runs full step validation and advances `flow.currentStep`.
  flow.handleContinue();
};

const handleBack = () => {
  if (safeSubstepIndex > 0) {
    setSubstepIndex(safeSubstepIndex - 1);
    return;
  }
  if (flow.currentStep > 0) {
    const prevSubsteps = substepsPerStep[flow.currentStep - 1] ?? [];
    queuePendingSubstep(Math.max(prevSubsteps.length - 1, 0));
    flow.handleBack();
  }
};

const handleStepClick = (stepNumber: number) => {
  // The rail uses 1-indexed step numbers; flow.handleStepClick takes 0-indexed.
  flow.handleStepClick(stepNumber - 1);
};

const handleChipJump = (idx: number) => {
  setSubstepIndex(idx);
};
```

- [ ] **Step 5: Replace the rendered chrome**

In the JSX, replace the existing `<aside>` rail block (currently lines 141–252 of the file, the `aside` from "Left rail" comment through `</aside>`) with:

```tsx
<aside className="bg-background border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 lg:self-start">
  <div className="flex items-center gap-2.5 px-6 pb-6 border-b border-border mb-6">
    <div
      className="w-7 h-7 rounded-lg grid place-items-center text-white font-black text-sm font-display"
      style={{ background: "linear-gradient(135deg, #ff7a1a, #ff4d00)" }}
    >
      V
    </div>
    <div className="font-bold text-sm text-foreground tracking-tight">
      Candidate application
    </div>
  </div>

  <WizardRail
    sectionLabel="Application"
    steps={stepDefs.map<WizardRailStep>((s) => ({ number: s.num, label: s.name }))}
    currentStep={flow.currentStep + 1}
    incompleteSteps={incompleteTopSteps}
    onStepClick={handleStepClick}
  />

  {flow.draftRestored && (
    <div className="mx-6 mt-6 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2.5 flex items-start gap-2">
      {/* …keep existing draft-restored notice verbatim… */}
    </div>
  )}

  {jobTitle && (
    <div className="mx-6 mt-6 rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2">
      {/* …keep existing job-context tile verbatim… */}
    </div>
  )}
</aside>
```

In the `<main>` block, after the error Alert and before the step content, insert the chip strip:

```tsx
<SubstepChipStrip
  substeps={currentSubsteps}
  activeIndex={safeSubstepIndex}
  onJumpTo={handleChipJump}
/>
```

Pass `substepIndex={safeSubstepIndex}` to each of `ResumeAndGeneralStep`, `JobQuestionsStep`, and `GuildSpecificsStep`.

Replace the existing sticky footer (lines 334–395) with:

```tsx
<WizardFooter
  stepLabel={
    isFinalSubstep
      ? `Step ${flow.currentStep + 1} of ${stepDefs.length} · ready to submit`
      : `Step ${flow.currentStep + 1} of ${stepDefs.length} · substep ${safeSubstepIndex + 1} of ${currentSubsteps.length}`
  }
  progressPct={progressPct}
  isSubmitting={flow.isSubmitting}
  isFinalSubstep={isFinalSubstep}
  canGoBack={flow.currentStep > 0 || safeSubstepIndex > 0}
  onBack={handleBack}
  onContinue={handleContinue}
  onCancel={() => router.push(`/guilds/${flow.guildId}`)}
/>
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/guild/GuildApplicationFlow.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/guild/GuildApplicationFlow.tsx
git commit -m "feat(apply): paginated substeps in candidate guild apply flow"
```

---

### Task 11: Refactor `ExpertApplicationFlow.tsx`

**Files:**
- Modify: `src/components/expert/ExpertApplicationFlow.tsx`

**Depends on:** Tasks 1–4, 9.

- [ ] **Step 1: Add imports**

```tsx
import { useMemo } from "react";
import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";
import { SubstepChipStrip } from "@/components/wizard/SubstepChipStrip";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { useSubstepIndex } from "@/components/wizard/useSubstepIndex";
import type { SubstepDescriptor } from "@/components/wizard/types";
```

- [ ] **Step 2: Derive substep descriptors**

After the existing `flow = useExpertApplicationFlow()` and the pre-render guards (success / wallet-not-connected), insert the substep computation:

```tsx
const substepsPerStep = useMemo<SubstepDescriptor[][]>(() => {
  // ── Step 0: Personal info ─────────────────────────────────────────
  const personalComplete =
    !!flow.formData.fullName?.trim() &&
    !!flow.formData.email?.trim() &&
    !!flow.resumeFile;
  const personalInfo: SubstepDescriptor[] = [
    {
      id: "personal.setup",
      label: "Personal info",
      isComplete: personalComplete,
      isRequired: true,
    },
  ];

  // ── Step 1: Professional background ───────────────────────────────
  const professionalComplete =
    !!flow.selectedGuildId &&
    !!flow.formData.expertiseLevel &&
    (flow.formData.expertiseAreas?.length ?? 0) > 0;
  const professional: SubstepDescriptor[] = [
    {
      id: "professional.setup",
      label: "Background",
      isComplete: professionalComplete,
      isRequired: true,
    },
  ];

  // ── Step 2: Application questions ─────────────────────────────────
  const setupComplete =
    (flow.formData.bio?.trim().length ?? 0) >= 50 &&
    (flow.formData.motivation?.trim().length ?? 0) >= 50 &&
    flow.noAiDeclaration;

  const generalQs = flow.applicationQuestionsProps.generalTemplate?.generalQuestions ?? [];
  const levelTopics = flow.levelTemplate?.topics ?? [];

  const application: SubstepDescriptor[] = [
    {
      id: "application.setup",
      label: "Bio & intent",
      isComplete: setupComplete,
      isRequired: true,
    },
    ...generalQs.map((q, i) => {
      const answerKey =
        q.id === "learning_from_failure" ? "learningFromFailure"
        : q.id === "decision_under_uncertainty" ? "decisionUnderUncertainty"
        : q.id === "motivation_and_conflict" ? "motivationAndConflict"
        : "guildImprovement";
      const answer = flow.generalAnswers[answerKey as keyof typeof flow.generalAnswers];
      return {
        id: `application.general.${q.id}`,
        label: `General Q${i + 1}`,
        isComplete: (answer?.trim().length ?? 0) >= 50,
        isRequired: true,
      };
    }),
    ...levelTopics.map((topic, i) => ({
      id: `application.level.${topic.id}`,
      label: `Level Q${i + 1}`,
      isComplete: (flow.levelAnswers[topic.id]?.trim().length ?? 0) >= 50,
      isRequired: true,
    })),
  ];

  // ── Step 3: Review & submit ───────────────────────────────────────
  const review: SubstepDescriptor[] = [
    {
      id: "review.submit",
      label: "Verify & submit",
      isComplete: flow.walletSigned,
      isRequired: true,
    },
  ];

  return [personalInfo, professional, application, review];
}, [
  flow.formData,
  flow.resumeFile,
  flow.selectedGuildId,
  flow.applicationQuestionsProps.generalTemplate,
  flow.generalAnswers,
  flow.levelTemplate,
  flow.levelAnswers,
  flow.noAiDeclaration,
  flow.walletSigned,
]);
```

- [ ] **Step 3: Wire substep hook + derived state**

```tsx
const { substepIndex, setSubstepIndex, queuePendingSubstep } = useSubstepIndex({
  topStepIndex: stepIndex,
});

const currentSubsteps = substepsPerStep[stepIndex] ?? [];
const safeSubstepIndex = Math.min(substepIndex, Math.max(currentSubsteps.length - 1, 0));
const isLastSubstepInStep = safeSubstepIndex >= currentSubsteps.length - 1;
const isFinalSubstep = flow.isLastStep && isLastSubstepInStep;

const totalSubsteps = substepsPerStep.reduce((a, s) => a + s.length, 0);
const completedCount = substepsPerStep.flat().filter((s) => s.isComplete).length;
const progressPct = totalSubsteps === 0 ? 0 : Math.round((completedCount / totalSubsteps) * 100);

const incompleteTopSteps: number[] = substepsPerStep
  .map((substeps, idx) => ({
    stepNum: idx + 1,
    incomplete: substeps.some((s) => s.isRequired && !s.isComplete),
  }))
  .filter((s) => s.incomplete && s.stepNum !== stepIndex + 1)
  .map((s) => s.stepNum);
```

- [ ] **Step 4: Define navigation handlers**

```tsx
const handleContinue = () => {
  if (!isLastSubstepInStep) {
    setSubstepIndex(safeSubstepIndex + 1);
    return;
  }
  flow.handleContinue();
};

const handleBack = () => {
  if (safeSubstepIndex > 0) {
    setSubstepIndex(safeSubstepIndex - 1);
    return;
  }
  if (stepIndex > 0) {
    const prev = substepsPerStep[stepIndex - 1] ?? [];
    queuePendingSubstep(Math.max(prev.length - 1, 0));
    flow.handleBack();
  }
};
```

- [ ] **Step 5: Replace chrome**

Replace the existing `<ApplyWizardRail ... />` and `<ApplyWizardFooter ... />` calls with the shared primitives, mirroring Task 10's pattern. Drop the inline `ApplyWizardRail` and `ApplyWizardFooter` function definitions at the bottom of the file — they are no longer used.

Inside the `<aside>` (replace the entire `ApplyWizardRail` invocation):

```tsx
<aside className="bg-background border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 lg:self-start">
  <div className="flex items-center gap-2.5 px-6 pb-6 border-b border-border mb-6">
    <div
      className="w-7 h-7 rounded-lg grid place-items-center text-white font-black text-sm font-display"
      style={{ background: "linear-gradient(135deg, #ff7a1a, #ff4d00)" }}
    >
      V
    </div>
    <div className="font-bold text-sm text-foreground tracking-tight">
      Expert application
    </div>
  </div>

  <WizardRail
    sectionLabel="Setup"
    steps={flow.steps.map<WizardRailStep>((s, i) => ({ number: i + 1, label: s.label }))}
    currentStep={stepIndex + 1}
    incompleteSteps={incompleteTopSteps}
    maxUnlockedStep={stepIndex + 1}
    onStepClick={(num) => flow.handleStepClick(num - 1)}
  />

  <div className="mt-8 mx-6 rounded-lg border border-primary/15 bg-primary/[0.04] p-3.5">
    {/* keep existing autosave hint verbatim */}
  </div>
</aside>
```

In the `<main>` block, insert the chip strip after the existing eyebrow/headline + draft-restored + error blocks and before the step content:

```tsx
<SubstepChipStrip
  substeps={currentSubsteps}
  activeIndex={safeSubstepIndex}
  onJumpTo={setSubstepIndex}
/>
```

Pass `substepIndex={safeSubstepIndex}` to `<ApplicationQuestionsSection ... />`. The other three step components (`PersonalInfoSection`, `ProfessionalBackgroundSection`, `ReviewSubmitStep`) don't need the prop — their step has only one substep and they render normally.

Replace `<ApplyWizardFooter ... />` with:

```tsx
<WizardFooter
  stepLabel={
    isFinalSubstep
      ? `Step ${stepIndex + 1} of ${totalSteps} · ready to submit`
      : `Step ${stepIndex + 1} of ${totalSteps} · substep ${safeSubstepIndex + 1} of ${currentSubsteps.length}`
  }
  progressPct={progressPct}
  isSubmitting={flow.isSubmitting}
  isFinalSubstep={isFinalSubstep}
  canGoBack={stepIndex > 0 || safeSubstepIndex > 0}
  onBack={handleBack}
  onContinue={handleContinue}
  onCancel={() => router.push("/expert/dashboard")}
/>
```

Delete the local `ApplyWizardRail` and `ApplyWizardFooter` function definitions at the bottom of the file and the `STEP_DESCRIPTIONS` constant if it's no longer referenced after these changes.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npm run lint -- --max-warnings=0 src/components/expert/ExpertApplicationFlow.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/expert/ExpertApplicationFlow.tsx
git commit -m "feat(expert-apply): paginated substeps in expert apply flow"
```

---

## Wave 5 — Project-wide verification

### Task 12: Lint, typecheck, build, smoke

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors. New warnings are OK only if they pre-existed; otherwise fix.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual smoke — candidate apply**

```bash
npm run dev
```

In the browser at `http://localhost:3030`:
1. Sign in as a candidate (or use the headless wallet shim).
2. Navigate to a guild with an open job: `/guilds/<guildId>/apply?jobId=<jobId>`.
3. Verify the rail shows compact 24px circles, the chip strip appears on every step with > 1 substep, Next walks through each substep, Back walks backward (including across step boundaries), the chip strip lets you jump freely within a step, and the final substep's Continue button reads "Submit application".
4. Refresh mid-flow — draft restores and substep state lands on substep 0 of the restored step.

- [ ] **Step 5: Manual smoke — expert apply**

In the same dev server, go to `/expert/apply?guild=<some-guild-name>`:
1. Step 1 (Personal info), Step 2 (Professional background), Step 4 (Review & submit) each have a single substep — no chip strip shown.
2. Step 3 (Application questions) shows a chip strip with `1 + generalCount + levelCount` chips.
3. Submit completes and lands on the success screen.

- [ ] **Step 6: Manual smoke — review modal regression check**

Go to `/expert/dashboard`, open a pending application's review modal. The rail (now backed by `WizardRail`) should look pixel-identical to before, including the commit-reveal sub-section.

- [ ] **Step 7: Commit any cleanup if needed and confirm clean tree**

```bash
git status
```

Expected: clean.

---

## Self-review notes (after writing the plan)

- **Spec coverage:** Every section of the spec maps to a task: shared primitives → T1–T4; `VerticalStepRail` re-point → T5; step content refactors → T6–T9; flow integrations → T10–T11; verification → T12.
- **Placeholder scan:** No "TBD"/"TODO" entries. Every code-bearing step shows actual code.
- **Type consistency:** `SubstepDescriptor` shape and `WizardRailStep` shape are defined in T1/T2 and used identically in T10/T11. `substepIndex` prop is consistently typed as `number | undefined` across all step content refactors.
- **Type narrowing in T9:** `GuildApplicationQuestion` and `GuildDomainTopic` are already imported in `ApplicationQuestionsSection.tsx` (line 8–14). No new imports needed.
- **Out-of-scope cleanup:** The plan leaves `flow.handleStepClick` semantics untouched in both data hooks. Both data hooks already enforce `maxUnlockedStep`-like behavior (you can't jump forward past unsubmitted steps); the new chrome respects that.
