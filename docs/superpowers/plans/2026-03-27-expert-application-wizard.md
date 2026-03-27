# Expert Application Multi-Step Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic expert application form into a multi-step wizard with per-step validation, autosave (including current step), and sticky back/continue navigation — following the existing `GuildApplicationFlow` pattern.

**Architecture:** A thin orchestrator component (`ExpertApplicationFlow`) renders a step indicator, the current step's content component, and sticky bottom navigation. All state, validation, persistence, and step transitions live in a `useExpertApplicationFlow` hook. The 4 existing sub-components (`PersonalInfoSection`, `ProfessionalBackgroundSection`, `ApplicationQuestionsSection`, `WalletVerificationStep`) are reused as step content with minimal changes. A new `ReviewSubmitStep` shows a read-only summary before submission.

**Tech Stack:** React 19, Next.js 15 App Router, existing `useFormPersistence` hook, existing `StepProgress` UI component

---

## File Structure

```
src/
├── app/expert/apply/page.tsx                          # MODIFY — swap ExpertApplicationForm → ExpertApplicationFlow
├── components/
│   ├── ExpertApplicationForm.tsx                      # DELETE after migration
│   └── expert/
│       ├── ExpertApplicationFlow.tsx                  # CREATE — thin orchestrator (renders steps, nav, indicator)
│       ├── ReviewSubmitStep.tsx                        # CREATE — read-only summary + wallet verification + submit
│       ├── PersonalInfoSection.tsx                     # KEEP AS-IS (step 1 content)
│       ├── ProfessionalBackgroundSection.tsx           # KEEP AS-IS (step 2 content)
│       ├── ApplicationQuestionsSection.tsx             # KEEP AS-IS (step 3 content)
│       └── WalletVerificationStep.tsx                 # KEEP AS-IS (used inside ReviewSubmitStep)
└── lib/hooks/
    └── useExpertApplicationFlow.ts                    # CREATE — all state, validation, persistence, step logic
```

---

### Task 1: Create `useExpertApplicationFlow` hook

**Files:**
- Create: `src/lib/hooks/useExpertApplicationFlow.ts`

This is the core of the refactor. Extract all state and logic from `ExpertApplicationForm.tsx` (lines 57–672) into a hook that also manages step transitions and per-step validation.

- [ ] **Step 1: Create the hook file with all state**

Create `src/lib/hooks/useExpertApplicationFlow.ts`. Move all state declarations, effects, handlers, and derived values from `ExpertApplicationForm.tsx` into this hook. Key additions:

```typescript
// New state for step management
const [currentStep, setCurrentStep] = useState(0);

const STEPS = [
  { label: "Personal Info" },
  { label: "Professional Background" },
  { label: "Application Questions" },
  { label: "Review & Submit" },
];

const isLastStep = currentStep === STEPS.length - 1;
```

The hook returns everything the orchestrator and step components need:
- All form state (`formData`, `generalAnswers`, `levelAnswers`, `noAiDeclaration`, `resumeFile`, etc.)
- All handlers (`handleChange`, `handleGuildChange`, `handleVerifyWallet`, `handleSubmit`, etc.)
- Step management (`currentStep`, `steps`, `handleContinue`, `handleBack`, `handleStepClick`, `isLastStep`)
- Validation (`fieldErrors`, `isFormComplete`)
- UI state (`isLoading`, `error`, `success`, `loadingTemplates`, `draftRestored`, etc.)
- Template data (`generalTemplate`, `levelTemplate`, `guildOptions`)

- [ ] **Step 2: Add per-step validation**

Add a `validateStep(step: number)` function that returns `true` if the step's required fields are valid:

```typescript
const validateStep = useCallback((step: number): boolean => {
  switch (step) {
    case 0: // Personal Info
      return (
        formData.fullName.trim().length >= 2 &&
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email) &&
        !!resumeFile
      );
    case 1: // Professional Background
      return (
        !!selectedGuildId &&
        !!formData.expertiseLevel &&
        formData.currentTitle.trim().length >= 2 &&
        formData.currentCompany.trim().length >= 2 &&
        formData.expertiseAreas.length > 0
      );
    case 2: // Application Questions
      return (
        formData.bio.length >= 50 &&
        formData.motivation.length >= 50 &&
        noAiDeclaration &&
        // General answers all >= 50 chars (if template loaded)
        (!generalTemplate || (
          generalAnswers.learningFromFailure.trim().length >= 50 &&
          generalAnswers.decisionUnderUncertainty.trim().length >= 50 &&
          generalAnswers.motivationAndConflict.trim().length >= 50 &&
          generalAnswers.guildImprovement.trim().length >= 50
        )) &&
        // Level answers all >= 50 chars (if template loaded)
        (!levelTemplate?.topics || levelTemplate.topics.every(
          (t) => (levelAnswers[t.id] || "").trim().length >= 50
        ))
      );
    case 3: // Review & Submit
      return walletSigned;
    default:
      return false;
  }
}, [formData, selectedGuildId, resumeFile, noAiDeclaration, generalAnswers, levelAnswers, generalTemplate, levelTemplate, walletSigned]);
```

- [ ] **Step 3: Add step navigation handlers**

```typescript
const handleContinue = useCallback(() => {
  // Mark all fields in current step as touched
  markStepTouched(currentStep);

  if (!validateStep(currentStep)) {
    setError("Please complete all required fields before continuing.");
    return;
  }

  setError(null);

  if (isLastStep) {
    handleSubmit();
  } else {
    setCurrentStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, [currentStep, isLastStep, validateStep, handleSubmit]);

const handleBack = useCallback(() => {
  setError(null);
  setCurrentStep((prev) => Math.max(0, prev - 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}, []);

const handleStepClick = useCallback((step: number) => {
  // Can only click completed (earlier) steps
  if (step < currentStep) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, [currentStep]);
```

`markStepTouched(step)` sets all field `touched` flags for that step's fields, similar to the existing `markAllTouched` but scoped.

- [ ] **Step 4: Add currentStep to draft persistence**

Update the `useFormPersistence` save/restore to include `currentStep`:

```typescript
// In the persistence onRestore callback:
if (draft.currentStep != null) setCurrentStep(draft.currentStep);

// In the save effect, include currentStep:
saveDraft({
  formData,
  generalAnswers,
  levelAnswers,
  selectedGuildId,
  noAiDeclaration,
  currentStep,
});
```

Update the `PersistedDraft` interface to include `currentStep: number`.

- [ ] **Step 5: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/useExpertApplicationFlow.ts
git commit -m "feat: create useExpertApplicationFlow hook with step management and per-step validation"
```

---

### Task 2: Create `ExpertApplicationFlow` orchestrator

**Files:**
- Create: `src/components/expert/ExpertApplicationFlow.tsx`

Follow the `GuildApplicationFlow.tsx` pattern exactly. This is a thin component (~100 lines) that renders: loading state, error state, success state, or the step wizard (step indicator + current step content + sticky nav).

- [ ] **Step 1: Create the orchestrator**

Create `src/components/expert/ExpertApplicationFlow.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { StepProgress } from "@/components/ui/step-progress";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./ProfessionalBackgroundSection";
import { ApplicationQuestionsSection } from "./ApplicationQuestionsSection";
import { ReviewSubmitStep } from "./ReviewSubmitStep";
import { useExpertApplicationFlow } from "@/lib/hooks/useExpertApplicationFlow";
import { CheckCircle, Info } from "lucide-react";

export function ExpertApplicationFlow() {
  const router = useRouter();
  const flow = useExpertApplicationFlow();

  // Wallet not connected
  if (!flow.isConnected && !flow.wasEverConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert variant="warning">
          Please connect your wallet to apply as an expert.
        </Alert>
      </div>
    );
  }

  // Success
  if (flow.success) {
    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Thanks for Applying!</h2>
          <p className="text-muted-foreground">
            Your application has been submitted. Guild members will review your
            credentials and you&apos;ll be notified once a decision is made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Apply as an Expert</h1>
          <p className="text-muted-foreground">
            Join our expert guild and start earning by reviewing candidates and endorsing top talent.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepProgress
            steps={flow.steps}
            currentStep={flow.currentStep}
            onStepClick={flow.handleStepClick}
          />
        </div>

        {/* Draft restored banner */}
        {flow.draftRestored && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              We restored your previous draft. You can pick up where you left off.
            </span>
            <button type="button" onClick={flow.dismissRestored} className="shrink-0 text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
              Dismiss
            </button>
          </div>
        )}

        {/* Error */}
        {flow.error && (
          <div className="mb-6">
            <Alert variant="error">{flow.error}</Alert>
          </div>
        )}

        {/* Step content */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          {flow.currentStep === 0 && (
            <PersonalInfoSection {...flow.personalInfoProps} />
          )}
          {flow.currentStep === 1 && (
            <ProfessionalBackgroundSection {...flow.professionalBackgroundProps} />
          )}
          {flow.currentStep === 2 && (
            <ApplicationQuestionsSection {...flow.applicationQuestionsProps} />
          )}
          {flow.currentStep === 3 && (
            <ReviewSubmitStep
              formData={flow.formData}
              selectedGuildName={flow.selectedGuildName}
              generalAnswers={flow.generalAnswers}
              levelAnswers={flow.levelAnswers}
              levelTemplate={flow.levelTemplate}
              noAiDeclaration={flow.noAiDeclaration}
              resumeFile={flow.resumeFile}
              walletSigned={flow.walletSigned}
              isSigning={flow.isSigning}
              signingError={flow.verificationError}
              onVerify={flow.handleVerifyWallet}
            />
          )}
        </div>

        {/* Sticky bottom navigation */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border/60 -mx-4 px-4 py-4 mt-8">
          <div className="flex gap-4">
            {flow.currentStep > 0 ? (
              <Button type="button" variant="secondary" onClick={flow.handleBack} className="flex-1" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => router.push("/expert/dashboard")} className="flex-1">
                Cancel
              </Button>
            )}

            <Button
              type="button"
              onClick={flow.handleContinue}
              disabled={flow.isSubmitting}
              className="flex-1"
              icon={flow.isSubmitting ? undefined : flow.isLastStep ? <Send className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            >
              {flow.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : flow.isLastStep ? "Submit Application" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/ExpertApplicationFlow.tsx
git commit -m "feat: create ExpertApplicationFlow orchestrator component"
```

---

### Task 3: Create `ReviewSubmitStep` component

**Files:**
- Create: `src/components/expert/ReviewSubmitStep.tsx`

A read-only summary of all entered data with wallet verification and the submit button. Shows each section collapsed with key info visible so the user can review before submitting.

- [ ] **Step 1: Create the component**

Create `src/components/expert/ReviewSubmitStep.tsx`:

```tsx
"use client";

import { User, Briefcase, FileText, CheckCircle2 } from "lucide-react";
import { WalletVerificationStep } from "./WalletVerificationStep";
import type { GuildDomainLevel, GuildDomainTopic } from "@/types";

interface ReviewSubmitStepProps {
  formData: {
    fullName: string;
    email: string;
    linkedinUrl: string;
    portfolioUrl: string;
    guild: string;
    expertiseLevel: string;
    yearsOfExperience: string;
    currentTitle: string;
    currentCompany: string;
    bio: string;
    motivation: string;
    expertiseAreas: string[];
  };
  selectedGuildName: string;
  generalAnswers: {
    learningFromFailure: string;
    decisionUnderUncertainty: string;
    motivationAndConflict: string;
    guildImprovement: string;
  };
  levelAnswers: Record<string, string>;
  levelTemplate: GuildDomainLevel | null;
  noAiDeclaration: boolean;
  resumeFile: File | null;
  walletSigned: boolean;
  isSigning: boolean;
  signingError?: string | null;
  onVerify: () => void;
}

function SummarySection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
      </div>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

export function ReviewSubmitStep({
  formData,
  selectedGuildName,
  generalAnswers,
  levelAnswers,
  levelTemplate,
  noAiDeclaration,
  resumeFile,
  walletSigned,
  isSigning,
  signingError,
  onVerify,
}: ReviewSubmitStepProps) {
  return (
    <div>
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Review Your Application</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please review your information before submitting.
        </p>
      </div>

      <SummarySection icon={User} title="Personal Info">
        <p><span className="text-foreground font-medium">{formData.fullName}</span> &mdash; {formData.email}</p>
        {formData.linkedinUrl && <p>LinkedIn: {formData.linkedinUrl}</p>}
        {formData.portfolioUrl && <p>Portfolio: {formData.portfolioUrl}</p>}
        {resumeFile && <p>Resume: {resumeFile.name}</p>}
      </SummarySection>

      <SummarySection icon={Briefcase} title="Professional Background">
        <p>Guild: <span className="text-foreground font-medium">{selectedGuildName}</span> &mdash; {formData.expertiseLevel} level</p>
        <p>{formData.currentTitle} at {formData.currentCompany} &mdash; {formData.yearsOfExperience} years</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {formData.expertiseAreas.map((area, i) => (
            <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{area}</span>
          ))}
        </div>
      </SummarySection>

      <SummarySection icon={FileText} title="Application Questions">
        <p>Bio: {formData.bio.length} chars &mdash; Motivation: {formData.motivation.length} chars</p>
        <p>General questions: {Object.values(generalAnswers).filter(a => a.trim().length >= 50).length}/4 answered</p>
        {levelTemplate?.topics && (
          <p>Domain questions: {levelTemplate.topics.filter((t: GuildDomainTopic) => (levelAnswers[t.id] || "").trim().length >= 50).length}/{levelTemplate.topics.length} answered</p>
        )}
        {noAiDeclaration && <p className="text-green-600 dark:text-green-400">AI declaration confirmed</p>}
      </SummarySection>

      <WalletVerificationStep
        isVerified={walletSigned}
        isSigning={isSigning}
        signingError={signingError}
        onVerify={onVerify}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/expert/ReviewSubmitStep.tsx
git commit -m "feat: create ReviewSubmitStep component for expert application wizard"
```

---

### Task 4: Wire up the page route and extract hook logic

**Files:**
- Modify: `src/app/expert/apply/page.tsx`
- Modify: `src/lib/hooks/useExpertApplicationFlow.ts` (finalize with all logic from ExpertApplicationForm)

- [ ] **Step 1: Extract all logic from ExpertApplicationForm into the hook**

Move ALL state, effects, handlers, computed values, and template loading from `src/components/ExpertApplicationForm.tsx` into `src/lib/hooks/useExpertApplicationFlow.ts`. The hook should return grouped props objects for each step component:

```typescript
// Return grouped props for each step
const personalInfoProps: PersonalInfoSectionProps = {
  fullName: formData.fullName,
  email: formData.email,
  linkedinUrl: formData.linkedinUrl,
  portfolioUrl: formData.portfolioUrl,
  onChange: handleChange,
  resumeFile,
  resumeInputRef,
  onResumeChange: setResumeFile,
  onError: (msg: string) => setError(msg),
  clearError: () => setError(null),
  fieldErrors,
  onBlur: handleBlur,
};

// Similar for professionalBackgroundProps, applicationQuestionsProps
```

This keeps the orchestrator thin — it just passes `{...flow.personalInfoProps}`.

- [ ] **Step 2: Update the page route**

Modify `src/app/expert/apply/page.tsx`:

```tsx
import { ExpertApplicationFlow } from "@/components/expert/ExpertApplicationFlow";

export default function ExpertApplyPage() {
  return (
    <main>
      <ExpertApplicationFlow />
    </main>
  );
}
```

- [ ] **Step 3: Verify the app builds and renders**

Run: `npm run build`
Expected: builds without errors

- [ ] **Step 4: Manual test — navigate to /expert/apply**

Test each step:
1. Fill personal info → click Continue → should advance to step 2
2. Fill professional background → click Continue → should advance to step 3
3. Fill application questions → click Continue → should advance to step 4
4. Verify wallet → Submit
5. Refresh mid-flow → should restore to saved step

- [ ] **Step 5: Commit**

```bash
git add src/app/expert/apply/page.tsx src/lib/hooks/useExpertApplicationFlow.ts
git commit -m "feat: wire up ExpertApplicationFlow and extract all logic to hook"
```

---

### Task 5: Delete old ExpertApplicationForm

**Files:**
- Delete: `src/components/ExpertApplicationForm.tsx`
- Delete: `src/components/expert/ExpertApplicationProgress.tsx` (step progress wrapper, already unused)

- [ ] **Step 1: Verify no other imports reference ExpertApplicationForm**

```bash
grep -r "ExpertApplicationForm" src/ --include="*.tsx" --include="*.ts"
```

Expected: only the old page.tsx import (already updated) and the file itself.

- [ ] **Step 2: Delete the files**

```bash
rm src/components/ExpertApplicationForm.tsx
rm src/components/expert/ExpertApplicationProgress.tsx
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old monolithic ExpertApplicationForm"
```

---

### Task 6: Final polish and edge cases

- [ ] **Step 1: Handle guild pre-selection from URL**

When navigating from a guild page with `?guild=xyz`, the flow should auto-select the guild and potentially skip to step 2 if personal info is already filled (returning expert). This logic exists in the current form — ensure it's preserved in the hook.

- [ ] **Step 2: Handle returning experts applying to new guild**

When `?apply=new` is in the URL, the form pre-fills from existing profile data. This should work with the step wizard — pre-fill and start at step 2 (professional background) since personal info is already known.

- [ ] **Step 3: Test autosave end-to-end**

1. Fill step 1, advance to step 2, fill partially
2. Close the tab
3. Reopen /expert/apply
4. Verify: draft banner shows, step 2 is active, all data restored

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: handle guild pre-selection and returning expert flow in wizard"
```
