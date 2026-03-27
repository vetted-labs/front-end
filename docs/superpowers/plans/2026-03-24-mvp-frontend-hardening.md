# MVP Frontend Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all expert-facing flows production-ready for beta launch — cross-cutting UI fixes, then flow-by-flow refactor + UX + error handling.

**Architecture:** Fix shared infrastructure first (modals, buttons, forms, polling, event dispatch) so every flow benefits. Then work through expert flows in priority order: onboarding, guild membership, vetting, reputation, endorsements, notifications. Each flow gets refactored (split large components) AND polished (UX guidance, error handling, accessibility) before moving to the next.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS 4, Wagmi/Viem, RainbowKit, Sonner toasts, Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-03-24-mvp-frontend-audit-design.md`

**Note on testing:** This project is primarily UI refactoring and UX improvements. TDD is used for shared hooks and utility components. For component splits and UX copy, visual verification via dev server is the primary validation. Run `npm run build` after each task to catch type errors.

---

## Phase 0: Horizontal Pass — Cross-Cutting Fixes

### Task 1: Modal Escape Key + Focus Trap + Animations

**Files:**
- Modify: `src/components/ui/modal.tsx` (88 lines)
- Modify: `src/components/ui/dialog.tsx` (141 lines)

- [ ] **Step 1: Add Escape key handler to Modal**

In `src/components/ui/modal.tsx`, add a `useEffect` for the Escape key listener inside the component, after the existing mount effect (~line 22):

```typescript
// Add after the body overflow useEffect (line 31)
// eslint-disable-next-line no-restricted-syntax -- subscribing to DOM keydown event with runtime dependency on isOpen
useEffect(() => {
  if (!isOpen) return;
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", handleEscape);
  return () => document.removeEventListener("keydown", handleEscape);
}, [isOpen, onClose]);
```

- [ ] **Step 2: Add focus trap to Modal**

Add focus trap logic after the Escape handler. Query focusable elements inside the modal, trap Tab at boundaries:

```typescript
// Add ref to modal content div
const contentRef = useRef<HTMLDivElement>(null);

// eslint-disable-next-line no-restricted-syntax -- focus trap requires DOM event subscription with isOpen dependency
useEffect(() => {
  if (!isOpen || !contentRef.current) return;
  const modal = contentRef.current;
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  // Focus first focusable element on open
  const firstFocusable = modal.querySelector<HTMLElement>(focusableSelector);
  firstFocusable?.focus();

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable = modal.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", handleTab);
  return () => document.removeEventListener("keydown", handleTab);
}, [isOpen]);
```

Add `ref={contentRef}` to the modal content div, and `role="dialog"` + `aria-modal="true"`:

```tsx
<div
  ref={contentRef}
  role="dialog"
  aria-modal="true"
  aria-label={title}
  className={cn("relative bg-background ...", sizeClasses[size])}
>
```

- [ ] **Step 3: Add focus restoration to Modal**

Store active element before opening, restore on close:

```typescript
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (isOpen) {
    previousFocusRef.current = document.activeElement as HTMLElement;
  } else if (previousFocusRef.current) {
    previousFocusRef.current.focus();
    previousFocusRef.current = null;
  }
}, [isOpen]);
```

- [ ] **Step 4: Add enter/exit animations to Modal**

The current Modal returns `null` when `!isOpen`, so CSS transitions won't work (no element to transition from). Change to always-mounted with visibility toggle:

1. Remove the early `if (!isOpen && !mounted) return null;` check
2. Add a `visible` state that lags behind `isOpen` for exit animation:

```typescript
const [visible, setVisible] = useState(false);

// eslint-disable-next-line no-restricted-syntax -- animation timing requires runtime isOpen tracking
useEffect(() => {
  if (isOpen) {
    setVisible(true);
  } else {
    // Delay unmount for exit animation
    const timer = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(timer);
  }
}, [isOpen]);

if (!visible && !isOpen) return null;
```

Then add transition classes:

```tsx
// Backdrop
<div
  className={cn(
    "fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity duration-200",
    isOpen ? "opacity-100" : "opacity-0"
  )}
  onClick={onClose}
/>

// Content
<div
  ref={contentRef}
  role="dialog"
  aria-modal="true"
  aria-label={title}
  className={cn(
    "relative bg-background rounded-xl shadow-xl transition-all duration-200",
    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95",
    sizeClasses[size]
  )}
>
```

- [ ] **Step 5: Apply same fixes to Dialog component**

In `src/components/ui/dialog.tsx`, apply the same patterns to `DialogContent`:
- Escape key handler (same pattern)
- Focus trap on the dialog content element
- Focus restoration
- `role="dialog"` and `aria-modal="true"` on the content wrapper
- Transition animations on backdrop and content

- [ ] **Step 6: Verify both components work**

Run: `npm run build`
Expected: Clean build, no type errors.

Then manually test in dev server (`npm run dev`):
- Open any modal → press Escape → should close
- Open modal → Tab through elements → focus should not leave modal
- Open modal → close → focus returns to trigger button
- Modal appears with fade-in animation

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/modal.tsx src/components/ui/dialog.tsx
git commit -m "feat: add escape key, focus trap, focus restoration, and animations to Modal and Dialog"
```

---

### Task 2: Button Loading State

**Files:**
- Modify: `src/components/ui/button.tsx` (55 lines)

- [ ] **Step 1: Implement isLoading visual feedback**

In `src/components/ui/button.tsx`, modify the Button render (currently lines 38-50). The `isLoading` prop is destructured but never used. Add spinner and disabled state:

```typescript
import { Loader2 } from "lucide-react";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          icon && <span className="mr-2">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build. Existing `isLoading` usage (8 components) now shows spinners.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: render spinner and disable button when isLoading is true"
```

---

### Task 3: Confirmation Modal Component

**Files:**
- Create: `src/components/ui/confirmation-modal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "default"}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Replace window.confirm in HiringDashboard**

In `src/components/HiringDashboard.tsx`, find the `window.confirm()` call (~line 74). Replace with:

```typescript
// Add state
const [confirmAction, setConfirmAction] = useState<{ action: () => void; message: string } | null>(null);

// Replace window.confirm(...) with:
setConfirmAction({
  action: () => { /* the original action */ },
  message: "Are you sure you want to proceed?",
});

// Add modal to JSX
<ConfirmationModal
  isOpen={!!confirmAction}
  onClose={() => setConfirmAction(null)}
  onConfirm={() => {
    confirmAction?.action();
    setConfirmAction(null);
  }}
  title="Confirm Action"
  message={confirmAction?.message ?? ""}
/>
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/confirmation-modal.tsx src/components/HiringDashboard.tsx
git commit -m "feat: add ConfirmationModal component, replace window.confirm in HiringDashboard"
```

---

### Task 3b: Form Validation Pattern — useFieldValidation Hook

**Files:**
- Create: `src/lib/hooks/useFieldValidation.ts`
- Modify: `src/components/ui/form-field.tsx` (39 lines)

- [ ] **Step 1: Create useFieldValidation hook**

```typescript
import { useState, useCallback, useRef } from "react";

type ValidationRule = {
  test: (value: string) => boolean;
  message: string;
};

interface UseFieldValidationOptions {
  rules: ValidationRule[];
  validateOnBlur?: boolean;
}

export function useFieldValidation({ rules, validateOnBlur = true }: UseFieldValidationOptions) {
  const [error, setError] = useState<string | undefined>();
  const touchedRef = useRef(false);

  const validate = useCallback(
    (value: string): boolean => {
      for (const rule of rules) {
        if (!rule.test(value)) {
          setError(rule.message);
          return false;
        }
      }
      setError(undefined);
      return true;
    },
    [rules]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      touchedRef.current = true;
      if (validateOnBlur) {
        validate(e.target.value);
      }
    },
    [validate, validateOnBlur]
  );

  const clearError = useCallback(() => setError(undefined), []);

  return { error, validate, onBlur, clearError, touched: touchedRef.current };
}
```

- [ ] **Step 2: Add auto-focus-first-error utility**

```typescript
// Add to the same file or to lib/utils.ts
export function focusFirstError(containerRef: React.RefObject<HTMLElement | null>) {
  const firstError = containerRef.current?.querySelector<HTMLElement>(
    '[data-field-error="true"] input, [data-field-error="true"] textarea, [data-field-error="true"] select'
  );
  firstError?.focus();
}
```

- [ ] **Step 3: Update FormField to support data-field-error attribute**

In `src/components/ui/form-field.tsx`, add `data-field-error` when error is present so `focusFirstError` can find it:

```tsx
<div className={cn("space-y-2", className)} data-field-error={!!error || undefined}>
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/lib/hooks/useFieldValidation.ts src/components/ui/form-field.tsx
git commit -m "feat: add useFieldValidation hook with blur validation and auto-focus-first-error"
```

Per-form adoption of this hook happens in Phase 1/2/3 as each flow is touched.

---

### Task 4: Promote StepIndicator to Shared UI

**Files:**
- Modify: `src/components/guild/application-steps/StepIndicator.tsx` (98 lines)
- Create: `src/components/ui/step-progress.tsx`

- [ ] **Step 1: Copy and generalize StepIndicator**

Create `src/components/ui/step-progress.tsx` based on the existing `guild/application-steps/StepIndicator.tsx`. The existing component is already generic (takes `steps: { label: string }[]`, `currentStep: number`, `onStepClick`). Copy it with these changes:
- Rename to `StepProgress`
- Add optional `description` field to Step interface
- Export the `Step` interface

```typescript
export interface Step {
  label: string;
  description?: string;
}

export interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}
```

- [ ] **Step 2: Update guild StepIndicator to re-export**

Update `src/components/guild/application-steps/StepIndicator.tsx` to re-export from the shared component to avoid breaking existing imports:

```typescript
export { StepProgress as default } from "@/components/ui/step-progress";
export type { Step, StepProgressProps } from "@/components/ui/step-progress";
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/step-progress.tsx src/components/guild/application-steps/StepIndicator.tsx
git commit -m "feat: promote StepIndicator to shared ui/step-progress component"
```

---

### Task 5: Transaction Status Component

**Files:**
- Create: `src/components/ui/transaction-status.tsx`

- [ ] **Step 1: Create the component**

This component displays wallet transaction lifecycle feedback. Used in 4+ flows (commit-reveal, endorsements, withdrawals, guild staking).

```typescript
"use client";

import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

type TransactionPhase =
  | "idle"
  | "awaiting-signature"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

interface TransactionStatusProps {
  phase: TransactionPhase;
  txHash?: string;
  errorMessage?: string;
  chainExplorerUrl?: string;
  onRetry?: () => void;
}

const PHASE_CONFIG: Record<TransactionPhase, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: null, label: "", color: "" },
  "awaiting-signature": {
    icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    label: "Waiting for wallet signature...",
    color: "text-primary",
  },
  submitting: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    label: "Submitting transaction...",
    color: "text-primary",
  },
  confirming: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-amber-500" />,
    label: "Confirming on chain...",
    color: "text-amber-500",
  },
  confirmed: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    label: "Transaction confirmed!",
    color: "text-green-500",
  },
  failed: {
    icon: <XCircle className="h-5 w-5 text-destructive" />,
    label: "Transaction failed",
    color: "text-destructive",
  },
};

export function TransactionStatus({
  phase,
  txHash,
  errorMessage,
  chainExplorerUrl,
  onRetry,
}: TransactionStatusProps) {
  if (phase === "idle") return null;

  const config = PHASE_CONFIG[phase];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
      {config.icon}
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
        {errorMessage && phase === "failed" && (
          <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
        )}
        {txHash && chainExplorerUrl && (
          <a
            href={`${chainExplorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {phase === "failed" && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export type { TransactionPhase, TransactionStatusProps };
```

- [ ] **Step 2: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/transaction-status.tsx
git commit -m "feat: add TransactionStatus component for wallet transaction lifecycle feedback"
```

---

### Task 6: Breadcrumb Component + PageShell Integration

**Files:**
- Create: `src/components/ui/breadcrumb.tsx`
- Modify: `src/components/ui/page-shell.tsx` (53 lines)

- [ ] **Step 1: Create breadcrumb component**

```typescript
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={index === items.length - 1 ? "text-foreground font-medium" : ""}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Integrate into PageShell**

In `src/components/ui/page-shell.tsx`, add optional `breadcrumbs` prop:

```typescript
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";

interface PageShellProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];  // NEW
}
```

Render breadcrumbs above the header section (before the `mb-8` div):

```tsx
return (
  <div className={cn("w-full", className)}>
    {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
    <div className="mb-8 flex flex-col ...">
      {/* existing header content */}
    </div>
    {children}
  </div>
);
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/breadcrumb.tsx src/components/ui/page-shell.tsx
git commit -m "feat: add Breadcrumb component and integrate into PageShell"
```

---

### Task 7: Resilient Notification Polling

**Files:**
- Modify: `src/lib/hooks/useNotificationCountPolling.ts` (66 lines)

- [ ] **Step 1: Replace failedRef stop-on-error with exponential backoff**

Currently at line 19, `failedRef.current = true` permanently stops polling on first error. Replace with backoff:

```typescript
// Replace failedRef with backoff state
const backoffRef = useRef(0);
const BASE_INTERVAL = 30000; // 30s normal polling
const BACKOFF_INTERVALS = [5000, 10000, 30000, 60000]; // escalating retry delays

const fetchCount = useCallback(async () => {
  if (!enabled) return;
  try {
    const result = await fetchFn();
    if (mountedRef.current) {
      setCount(result?.count || 0);
      backoffRef.current = 0; // reset on success
    }
  } catch {
    // Increment backoff instead of permanently stopping
    backoffRef.current = Math.min(backoffRef.current + 1, BACKOFF_INTERVALS.length - 1);
  }
}, [enabled, fetchFn]);
```

Update the interval setup to use dynamic interval:

```typescript
// Instead of fixed setInterval(fetchCount, 30000), use dynamic interval
const scheduleNext = useCallback(() => {
  const delay = backoffRef.current > 0
    ? BACKOFF_INTERVALS[backoffRef.current - 1]
    : BASE_INTERVAL;
  return setTimeout(() => {
    fetchCount().then(() => {
      if (mountedRef.current) {
        timerRef.current = scheduleNext();
      }
    });
  }, delay);
}, [fetchCount]);
```

- [ ] **Step 2: Add custom event listener for immediate refresh**

Ensure the existing event listener pattern also resets backoff:

```typescript
const handleEvent = useCallback(() => {
  backoffRef.current = 0; // reset backoff on manual trigger
  fetchCount();
}, [fetchCount]);
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/lib/hooks/useNotificationCountPolling.ts
git commit -m "feat: replace stop-on-error polling with exponential backoff and manual reset"
```

---

### Task 8: Await Hire Outcome + Event Dispatch

**Files:**
- Modify: `src/lib/hooks/useApplicationStatusUpdate.ts` (71 lines)

- [ ] **Step 1: Change hire outcome from fire-and-forget to awaited**

In `src/lib/hooks/useApplicationStatusUpdate.ts`, lines 47-56 currently fire-and-forget the `recordHireOutcome` call. Change to await it with proper error handling:

```typescript
// Replace the fire-and-forget block (lines 47-56) with:
if (newStatus === "accepted") {
  try {
    await endorsementAccountabilityApi.recordHireOutcome({
      applicationId,
      candidateId,
      jobId,
      outcome: "hired",
    });
    // Dispatch events for immediate UI refresh across the app
    window.dispatchEvent(new Event("vetted:notification-refresh"));
    window.dispatchEvent(new Event("vetted:reputation-refresh"));
    window.dispatchEvent(new Event("vetted:endorsement-refresh"));
  } catch {
    toast.warning(
      "Candidate accepted but hire outcome recording failed. Expert rewards may need manual processing."
    );
  }
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run build`

```bash
git add src/lib/hooks/useApplicationStatusUpdate.ts
git commit -m "feat: await hire outcome recording, dispatch refresh events on success"
```

---

### Task 8b: Event Refresh Listeners

**Files:**
- Modify: `src/components/expert/ReputationPage.tsx`
- Modify: `src/components/expert/EarningsPage.tsx`
- Modify: `src/components/endorsements/MyActiveEndorsements.tsx`

Task 8 dispatches `vetted:notification-refresh`, `vetted:reputation-refresh`, `vetted:endorsement-refresh`, and `vetted:guild-membership-refresh` events. This task adds the listeners.

- [ ] **Step 1: Add reputation-refresh listener to ReputationPage**

In `src/components/expert/ReputationPage.tsx`, add an effect that listens for `vetted:reputation-refresh` and triggers a data refetch:

```typescript
// eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component refresh
useEffect(() => {
  const handler = () => refetch();
  window.addEventListener("vetted:reputation-refresh", handler);
  return () => window.removeEventListener("vetted:reputation-refresh", handler);
}, [refetch]);
```

Apply the same pattern to `EarningsPage.tsx`.

- [ ] **Step 2: Add endorsement-refresh listener to MyActiveEndorsements**

Same pattern with `vetted:endorsement-refresh` event.

- [ ] **Step 3: Add guild-membership-refresh listener to guild components**

Add listener to the expert's "My Guilds" view that refetches guild membership data on `vetted:guild-membership-refresh`.

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/expert/ReputationPage.tsx src/components/expert/EarningsPage.tsx src/components/endorsements/MyActiveEndorsements.tsx
git commit -m "feat: add event listeners for cross-component state refresh after key outcomes"
```

---

### Task 8c: Verify Sidebar Active State

**Files:**
- Review: `src/components/layout/SidebarNavItem.tsx` (85 lines)

- [ ] **Step 1: Verify existing implementation**

`SidebarNavItem.tsx` already implements active route highlighting via `usePathname()` (line 21) with exact and prefix matching. Verify it works correctly by checking in dev server:
- Navigate to `/expert/applications` → sidebar item should be highlighted
- Navigate to `/expert/guilds/[id]` → "Guilds" item should be highlighted

If working: no changes needed, mark task complete.
If broken: fix the matching logic in `SidebarNavItem.tsx`.

- [ ] **Step 2: Commit if changes were needed**

---

### Task 9: Alert Design Token Fix

**Files:**
- Modify: `src/components/ui/alert.tsx` (48 lines)

- [ ] **Step 1: Replace hardcoded colors with semantic tokens**

In `src/components/ui/alert.tsx`, lines 14, 18, 22 use hardcoded colors. Replace:

The file already uses `bg-success/10` and `bg-warning/10` semantic tokens for backgrounds. Only fix the text colors — keep existing bg tokens:

```typescript
// Line 14: error variant — fix text color only
// OLD: "bg-destructive/10 border-destructive/20 text-red-800 dark:text-red-300"
// NEW: "bg-destructive/10 border-destructive/20 text-destructive"
error: {
  container: "bg-destructive/10 border-destructive/20 text-destructive",
  icon: <XCircle className="w-5 h-5 text-destructive" />
},

// Line 18: success variant — keep existing bg-success token, fix text only
// OLD: "bg-success/10 border-success/20 text-green-800 dark:text-green-300"
// NEW: "bg-success/10 border-success/20 text-green-800 dark:text-green-300"
// Note: no semantic text-success token exists. Keep hardcoded text colors for now.
// Only fix error variant which has a text-destructive token available.

// Line 22: warning variant — same, keep as-is
// No text-warning semantic token exists. Keep existing colors.
```

**Summary:** Only the error variant gets fixed (has `text-destructive` token). Success and warning stay as-is until semantic text tokens are defined.

- [ ] **Step 2: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/alert.tsx
git commit -m "fix: replace hardcoded color values with semantic design tokens in Alert"
```

---

### Task 10: Accessibility Baseline for Shared Components

**Files:**
- Modify: `src/components/ui/modal.tsx` (already has role="dialog" from Task 1)
- Modify: `src/components/layout/NotificationBell.tsx`
- Modify: `src/components/layout/NotificationBellDropdown.tsx`

- [ ] **Step 1: Add aria-labels to NotificationBell**

In `src/components/layout/NotificationBell.tsx`, find the bell button and add:

```tsx
<button
  aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
  // ... existing props
>
```

- [ ] **Step 2: Add aria-labels to other icon buttons**

Search for icon-only buttons across layout components (sidebar toggle, close buttons) and add `aria-label` attributes. Key files:
- `src/components/layout/SidebarProvider.tsx` — mobile menu toggle
- `src/components/layout/SidebarUserSection.tsx` — user menu button

- [ ] **Step 3: Add role="status" to loading spinners**

In components that show loading spinners inline, wrap with:

```tsx
<div role="status" aria-label="Loading">
  <Loader2 className="h-6 w-6 animate-spin" />
  <span className="sr-only">Loading...</span>
</div>
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/layout/NotificationBell.tsx src/components/layout/NotificationBellDropdown.tsx src/components/layout/SidebarProvider.tsx src/components/layout/SidebarUserSection.tsx
git commit -m "feat: add aria-labels to icon buttons and role=status to loading indicators"
```

---

## Phase 1: Tier 1 Flows — Must Be Bulletproof

### Task 11: Split ExpertApplicationForm — Step Progress

**Files:**
- Modify: `src/components/ExpertApplicationForm.tsx` (796 lines)
- Create: `src/components/expert/ExpertApplicationProgress.tsx`

- [ ] **Step 1: Create ExpertApplicationProgress component**

Extract the step indicator that will sit at the top of the form. Uses the shared `StepProgress` component from Task 4.

```typescript
"use client";

import { StepProgress } from "@/components/ui/step-progress";

const APPLICATION_STEPS = [
  { label: "Wallet Verification" },
  { label: "Personal Info" },
  { label: "Professional Background" },
  { label: "Application Questions" },
  { label: "Review & Submit" },
];

interface ExpertApplicationProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ExpertApplicationProgress({ currentStep, onStepClick }: ExpertApplicationProgressProps) {
  return (
    <div className="mb-8">
      <StepProgress steps={APPLICATION_STEPS} currentStep={currentStep} onStepClick={onStepClick} />
      <p className="text-sm text-muted-foreground text-center mt-2">
        Step {currentStep + 1} of {APPLICATION_STEPS.length} — {APPLICATION_STEPS[currentStep]?.label}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add step tracking state to ExpertApplicationForm**

In `ExpertApplicationForm.tsx`, add state and integrate the progress component:

```typescript
const [currentStep, setCurrentStep] = useState(0);
// Step 0: Wallet → Step 1: Personal → Step 2: Professional → Step 3: Questions → Step 4: Review

// Import and add to JSX before the form sections:
<ExpertApplicationProgress currentStep={currentStep} />
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/components/expert/ExpertApplicationProgress.tsx src/components/ExpertApplicationForm.tsx
git commit -m "feat: add step progress indicator to expert application form"
```

---

### Task 12: Split ExpertApplicationForm — Per-Section Components

**Files:**
- Modify: `src/components/ExpertApplicationForm.tsx` (796 lines)
- Create: `src/components/expert/WalletVerificationStep.tsx`

The form already uses sub-components for PersonalInfoSection, ProfessionalBackgroundSection, and ApplicationQuestionsSection (imported from `src/components/expert/`). The main bloat is:
1. The wallet verification JSX (lines 685-741) — extract to WalletVerificationStep
2. The 16 useState calls and validation logic — these stay in the parent as form state
3. The handleSubmit function (lines 463-585) — stays in parent

- [ ] **Step 1: Extract WalletVerificationStep**

Extract lines 685-741 (wallet verification section) into a dedicated component:

```typescript
"use client";

import { TransactionStatus, TransactionPhase } from "@/components/ui/transaction-status";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Wallet, CheckCircle2 } from "lucide-react";

interface WalletVerificationStepProps {
  isConnected: boolean;
  address?: string;
  isVerified: boolean;
  isSigning: boolean;
  signingError?: string;
  onVerify: () => void;
}

export function WalletVerificationStep({
  isConnected,
  address,
  isVerified,
  isSigning,
  signingError,
  onVerify,
}: WalletVerificationStepProps) {
  const txPhase: TransactionPhase = isSigning
    ? "awaiting-signature"
    : isVerified
      ? "confirmed"
      : "idle";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wallet className="w-5 h-5" /> Wallet Verification
      </h3>
      {!isConnected ? (
        <Alert variant="warning">
          Please connect your wallet using the button in the top navigation to continue.
        </Alert>
      ) : isVerified ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>Wallet verified: {address}</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sign a message with your wallet to prove ownership. This does not cost gas.
          </p>
          <TransactionStatus phase={txPhase} />
          {signingError && <Alert variant="error">{signingError}</Alert>}
          <Button onClick={onVerify} isLoading={isSigning}>
            Verify Wallet
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace inline JSX with component**

In `ExpertApplicationForm.tsx`, replace the wallet verification JSX block with:

```tsx
<WalletVerificationStep
  isConnected={isConnected}
  address={address}
  isVerified={walletAlreadyVerified || verificationComplete}
  isSigning={isSigning}
  signingError={walletError}
  onVerify={handleVerifyWallet}
/>
```

- [ ] **Step 3: Move inline types to @/types/expert.ts**

Check `ExpertApplicationForm.tsx` for inline types (`FieldErrors`, `ExpertApplicationFormProps`). Move to `src/types/expert.ts`:

```typescript
// Add to src/types/expert.ts
export type FieldErrors = Record<string, string>;
```

Update import in `ExpertApplicationForm.tsx`.

- [ ] **Step 4: Document manual auth check (keep it)**

Lines 85-124 have a manual useEffect checking for existing expert profile and redirecting if already approved/pending. This is NOT replaceable by `useRequireAuth` — that hook handles auth redirects, but this check verifies expert profile existence and application status, which is domain-specific. Keep the manual check but add a comment:

```typescript
// This check is intentionally NOT using useRequireAuth — it verifies expert profile
// existence and application status (approved/pending), not just authentication.
```

- [ ] **Step 5: Verify component line count and commit**

Run: `wc -l src/components/ExpertApplicationForm.tsx` — target is under 500 lines.
Run: `npm run build`

```bash
git add src/components/expert/WalletVerificationStep.tsx src/components/ExpertApplicationForm.tsx src/types/expert.ts
git commit -m "refactor: extract WalletVerificationStep, consolidate expert types"
```

---

### Task 13: Split GuildDetailView

**Files:**
- Modify: `src/components/GuildDetailView.tsx` (797 lines)
- Existing: `src/components/guild/GuildHeader.tsx` (133 lines — reuse)
- Create: `src/components/guild/GuildStatsPanel.tsx`
- Create: `src/components/guild/GuildApplicationCTA.tsx`

- [ ] **Step 1: Identify extraction boundaries**

Read `src/components/GuildDetailView.tsx` and identify:
- Which parts of the JSX map to GuildStatsPanel (stats display section)
- Which parts map to GuildApplicationCTA (join/stake call-to-action)
- What props each extracted component needs
- Whether `GuildHeader.tsx` already handles the header section or needs extension

- [ ] **Step 2: Extract GuildStatsPanel**

Create component displaying guild statistics (member count, total staked, avg reputation, etc.):

```typescript
interface GuildStatsPanelProps {
  memberCount: number;
  totalStaked: string;
  avgReputation: number;
  activeReviews: number;
}
```

- [ ] **Step 3: Extract GuildApplicationCTA**

Create component for the guild join/application call-to-action area:

```typescript
interface GuildApplicationCTAProps {
  guildId: string;
  isMember: boolean;
  hasApplied: boolean;
  stakingRequirement: string;
  onApply: () => void;
}
```

- [ ] **Step 4: Move inline types to @/types/guild.ts**

Move `GuildDetail`, `Activity`, `TabType`, and other inline interfaces to `src/types/guild.ts`.

- [ ] **Step 5: Wire up extracted components in GuildDetailView**

Replace inline JSX with imported components. The parent retains all state and handlers, children receive props.

- [ ] **Step 6: Verify line count and commit**

Run: `wc -l src/components/GuildDetailView.tsx` — target under 500 lines.
Run: `npm run build`

```bash
git add src/components/GuildDetailView.tsx src/components/guild/GuildStatsPanel.tsx src/components/guild/GuildApplicationCTA.tsx src/types/guild.ts
git commit -m "refactor: split GuildDetailView into GuildStatsPanel, GuildApplicationCTA, consolidate guild types"
```

---

### Task 14: Split ReviewGuildApplicationModal

**Files:**
- Modify: `src/components/guild/ReviewGuildApplicationModal.tsx` (915 lines)
- Create: `src/components/guild/review/GeneralReviewStep.tsx` (if not already extracted)
- Create: `src/components/guild/review/DomainReviewStep.tsx` (if not already extracted)
- Create: `src/components/guild/review/ReviewSubmitSection.tsx`

- [ ] **Step 1: Identify extraction boundaries**

Read the full component. It has a multi-step flow:
1. Profile review step
2. General rubric scoring step
3. Domain-specific scoring step
4. Submit step (with commit-reveal logic)

Check if `ReviewProfileStep`, `GeneralReviewStep`, `DomainReviewStep` already exist as sub-components (they may already be imported). If so, the remaining bloat is in the submit/commit-reveal logic.

- [ ] **Step 2: Extract ReviewSubmitSection**

The commit-reveal submission logic (~lines 480-600) is the most complex part. Extract into:

```typescript
interface ReviewSubmitSectionProps {
  isCommitPhase: boolean;
  sessionIdBytes32: string | null;
  scores: { general: Record<string, number>; domain: Record<string, number> };
  justifications: { general: Record<string, string>; domain: Record<string, string> };
  feedback: string;
  onSubmit: (payload: ReviewPayload) => Promise<void>;
  isSubmitting: boolean;
}
```

- [ ] **Step 3: Move inline types to @/types**

Move `GuildApplication`, `ReviewGuildApplicationModalProps` to `src/types/guildApplication.ts` or `src/types/review.ts`.

- [ ] **Step 4: Verify line count and commit**

Run: `wc -l src/components/guild/ReviewGuildApplicationModal.tsx` — target under 500 lines.
Run: `npm run build`

```bash
git add src/components/guild/ReviewGuildApplicationModal.tsx src/components/guild/review/ReviewSubmitSection.tsx src/types/review.ts
git commit -m "refactor: extract ReviewSubmitSection from ReviewGuildApplicationModal, consolidate review types"
```

---

### Task 15: Split ApplicationsPage

**Files:**
- Modify: `src/components/expert/applications/ApplicationsPage.tsx` (746 lines)
- Create: `src/components/expert/applications/ApplicationsFilters.tsx`
- Create: `src/components/expert/applications/ApplicationsStatsBar.tsx`

- [ ] **Step 1: Extract ApplicationsFilters**

Extract the tab bar + guild filter dropdown + assigned/all toggle (~lines 545-597) into:

```typescript
interface ApplicationsFiltersProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedGuild: string;
  onGuildChange: (guildId: string) => void;
  guilds: { id: string; name: string }[];
  filterMode: "assigned" | "all";
  onFilterModeChange: (mode: "assigned" | "all") => void;
  pendingCounts: { expert: number; candidate: number; proposals: number };
}
```

- [ ] **Step 2: Extract ApplicationsStatsBar**

Extract the stats row section into a component if not already extracted.

- [ ] **Step 3: Move inline types to @/types**

Move `TabType` and `UserProfile` to appropriate type files.

- [ ] **Step 4: Verify line count and commit**

Run: `wc -l src/components/expert/applications/ApplicationsPage.tsx` — target under 500 lines.
Run: `npm run build`

```bash
git add src/components/expert/applications/ApplicationsPage.tsx src/components/expert/applications/ApplicationsFilters.tsx src/components/expert/applications/ApplicationsStatsBar.tsx
git commit -m "refactor: extract ApplicationsFilters and ApplicationsStatsBar from ApplicationsPage"
```

---

### Task 16: Split JobDetailView

**Files:**
- Modify: `src/components/browse/JobDetailView.tsx` (961 lines)
- Create: `src/components/browse/JobHeader.tsx`
- Create: `src/components/browse/JobApplicationModal.tsx`
- Create: `src/components/browse/JobRequirements.tsx`

- [ ] **Step 1: Identify extraction boundaries**

Read the full component. Identify the JSX sections for:
- Job header (company info, title, badges, location, salary)
- Job requirements/description section
- Application modal (cover letter, resume, screening questions)
- Related jobs section (if it exists)

- [ ] **Step 2: Extract JobHeader**

Static display component for job metadata.

- [ ] **Step 3: Extract JobApplicationModal**

The application form with cover letter, resume upload, screening answers. This is the most logic-heavy extraction.

- [ ] **Step 4: Extract JobRequirements**

Static display of job requirements, skills, description.

- [ ] **Step 5: Move inline types to @/types/job.ts**

- [ ] **Step 6: Verify line count and commit**

Run: `wc -l src/components/browse/JobDetailView.tsx` — target under 500 lines.
Run: `npm run build`

```bash
git add src/components/browse/JobDetailView.tsx src/components/browse/JobHeader.tsx src/components/browse/JobApplicationModal.tsx src/components/browse/JobRequirements.tsx src/types/job.ts
git commit -m "refactor: split JobDetailView into JobHeader, JobApplicationModal, JobRequirements"
```

---

### Task 17: Vetting Flow UX — Countdown Badge

**Files:**
- Create: `src/components/ui/countdown-badge.tsx`

- [ ] **Step 1: Create CountdownBadge component**

```typescript
"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

interface CountdownBadgeProps {
  deadline: Date | string;
  label?: string;
  className?: string;
}

function getTimeRemaining(deadline: Date) {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, text: "Expired" };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0) parts.push(`${minutes}m`);

  return { expired: false, days, hours, minutes, text: parts.join(" ") };
}

function getUrgencyColor(hours: number, expired: boolean) {
  if (expired) return "bg-destructive/10 text-destructive border-destructive/20";
  if (hours < 6) return "bg-red-500/10 text-red-600 border-red-500/20";
  if (hours < 24) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

export function CountdownBadge({ deadline, label, className }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() =>
    getTimeRemaining(new Date(deadline))
  );

  // eslint-disable-next-line no-restricted-syntax -- timer with runtime dependency on deadline prop
  useEffect(() => {
    setRemaining(getTimeRemaining(new Date(deadline)));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(new Date(deadline)));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [deadline]);

  const totalHours = remaining.days * 24 + remaining.hours;
  const urgencyColor = getUrgencyColor(totalHours, remaining.expired);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        urgencyColor,
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {label && <span>{label}:</span>}
      {remaining.text}
    </span>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ui/countdown-badge.tsx
git commit -m "feat: add CountdownBadge component with urgency-based color coding"
```

---

### Task 18: Vetting Flow UX — Reviewer Guide + Explainers

**Files:**
- Create: `src/components/expert/FirstTimeReviewerGuide.tsx`
- Create: `src/components/expert/CommitRevealExplainer.tsx`
- Create: `src/components/expert/DeadlineWarningBanner.tsx`

- [ ] **Step 1: Create FirstTimeReviewerGuide**

Overlay/dismissible banner shown on first review assignment. Uses localStorage to track if user has seen it.

```typescript
"use client";

import { useState } from "react";
import { X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FirstTimeReviewerGuide() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("vetted:reviewer-guide-seen") === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("vetted:reviewer-guide-seen", "true");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-6 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss guide"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <BookOpen className="h-6 w-6 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold mb-2">Welcome to your first review!</h3>
          <p className="text-sm text-muted-foreground mb-3">Here&apos;s how vetting works:</p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><strong>Review the candidate profile</strong> — read their application, experience, and answers</li>
            <li><strong>Score using the rubric</strong> — rate each criterion with a justification</li>
            <li><strong>Commit your vote (blind)</strong> — your score is encrypted so other experts can&apos;t see it</li>
            <li><strong>Reveal your vote</strong> — after all experts commit, reveal your score for consensus</li>
          </ol>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleDismiss}>
            Got it, let&apos;s review!
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CommitRevealExplainer**

Inline tooltip/expandable section explaining blind voting:

```typescript
"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export function CommitRevealExplainer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
        aria-expanded={expanded}
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        Why does voting have two steps?
        {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>
      {expanded && (
        <p className="text-sm text-muted-foreground mt-2 pl-6">
          Blind voting prevents experts from copying each other&apos;s scores. First, you <strong>commit</strong> an
          encrypted version of your vote. Once all experts have committed, you <strong>reveal</strong> your actual
          score. This ensures each review is independent and honest.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create DeadlineWarningBanner**

Urgent banner when commit/reveal deadline is approaching:

```typescript
"use client";

import { AlertTriangle } from "lucide-react";
import { CountdownBadge } from "@/components/ui/countdown-badge";

interface DeadlineWarningBannerProps {
  deadline: Date | string;
  phase: "commit" | "reveal";
}

export function DeadlineWarningBanner({ deadline, phase }: DeadlineWarningBannerProps) {
  const deadlineDate = new Date(deadline);
  const hoursRemaining = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursRemaining > 24 || hoursRemaining <= 0) return null;

  const message = phase === "commit"
    ? "You need to commit your vote before the deadline or your review won't count."
    : "You need to reveal your vote or it won't be included in consensus. This affects your reputation.";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{message}</p>
      </div>
      <CountdownBadge deadline={deadline} label={`${phase} deadline`} />
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/expert/FirstTimeReviewerGuide.tsx src/components/expert/CommitRevealExplainer.tsx src/components/expert/DeadlineWarningBanner.tsx
git commit -m "feat: add reviewer guide, commit-reveal explainer, and deadline warning banner"
```

---

### Task 19: Integrate UX Components Into Vetting Flow

**Files:**
- Modify: `src/components/expert/applications/ApplicationsPage.tsx`
- Modify: `src/components/guild/ReviewGuildApplicationModal.tsx`
- Modify: `src/components/expert/applications/ViewReviewModal.tsx`

- [ ] **Step 1: Add FirstTimeReviewerGuide to ApplicationsPage**

Import and render above the applications list.

- [ ] **Step 2: Add DeadlineWarningBanner to ApplicationsPage**

For each application card with an approaching commit/reveal deadline, show the banner.

- [ ] **Step 3: Add CommitRevealExplainer to ReviewGuildApplicationModal**

Show on the submit step, before the commit button.

- [ ] **Step 4: Add CountdownBadge to application cards**

Show deadline countdown on each review card.

- [ ] **Step 5: Add TransactionStatus to ReviewGuildApplicationModal**

Replace the inline loading states during commit/reveal with `TransactionStatus`:
- "awaiting-signature" when wallet signing
- "submitting" when sending to backend
- "confirming" when waiting for on-chain confirmation
- "confirmed" on success
- "failed" with retry button on error

- [ ] **Step 6: Verify and commit**

Run: `npm run build`
Manually test the full review flow in dev server.

```bash
git add src/components/expert/applications/ApplicationsPage.tsx src/components/guild/ReviewGuildApplicationModal.tsx src/components/expert/applications/ViewReviewModal.tsx
git commit -m "feat: integrate reviewer guide, deadline warnings, and transaction status into vetting flow"
```

---

### Task 19b: Vetting Flow UX — State Distinction + Confirmations

**Files:**
- Modify: `src/components/expert/applications/ApplicationsPage.tsx`
- Modify: `src/components/guild/ReviewGuildApplicationModal.tsx`
- Modify: `src/components/expert/applications/ViewReviewModal.tsx`

These are the remaining spec 1.3 UX items not covered in Tasks 18-19.

- [ ] **Step 1: Add visual state distinction to application cards**

In ApplicationsPage, add color-coded status badges for each review state:
- **Needs Review**: blue background, action-oriented label
- **Committed**: yellow/amber background, "Vote Locked" label
- **Revealed**: green background, "Vote Revealed" label
- **Finalized**: gray background, "Complete" label

Use the existing `APPLICATION_STATUS_CONFIG` from `@/config/constants.ts` if applicable, or extend it.

- [ ] **Step 2: Add "Vote locked" confirmation after commit**

In `ReviewGuildApplicationModal`, after a successful commit, show a confirmation message:

```tsx
{commitSuccess && (
  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
    <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
    <p className="font-semibold">Vote committed!</p>
    <p className="text-sm text-muted-foreground mt-1">
      You&apos;ll need to reveal it between {formatDate(revealStart)} and {formatDate(revealEnd)}.
    </p>
  </div>
)}
```

- [ ] **Step 3: Add missed reveal window handling**

In `ViewReviewModal` and `ApplicationsPage`, when a reveal deadline has passed and the user hasn't revealed:

```tsx
{revealDeadlinePassed && !hasRevealed && (
  <Alert variant="error">
    You missed the reveal window. Your vote will not count toward consensus.
    This may affect your reputation score.
  </Alert>
)}
```

- [ ] **Step 4: Add rubric clarity — show criteria descriptions before scoring**

In `ReviewGuildApplicationModal`, before the scoring section, show the rubric criteria with descriptions of what each score level means (e.g., 1 = "Does not meet criteria", 5 = "Exceeds expectations").

- [ ] **Step 5: Add consensus result display after finalization**

In `ViewReviewModal`, when the application is finalized, show:
- Your score vs consensus score
- Whether you aligned with majority
- Reputation impact (+1 or -2)

- [ ] **Step 6: Verify and commit**

Run: `npm run build`

```bash
git add src/components/expert/applications/ApplicationsPage.tsx src/components/guild/ReviewGuildApplicationModal.tsx src/components/expert/applications/ViewReviewModal.tsx
git commit -m "feat: add vote confirmation, state badges, missed reveal handling, rubric clarity, and consensus display"
```

---

### Task 19c: Expert Onboarding UX Improvements

**Files:**
- Modify: `src/components/ExpertApplicationForm.tsx`

- [ ] **Step 1: Add "What is an expert?" intro section**

Before the form, show a brief card explaining the expert role:

```tsx
{currentStep === 0 && (
  <div className="rounded-xl border bg-muted/30 p-6 mb-6">
    <h3 className="font-semibold mb-2">Become a Vetted Expert</h3>
    <p className="text-sm text-muted-foreground mb-3">
      Experts review and vet candidates for companies. You'll join a guild,
      review applications using structured rubrics, and earn reputation and
      token rewards for quality reviews.
    </p>
    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
      <li>Join a guild that matches your expertise</li>
      <li>Review candidate applications with blind voting</li>
      <li>Earn reputation and token rewards</li>
    </ul>
  </div>
)}
```

- [ ] **Step 2: Add required vs optional field indicators**

Ensure all `FormField` components in the expert application pass `required={true}` or `required={false}` so the asterisk indicator is visible.

- [ ] **Step 3: Add wallet disconnect recovery**

If the wallet disconnects mid-form, show a reconnect prompt without losing form data:

```tsx
{!isConnected && currentStep > 0 && (
  <Alert variant="warning">
    Your wallet disconnected. Please reconnect to continue your application.
    Your form data has been preserved.
  </Alert>
)}
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/ExpertApplicationForm.tsx
git commit -m "feat: add expert intro, required field indicators, wallet disconnect recovery to application form"
```

---

### Task 19d: Guild Membership UX Improvements

**Files:**
- Modify: `src/components/GuildDetailView.tsx`
- Modify: `src/components/guild/GuildApplicationFlow.tsx`

- [ ] **Step 1: Add "Why join this guild?" content to GuildStatsPanel**

In the stats panel (created in Task 13), add motivational content: member count, earning potential, number of active reviews.

- [ ] **Step 2: Add post-submission status messaging**

After guild application submit, show:

```tsx
<div className="text-center py-8">
  <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
  <h3 className="font-semibold text-lg">Application Submitted!</h3>
  <p className="text-muted-foreground mt-2">
    Your application is under review by guild members.
    You'll be notified when voting concludes.
  </p>
</div>
```

- [ ] **Step 3: Add "Voting ends in X days" to guild application status**

Use `CountdownBadge` to show when the voting period for the user's guild application ends.

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/GuildDetailView.tsx src/components/guild/GuildApplicationFlow.tsx
git commit -m "feat: add guild motivation content, post-submission status, and voting deadline to guild flow"
```

---

### Task 20: Split GuildApplicationFlow

**Files:**
- Modify: `src/components/guild/GuildApplicationFlow.tsx` (738 lines)
- Create: `src/components/guild/GuildApplicationSteps.tsx`
- Create: `src/components/guild/StakingExplanation.tsx`

- [ ] **Step 1: Extract StakingExplanation**

Create a component that explains staking requirements before the staking step:

```typescript
interface StakingExplanationProps {
  requiredAmount: string;
  guildName: string;
}
```

Content: what staking means, risks, minimum amount, and that it's locked until membership ends.

- [ ] **Step 2: Extract GuildApplicationSteps**

Extract the per-step content into a focused component, keeping the parent as the state/navigation coordinator.

- [ ] **Step 3: Move inline types to @/types/guildApplication.ts**

- [ ] **Step 4: Verify line count and commit**

Run: `wc -l src/components/guild/GuildApplicationFlow.tsx` — target under 500 lines.
Run: `npm run build`

```bash
git add src/components/guild/GuildApplicationFlow.tsx src/components/guild/GuildApplicationSteps.tsx src/components/guild/StakingExplanation.tsx src/types/guildApplication.ts
git commit -m "refactor: split GuildApplicationFlow, add staking explainer"
```

---

### Task 21: Add Breadcrumbs to Expert Deep Pages

**Files:**
- Modify: `src/components/expert/applications/ApplicationsPage.tsx`
- Modify: `src/components/GuildDetailView.tsx`
- Modify: `src/components/governance/GovernanceProposalDetailPage.tsx`

- [ ] **Step 1: Add breadcrumbs to ApplicationsPage**

```tsx
<PageShell
  title="Review Applications"
  breadcrumbs={[
    { label: "Dashboard", href: "/expert/dashboard" },
    { label: "Applications" },
  ]}
>
```

- [ ] **Step 2: Add breadcrumbs to GuildDetailView**

```tsx
breadcrumbs={[
  { label: "Dashboard", href: "/expert/dashboard" },
  { label: "Guilds", href: "/expert/guilds" },
  { label: guild?.name ?? "Guild" },
]}
```

- [ ] **Step 3: Add breadcrumbs to GovernanceProposalDetailPage**

```tsx
breadcrumbs={[
  { label: "Governance", href: "/expert/governance" },
  { label: proposal?.title ?? "Proposal" },
]}
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build`

```bash
git add src/components/expert/applications/ApplicationsPage.tsx src/components/GuildDetailView.tsx src/components/governance/GovernanceProposalDetailPage.tsx
git commit -m "feat: add breadcrumb navigation to expert deep pages"
```

---

## Phase 2: Tier 2 Flows — Must Work Well

### Task 22: Reputation Page — Explainer Content

**Files:**
- Modify: `src/components/expert/ReputationPage.tsx` (134 lines)

- [ ] **Step 1: Add reputation calculation explainer**

Add an expandable "How is reputation calculated?" section. Reference backend values (verify before hardcoding):
- +1: Vote aligned with majority
- +2: Successful endorsement
- -2: Vote against majority
- -2: Poor endorsement outcome
- -1: Inactivity
- -5 to -10: Harmful behavior

- [ ] **Step 2: Commit**

```bash
git add src/components/expert/ReputationPage.tsx
git commit -m "feat: add reputation calculation explainer to ReputationPage"
```

---

### Task 23: Withdrawal + Endorsement Transaction Messaging

**Files:**
- Modify: `src/components/WithdrawalManager.tsx` (310 lines)
- Modify: `src/components/endorsements/EndorsementModal.tsx` (353 lines)

- [ ] **Step 1: Add TransactionStatus to WithdrawalManager**

Replace inline transaction state with `TransactionStatus` component. Map wagmi hook states to `TransactionPhase`.

- [ ] **Step 2: Add risk warning + TransactionStatus to EndorsementModal**

Add a `ConfirmationModal` step before staking: "You are about to stake X tokens. If the candidate is not hired, your stake may be slashed."

Add `TransactionStatus` for the endorsement transaction lifecycle.

- [ ] **Step 3: Commit**

```bash
git add src/components/WithdrawalManager.tsx src/components/endorsements/EndorsementModal.tsx
git commit -m "feat: add transaction status messaging to withdrawals and endorsements"
```

---

### Task 24: Notifications — Mark All Read + Deadline Notifications

**Files:**
- Modify: `src/components/expert/NotificationsPage.tsx`

- [ ] **Step 1: Add "Mark all as read" button**

Add button that calls the appropriate notifications API endpoint.

- [ ] **Step 2: Verify notification types include deadlines**

Check that the backend sends notifications for approaching commit/reveal deadlines. If not, this is a backend task — document it in the backend hardening doc.

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/NotificationsPage.tsx
git commit -m "feat: add mark-all-as-read to notifications page"
```

---

### Task 22b: Earnings Attribution

**Files:**
- Modify: `src/components/expert/EarningsPage.tsx`

- [ ] **Step 1: Add earnings breakdown by source**

Show which reviews/endorsements earned what amount. Display a table or list:
- Date | Source (review/endorsement) | Application/Candidate | Amount | Status (pending/confirmed)

This requires the API to return attribution data. Check `expertApi` for available earnings endpoints. If the backend doesn't provide per-item attribution, document it as a backend requirement.

- [ ] **Step 2: Commit**

```bash
git add src/components/expert/EarningsPage.tsx
git commit -m "feat: add earnings attribution showing per-review and per-endorsement breakdown"
```

---

### Task 23b: Endorsement Lifecycle Messaging

**Files:**
- Modify: `src/components/endorsements/MyActiveEndorsements.tsx`

- [ ] **Step 1: Add endorsement lifecycle state display**

For each active endorsement, show its current state clearly:
- **Active** — "Staked on [candidate] for [job]"
- **Candidate Hired** — "Reward pending — waiting for on-chain confirmation"
- **Reward Confirmed** — "You earned +X tokens from endorsing [candidate]"
- **Candidate Not Hired** — "Slashing applied — appeal window open until [date]"
- **Appeal Window** — CountdownBadge with appeal deadline

- [ ] **Step 2: Migrate EndorsementMarketplace hooks**

In `src/components/EndorsementMarketplace.tsx` (note: top-level `components/`, not in `endorsements/` subdirectory), convert 3 raw useEffect calls to useFetch/useMountEffect.

- [ ] **Step 3: Commit**

```bash
git add src/components/endorsements/MyActiveEndorsements.tsx src/components/EndorsementMarketplace.tsx
git commit -m "feat: add endorsement lifecycle state display, migrate EndorsementMarketplace hooks"
```

---

### Task 24b: Notification Grouping + Deadline Rendering

**Files:**
- Modify: `src/components/expert/NotificationsPage.tsx`

- [ ] **Step 1: Add notification grouping**

Group notifications by type or by flow:
- All notifications about one application together
- Or group by: "Reviews", "Rewards", "Guild", "System"

Use a simple filter/tab approach at the top of the notifications list.

- [ ] **Step 2: Add visual distinction for deadline notifications**

Deadline notifications (commit approaching, reveal approaching) should render with the `CountdownBadge` and amber/red urgency styling.

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/NotificationsPage.tsx
git commit -m "feat: add notification grouping and deadline notification styling"
```

---

### Task 24c: Leaderboard Context

**Files:**
- Modify: `src/components/ReputationLeaderboard.tsx`

- [ ] **Step 1: Add explanatory context**

Add a section explaining:
- What metrics are shown (reputation score, review count, alignment rate)
- What the rank tiers mean
- How to improve your rank

- [ ] **Step 2: Commit**

```bash
git add src/components/ReputationLeaderboard.tsx
git commit -m "feat: add explanatory context to reputation leaderboard"
```

---

## Phase 3: Tier 3 + Final Polish

### Task 25: Split CreateProposalForm + Extract Governance Page

**Files:**
- Modify: `src/components/governance/CreateProposalForm.tsx` (715 lines)
- Modify: `src/app/expert/governance/page.tsx` (110 lines)

- [ ] **Step 1: Extract step sub-components from CreateProposalForm**

Split the multi-step proposal form into per-step components.

- [ ] **Step 2: Move data fetching from governance page.tsx to component**

Move remaining logic from the fat page to a proper component.

- [ ] **Step 3: Commit**

```bash
git add src/components/governance/CreateProposalForm.tsx src/app/expert/governance/page.tsx
git commit -m "refactor: split CreateProposalForm, extract governance page logic to component"
```

---

### Task 26: Type Consolidation (Expert Flows)

**Files:**
- Modify: Multiple component files in expert flows
- Modify: `src/types/expert.ts`, `src/types/guild.ts`, `src/types/governance.ts`, `src/types/review.ts`, `src/types/application.ts`

- [ ] **Step 1: Grep for inline interfaces in Tier 1/2 flow components**

Run: `grep -rn "^interface\|^type " src/components/expert/ src/components/guild/ src/components/governance/ src/components/endorsements/ src/components/GuildDetailView.tsx src/components/ExpertApplicationForm.tsx src/components/WithdrawalManager.tsx`

- [ ] **Step 2: For each inline type, check if it already exists in @/types**

If a matching type exists, update the import. If not, move the type to the appropriate file.

- [ ] **Step 3: Commit in batches**

```bash
git commit -m "refactor: consolidate inline types to @/types for expert flow components"
```

---

### Task 27: Hook Adoption Pass (Expert Flows)

**Files:**
- Modify: Components in expert flows still using manual useState+useEffect for data fetching

- [ ] **Step 1: Find manual data fetching patterns**

Run: `grep -rn "useState.*isLoading\|useState.*loading" src/components/expert/ src/components/guild/ src/components/governance/ src/components/endorsements/`

- [ ] **Step 2: Convert each to useFetch or useApi**

For each match:
- If it's a mount-time data load → use `useFetch()`
- If it's an imperative action (button click) → use `useApi()`

- [ ] **Step 3: Commit in batches**

```bash
git commit -m "refactor: migrate manual data fetching to useFetch/useApi hooks in expert flows"
```

---

### Task 28: Visual Consistency Pass

**Files:**
- Multiple component files

- [ ] **Step 1: Standardize button sizes**

Grep for `h-9` in buttons, replace with `h-10` (or vice versa — pick one standard).

- [ ] **Step 2: Standardize icon sizes**

Grep for inconsistent icon sizing. Establish: `w-4 h-4` for inline, `w-5 h-5` for standalone.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix: standardize button and icon sizes for visual consistency"
```

---

### Task 29: Final Accessibility Pass

**Files:**
- Multiple expert flow components

- [ ] **Step 1: Add aria-labels to all icon buttons in expert flows**

Grep for `<button` with Lucide icon children but no `aria-label`.

- [ ] **Step 2: Add role="tab" and role="tabpanel" to custom tab implementations**

Check expert flow components that use custom tabs (ApplicationsPage, GuildDetailView).

- [ ] **Step 3: Keyboard test**

Test expert onboarding → guild join → review candidate flow with keyboard only:
- Tab reaches all interactive elements
- Enter/Space triggers actions
- Escape closes modals

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: accessibility improvements for expert flow components"
```

---

### Task 30: Final Build + Lint Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build, zero errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No new warnings/errors introduced.

- [ ] **Step 3: Verify success criteria**

Run these checks:

```bash
# No expert-flow component exceeds 500 lines
wc -l src/components/ExpertApplicationForm.tsx src/components/GuildDetailView.tsx src/components/guild/ReviewGuildApplicationModal.tsx src/components/expert/applications/ApplicationsPage.tsx src/components/browse/JobDetailView.tsx src/components/guild/GuildApplicationFlow.tsx src/components/governance/CreateProposalForm.tsx

# No inline types in expert-flow components (should return zero or near-zero)
grep -rn "^interface\|^type " src/components/expert/ src/components/guild/ src/components/governance/ | grep -v "Props\|test" | wc -l

# No manual isLoading state in expert-flow components
grep -rn "useState.*isLoading" src/components/expert/ src/components/guild/ src/components/governance/ | wc -l
```

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git commit -m "chore: final verification pass for MVP frontend hardening"
```
