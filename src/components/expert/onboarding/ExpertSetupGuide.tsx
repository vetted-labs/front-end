"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Compass, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EXPERT_SETUP_GUIDE_EVENT_NAME,
} from "@/lib/expert-onboarding-route-markers";
import type {
  ExpertOnboardingChecklistEvent,
  ExpertOnboardingChecklistEvents,
} from "@/lib/expert-onboarding-tour";
import {
  EXPERT_SETUP_GUIDE_STEPS,
  getNextExpertSetupGuideStep,
  getNextExpertSetupGuideStepAfter,
  type ExpertSetupGuideStep,
} from "./expertSetupFlow";

const EXPERT_SETUP_GUIDE_STORAGE_KEY = "vetted:expert-setup-guide-active";
const EXPERT_SETUP_GUIDE_STEP_STORAGE_KEY = "vetted:expert-setup-guide-step";

export interface ExpertSetupGuideProps {
  checklistEvents: ExpertOnboardingChecklistEvents;
  enabled: boolean;
  markChecklistEvent: (event: ExpertOnboardingChecklistEvent) => void;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function writeActiveFlag(active: boolean): void {
  const storage = getSessionStorage();
  if (!storage) return;

  if (active) {
    storage.setItem(EXPERT_SETUP_GUIDE_STORAGE_KEY, "true");
  } else {
    storage.removeItem(EXPERT_SETUP_GUIDE_STORAGE_KEY);
  }
}

function readActiveFlag(): boolean {
  return getSessionStorage()?.getItem(EXPERT_SETUP_GUIDE_STORAGE_KEY) === "true";
}

function writeCurrentStepId(stepId: string | null): void {
  const storage = getSessionStorage();
  if (!storage) return;

  if (stepId) {
    storage.setItem(EXPERT_SETUP_GUIDE_STEP_STORAGE_KEY, stepId);
  } else {
    storage.removeItem(EXPERT_SETUP_GUIDE_STEP_STORAGE_KEY);
  }
}

function readCurrentStepId(): string | null {
  return getSessionStorage()?.getItem(EXPERT_SETUP_GUIDE_STEP_STORAGE_KEY) ?? null;
}

function routeMatchesStep(pathname: string, step: ExpertSetupGuideStep): boolean {
  return pathname === step.href || pathname.startsWith(`${step.href}/`);
}

export function ExpertSetupGuide({
  checklistEvents,
  enabled,
  markChecklistEvent,
}: ExpertSetupGuideProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  const completedCount = EXPERT_SETUP_GUIDE_STEPS.filter(
    (step) => checklistEvents[step.event]
  ).length;
  const fallbackStep = useMemo(
    () => getNextExpertSetupGuideStep(checklistEvents),
    [checklistEvents]
  );
  const currentStep = useMemo(
    () =>
      EXPERT_SETUP_GUIDE_STEPS.find((step) => step.id === currentStepId) ??
      fallbackStep,
    [currentStepId, fallbackStep]
  );

  const activateGuide = useCallback(() => {
    const storedStepId = readCurrentStepId();
    const storedStep = EXPERT_SETUP_GUIDE_STEPS.find(
      (step) => step.id === storedStepId
    );
    const initialStep = storedStep ?? getNextExpertSetupGuideStep(checklistEvents);
    if (!initialStep) {
      setActive(false);
      setCurrentStepId(null);
      writeActiveFlag(false);
      writeCurrentStepId(null);
      return;
    }

    setActive(true);
    setCurrentStepId(initialStep.id);
    writeActiveFlag(true);
    writeCurrentStepId(initialStep.id);
  }, [checklistEvents]);

  const pauseGuide = useCallback(() => {
    setActive(false);
    setCurrentStepId(null);
    writeActiveFlag(false);
    writeCurrentStepId(null);
  }, []);

  const goToNextStep = useCallback(() => {
    if (!currentStep) return;

    markChecklistEvent(currentStep.event);
    const nextStep = getNextExpertSetupGuideStepAfter(
      currentStep.id,
      checklistEvents
    );

    if (!nextStep) {
      pauseGuide();
      return;
    }

    setCurrentStepId(nextStep.id);
    writeCurrentStepId(nextStep.id);
    writeActiveFlag(true);
    router.push(nextStep.href);
  }, [checklistEvents, currentStep, markChecklistEvent, pauseGuide, router]);

  const goToCurrentStep = useCallback(
    (step: ExpertSetupGuideStep) => {
      writeActiveFlag(true);
      writeCurrentStepId(step.id);
      router.push(step.href);
    },
    [router]
  );

  // eslint-disable-next-line no-restricted-syntax -- restores an in-progress setup guide across expert route changes
  useEffect(() => {
    if (!enabled || active) return;

    if (searchParams.get("setup") === "1" || readActiveFlag()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores guide state from URL/storage
      activateGuide();
    }
  }, [activateGuide, active, enabled, searchParams]);

  // eslint-disable-next-line no-restricted-syntax -- dashboard/practice flow starts the cross-page setup guide with a custom event
  useEffect(() => {
    if (!enabled) return;

    const handleStart = () => activateGuide();
    window.addEventListener(EXPERT_SETUP_GUIDE_EVENT_NAME, handleStart);
    return () => {
      window.removeEventListener(EXPERT_SETUP_GUIDE_EVENT_NAME, handleStart);
    };
  }, [activateGuide, enabled]);

  // eslint-disable-next-line no-restricted-syntax -- active setup guide drives expert page navigation instead of making the user find nav links
  useEffect(() => {
    if (!enabled || !active || !currentStep) return;
    if (routeMatchesStep(pathname, currentStep)) return;
    goToCurrentStep(currentStep);
  }, [active, currentStep, enabled, goToCurrentStep, pathname]);

  // eslint-disable-next-line no-restricted-syntax -- close the guide when approval/auth state makes it unavailable
  useEffect(() => {
    if (enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes guide when auth/approval state changes
    pauseGuide();
  }, [enabled, pauseGuide]);

  // eslint-disable-next-line no-restricted-syntax -- completed setup should disappear instead of asking for one more click
  useEffect(() => {
    if (!active || fallbackStep !== null || currentStep !== null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-closes when all steps complete
    pauseGuide();
  }, [active, currentStep, fallbackStep, pauseGuide]);

  if (!enabled || !active || !currentStep) return null;

  return (
    <aside
      aria-label="Expert setup guide"
      className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-border bg-card p-4 shadow-2xl md:bottom-6 md:right-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Finish setup
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.min(completedCount + 1, EXPERT_SETUP_GUIDE_STEPS.length)} of {EXPERT_SETUP_GUIDE_STEPS.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={pauseGuide}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Pause setup guide"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-base font-bold text-foreground">
          {currentStep.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {currentStep.body}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {EXPERT_SETUP_GUIDE_STEPS.map((step) => (
          <span
            key={step.id}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              checklistEvents[step.event] && "bg-primary",
              step.id === currentStep.id && "bg-primary/60"
            )}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={pauseGuide}>
          Pause
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={goToNextStep}
          icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        >
          Next
        </Button>
      </div>
    </aside>
  );
}
