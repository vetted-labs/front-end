"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Route } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tourTargetSelector } from "@/components/expert/onboarding/tourTargets";
import {
  buildStoryLabRoute,
  canAdvanceStoryLabStep,
  getStoryLabStepIndex,
  getStoryLabCompletionRoute,
  isExpertStoryLabSearchParams,
  markStoryLabCompletionReady,
  STORY_LAB_DOM,
  STORY_LAB_QUERY,
  STORY_LAB_STEPS,
  type StoryLabStep,
} from "./storyLabData";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(element: HTMLElement): TargetRect | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isUsableTarget(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function isVisibleRect(rect: TargetRect): boolean {
  return (
    rect.top < window.innerHeight &&
    rect.top + rect.height > 0 &&
    rect.left < window.innerWidth &&
    rect.left + rect.width > 0
  );
}

interface ResolvedTarget {
  element: HTMLElement;
  target: StoryLabStep["target"];
}

function findTarget(step: StoryLabStep): ResolvedTarget | null {
  const targets = [step.target, step.fallbackTarget].filter(Boolean) as StoryLabStep["target"][];

  for (const target of targets) {
    const selector = tourTargetSelector(target);
    const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
    let firstUsable: HTMLElement | null = null;

    for (const element of matches) {
      const rect = getTargetRect(element);
      if (!rect || !isUsableTarget(element)) continue;
      firstUsable ??= element;
      if (isVisibleRect(rect)) return { element, target };
    }

    if (firstUsable) return { element: firstUsable, target };
  }

  return null;
}

function getFirstAttributeValue(attribute: string): string | null {
  return (
    document
      .querySelector<HTMLElement>(`[${attribute}]`)
      ?.getAttribute(attribute)
      ?.trim() || null
  );
}

function resolveDynamicRoute(step: StoryLabStep): string {
  if (step.dynamicRoute === "firstGuild") {
    const guildId = getFirstAttributeValue(STORY_LAB_DOM.guildId);
    if (guildId) return `/expert/guild/${encodeURIComponent(guildId)}`;
  }

  if (step.dynamicRoute === "firstReview") {
    const reviewUrl = getFirstAttributeValue(STORY_LAB_DOM.reviewUrl);
    if (reviewUrl) return reviewUrl;
  }

  return step.route;
}

function getPanelStyle(): CSSProperties {
  return {
    width: "min(420px, calc(100vw - 32px))",
  };
}

function isInteractiveShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'a, button, input, textarea, select, [contenteditable="true"], [role="button"], [role="link"], [role="textbox"]'
    )
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
  });
}

export function ExpertStoryLabDriver() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = isExpertStoryLabSearchParams(searchParams);
  const activeIndex = getStoryLabStepIndex(searchParams.get(STORY_LAB_QUERY.step));
  const activeStep = STORY_LAB_STEPS[activeIndex] ?? STORY_LAB_STEPS[0];
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetResolved, setTargetResolved] = useState(false);
  const [resolvedTarget, setResolvedTarget] = useState<StoryLabStep["target"] | null>(null);
  const [dynamicRoutes, setDynamicRoutes] = useState<Record<string, string>>({});
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const scrolledStepRef = useRef<string | null>(null);
  const driverRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const Icon = activeStep.icon;
  const isLastStep = activeIndex === STORY_LAB_STEPS.length - 1;
  const canAdvanceCurrentStep =
    targetResolved && canAdvanceStoryLabStep(activeStep, resolvedTarget);

  const currentRouteLabel = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const refreshDynamicRoutes = useCallback(() => {
    if (typeof document === "undefined") return;

    setDynamicRoutes((current) => {
      let changed = false;
      const next = { ...current };

      for (const step of STORY_LAB_STEPS) {
        if (!step.dynamicRoute) continue;
        const route = resolveDynamicRoute(step);
        if (route === step.route) continue;
        if (next[step.id] === route) continue;
        next[step.id] = route;
        changed = true;
      }

      return changed ? next : current;
    });
  }, []);

  const getResolvedStepRoute = useCallback(
    (step: StoryLabStep) => {
      if (dynamicRoutes[step.id]) return dynamicRoutes[step.id];
      if (typeof document === "undefined") return step.route;
      return resolveDynamicRoute(step);
    },
    [dynamicRoutes]
  );

  const getStepHref = useCallback(
    (step: StoryLabStep) => buildStoryLabRoute(getResolvedStepRoute(step), step.id),
    [getResolvedStepRoute]
  );

  const updateTarget = useCallback(
    (options: { scroll?: boolean } = {}) => {
      if (!isOpen) return;

      refreshDynamicRoutes();
      const resolved = findTarget(activeStep);
      if (!resolved) {
        setTargetRect(null);
        setTargetResolved(false);
        setResolvedTarget(null);
        return;
      }

      const { element: target, target: targetName } = resolved;
      if (options.scroll && scrolledStepRef.current !== activeStep.id) {
        scrolledStepRef.current = activeStep.id;
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }

      const rect = getTargetRect(target);
      setTargetRect(rect);
      setTargetResolved(Boolean(rect));
      setResolvedTarget(rect ? targetName : null);
    },
    [activeStep, isOpen, refreshDynamicRoutes]
  );

  const goToStep = useCallback(
    (index: number) => {
      const nextStep = STORY_LAB_STEPS[index];
      if (!nextStep) return;

      scrolledStepRef.current = null;
      router.push(getStepHref(nextStep), { scroll: false });
    },
    [getStepHref, router]
  );

  const goBack = useCallback(() => {
    goToStep(Math.max(0, activeIndex - 1));
  }, [activeIndex, goToStep]);

  const goNext = useCallback(() => {
    if (!canAdvanceCurrentStep) return;

    if (isLastStep) {
      markStoryLabCompletionReady();
      router.push(getStoryLabCompletionRoute());
      return;
    }

    goToStep(Math.min(STORY_LAB_STEPS.length - 1, activeIndex + 1));
  }, [activeIndex, canAdvanceCurrentStep, goToStep, isLastStep, router]);

  const backStep = STORY_LAB_STEPS[Math.max(0, activeIndex - 1)];
  const nextStep = STORY_LAB_STEPS[Math.min(STORY_LAB_STEPS.length - 1, activeIndex + 1)];
  const primaryHref = isLastStep ? getStoryLabCompletionRoute() : getStepHref(nextStep);

  // eslint-disable-next-line no-restricted-syntax -- captures document.body after client mount for the story-mode portal
  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- mandatory story mode must isolate the live page behind the portaled dialog
  useEffect(() => {
    if (!isOpen || !portalHost) return;

    const roots = Array.from(
      document.querySelectorAll<HTMLElement>("[data-app-shell-root]")
    );
    const previousState = roots.map((root) => ({
      root,
      ariaHidden: root.getAttribute("aria-hidden"),
      inert: root.inert,
    }));

    for (const root of roots) {
      root.setAttribute("aria-hidden", "true");
      root.inert = true;
    }

    return () => {
      for (const { root, ariaHidden, inert } of previousState) {
        if (ariaHidden === null) {
          root.removeAttribute("aria-hidden");
        } else {
          root.setAttribute("aria-hidden", ariaHidden);
        }
        root.inert = inert;
      }
    };
  }, [isOpen, portalHost]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    scrolledStepRef.current = null;
    updateTarget({ scroll: true });
  }, [activeStep.id, isOpen, updateTarget]);

  // eslint-disable-next-line no-restricted-syntax -- real pages may mount route targets after route data and dynamic chunks settle
  useEffect(() => {
    if (!isOpen) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      updateTarget({ scroll: attempts === 1 });
      if (attempts >= 30) window.clearInterval(interval);
    }, 100);

    return () => window.clearInterval(interval);
  }, [activeStep.id, isOpen, updateTarget]);

  // eslint-disable-next-line no-restricted-syntax -- story preview must track late-mounted route targets and viewport changes
  useEffect(() => {
    if (!isOpen) return;

    let frame: number | null = null;
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateTarget();
      });
    };
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(scheduleUpdate);

    observer?.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "data-tour-target",
        STORY_LAB_DOM.guildId,
        STORY_LAB_DOM.reviewUrl,
        "style",
        "class",
        "hidden",
      ],
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [isOpen, updateTarget]);

  // eslint-disable-next-line no-restricted-syntax -- keyboard navigation is part of the modal preview controls
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const driver = driverRef.current;
      const dialog = dialogRef.current;
      const target = event.target instanceof Node ? event.target : null;
      const isInsideDriver = !!driver && !!target && driver.contains(target);

      if (!isInsideDriver) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      if (event.key === "Tab" && dialog) {
        const focusable = getFocusableElements(dialog);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (isInteractiveShortcutTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goBack, goNext, isOpen]);

  // eslint-disable-next-line no-restricted-syntax -- story mode must keep keyboard focus out of the live page underneath
  useEffect(() => {
    if (!isOpen) return;

    const focusDialog = () => {
      window.requestAnimationFrame(() => dialogRef.current?.focus());
    };

    focusDialog();

    const handler = (event: FocusEvent) => {
      const driver = driverRef.current;
      const target = event.target instanceof Node ? event.target : null;
      if (!driver || !target || driver.contains(target)) return;
      focusDialog();
    };

    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, [activeStep.id, isOpen]);

  if (!isOpen || !portalHost) return null;

  return createPortal(
    <div
      ref={driverRef}
      className="pointer-events-auto fixed inset-0 z-[1000]"
      data-testid="expert-story-lab-driver"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-background/10" />

      {targetRect && (
        <div
          className="fixed rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.42),0_0_0_6px_rgba(255,106,0,0.18)]"
          data-testid="expert-story-lab-spotlight"
          data-active-target={resolvedTarget ?? activeStep.target}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <section
        ref={dialogRef}
        className="pointer-events-auto fixed bottom-4 right-4 max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl md:bottom-6 md:right-6"
        style={getPanelStyle()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-lab-title"
        aria-describedby="story-lab-body"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            {activeIndex + 1} of {STORY_LAB_STEPS.length}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              canAdvanceCurrentStep
                ? "bg-positive/10 text-positive"
                : "bg-muted text-muted-foreground"
            )}
          >
            {canAdvanceCurrentStep ? "Target visible" : "Target not visible"}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">
              {activeStep.eyebrow}
            </p>
            <h2 id="story-lab-title" className="mt-1 text-lg font-bold text-foreground">
              {activeStep.title}
            </h2>
          </div>
        </div>

        <p id="story-lab-body" className="mt-4 text-sm leading-6 text-muted-foreground">
          {activeStep.body}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground/85">
          {activeStep.detail}
        </p>

        {!targetResolved && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
            This target is not visible in the current real page state. The page underneath is still the actual route, so use this to decide whether the production story needs backend seed data or a different anchor.
          </div>
        )}

        <code className="mt-4 block truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          {currentRouteLabel}
        </code>

        <div
          className="mt-5 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${STORY_LAB_STEPS.length}, minmax(0, 1fr))` }}
          aria-label="Story progress"
        >
          {STORY_LAB_STEPS.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-colors",
                index <= activeIndex ? "bg-primary" : "bg-muted"
              )}
              aria-label={`${step.navLabel} ${index + 1} of ${STORY_LAB_STEPS.length}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {activeIndex === 0 ? (
            <span
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "pointer-events-none opacity-50"
              )}
              aria-disabled="true"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </span>
          ) : (
            <a
              href={getStepHref(backStep)}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </a>
          )}
        {canAdvanceCurrentStep ? (
            <a
              href={primaryHref}
              className={buttonVariants({ size: "sm" })}
              onClick={(event) => {
                if (!isLastStep) return;
                event.preventDefault();
                goNext();
              }}
            >
              {isLastStep ? (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {isLastStep ? "Finish" : activeStep.actionLabel}
            </a>
          ) : (
            <span
              className={cn(buttonVariants({ size: "sm" }), "pointer-events-none opacity-50")}
              aria-disabled="true"
            >
            {isLastStep ? (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isLastStep ? "Finish" : activeStep.actionLabel}
            </span>
          )}
        </div>
      </section>
    </div>,
    portalHost
  );
}
