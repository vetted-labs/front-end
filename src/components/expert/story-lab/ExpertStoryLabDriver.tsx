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
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Route } from "lucide-react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingFocusManager,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
  type Side,
} from "@floating-ui/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tourTargetSelector } from "@/components/expert/onboarding/tourTargets";
import {
  buildStoryLabRoute,
  canAdvanceStoryLabSubStop,
  getStoryLabCompletionRoute,
  getStoryLabStepIndex,
  markStoryLabCompletionReady,
  STORY_LAB_DOM,
  STORY_LAB_STEPS,
  type StoryLabPlacement,
  type StoryLabStep,
  type StoryLabSubStop,
} from "./storyLabData";
import { expertApi } from "@/lib/api";
import { createExpertOnboardingState } from "@/lib/expert-onboarding-tour";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { STORY_LAB_GUILD } from "./storyLabFixtures";

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
  target: StoryLabSubStop["target"];
}

function findTarget(subStop: StoryLabSubStop): ResolvedTarget | null {
  const targets = [subStop.target, subStop.fallbackTarget].filter(
    Boolean
  ) as StoryLabSubStop["target"][];

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

function getCanonicalAttributeValue(
  attribute: string,
  preferredValue: string
): string | null {
  const preferred = document.querySelector<HTMLElement>(
    `[${attribute}="${preferredValue}"]`
  );
  if (preferred) return preferredValue;
  return getFirstAttributeValue(attribute);
}

function resolveDynamicRoute(step: StoryLabStep): string {
  if (step.dynamicRoute === "firstGuild") {
    const guildId = getCanonicalAttributeValue(
      STORY_LAB_DOM.guildId,
      STORY_LAB_GUILD.id
    );
    if (guildId) return `/expert/guild/${encodeURIComponent(guildId)}`;
  }

  if (step.dynamicRoute === "firstReview") {
    const reviewUrl = getFirstAttributeValue(STORY_LAB_DOM.reviewUrl);
    if (reviewUrl) return reviewUrl;
  }

  return step.route;
}

function resolveFloatingPlacement(
  placement: StoryLabPlacement | undefined
): Placement {
  switch (placement) {
    case "right":
    case "left":
    case "top":
    case "bottom":
      return `${placement}-start` as Placement;
    case "auto":
    case "center":
    case undefined:
    default:
      return "right-start";
  }
}

function shouldUseCenteredFallback(
  rect: TargetRect | null,
  requestedPlacement: StoryLabPlacement | undefined
): boolean {
  if (requestedPlacement === "center") return true;
  if (!rect) return true;
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 720) return true;
  if (rect.width / window.innerWidth > 0.85) return true;
  return false;
}

const ARROW_OPPOSITE_SIDE: Record<Side, Side> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

function getCenteredPanelStyle(): CSSProperties {
  return {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(420px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
  };
}

function getAnchoredPanelWidth(): CSSProperties {
  return { width: "min(420px, calc(100vw - 32px))" };
}

export function ExpertStoryLabDriver() {
  const router = useRouter();
  const pathname = usePathname();
  const { isActive, isCompletionReturn, activeStepId, activeSubStopId } =
    useStoryLabContext();
  const isOpen = isActive && !isCompletionReturn;

  const activeIndex = getStoryLabStepIndex(activeStepId);
  const activeStep = STORY_LAB_STEPS[activeIndex] ?? STORY_LAB_STEPS[0];

  const activeSubIndex = useMemo(() => {
    const fallbackId = activeStep.subStops[0]?.id ?? null;
    const subId = activeSubStopId ?? fallbackId;
    if (!subId) return 0;
    const idx = activeStep.subStops.findIndex((s) => s.id === subId);
    return idx >= 0 ? idx : 0;
  }, [activeSubStopId, activeStep]);

  const activeSubStop = activeStep.subStops[activeSubIndex] ?? activeStep.subStops[0];

  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetResolved, setTargetResolved] = useState(false);
  const [resolvedTarget, setResolvedTarget] =
    useState<StoryLabSubStop["target"] | null>(null);
  const [dynamicRoutes, setDynamicRoutes] = useState<Record<string, string>>({});
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const scrolledStopRef = useRef<string | null>(null);
  const driverRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  const Icon = activeStep.icon;
  const totalSteps = STORY_LAB_STEPS.length;
  const totalSubStops = useMemo(
    () => STORY_LAB_STEPS.reduce((sum, step) => sum + step.subStops.length, 0),
    []
  );
  const seenSubStops = useMemo(() => {
    let seen = 0;
    for (let i = 0; i < activeIndex; i += 1) {
      seen += STORY_LAB_STEPS[i].subStops.length;
    }
    return seen + activeSubIndex + 1;
  }, [activeIndex, activeSubIndex]);

  const isLastStep = activeIndex === totalSteps - 1;
  const isLastSubStopOfStep = activeSubIndex === activeStep.subStops.length - 1;
  const isFinalSubStop = isLastStep && isLastSubStopOfStep;

  const canAdvanceCurrentStop =
    targetResolved && canAdvanceStoryLabSubStop(activeSubStop, resolvedTarget);

  const useCenteredFallback = useMemo(
    () => shouldUseCenteredFallback(targetRect, activeSubStop.placement),
    [targetRect, activeSubStop.placement]
  );

  const currentRouteLabel = useMemo(() => {
    if (typeof window === "undefined") return pathname ?? "";
    return `${pathname ?? ""}${window.location.search ?? ""}`;
  }, [pathname]);

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

  const updateTarget = useCallback(
    (options: { scroll?: boolean } = {}) => {
      if (!isOpen) return;

      refreshDynamicRoutes();
      const resolved = findTarget(activeSubStop);
      if (!resolved) {
        setTargetEl(null);
        setTargetRect(null);
        setTargetResolved(false);
        setResolvedTarget(null);
        return;
      }

      const stopKey = `${activeStep.id}:${activeSubStop.id}`;
      const { element, target: targetName } = resolved;
      if (options.scroll && scrolledStopRef.current !== stopKey) {
        scrolledStopRef.current = stopKey;
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }

      const rect = getTargetRect(element);
      setTargetEl(rect ? element : null);
      setTargetRect(rect);
      setTargetResolved(Boolean(rect));
      setResolvedTarget(rect ? targetName : null);
    },
    [activeStep.id, activeSubStop, isOpen, refreshDynamicRoutes]
  );

  const goNextSubStop = useCallback(() => {
    if (!canAdvanceCurrentStop) return;

    if (isFinalSubStop) {
      markStoryLabCompletionReady();
      void expertApi
        .updateOnboardingState({ ...createExpertOnboardingState(), completed: true })
        .catch(() => {});
      router.replace(getStoryLabCompletionRoute());
      return;
    }

    if (!isLastSubStopOfStep) {
      const next = activeStep.subStops[activeSubIndex + 1];
      router.replace(
        buildStoryLabRoute(activeStep.route, activeStep.id, next.id),
        { scroll: false }
      );
      return;
    }

    const nextStep = STORY_LAB_STEPS[activeIndex + 1];
    if (!nextStep) return;
    const firstSub = nextStep.subStops[0];
    scrolledStopRef.current = null;
    router.push(
      buildStoryLabRoute(getResolvedStepRoute(nextStep), nextStep.id, firstSub?.id),
      { scroll: false }
    );
  }, [
    activeIndex,
    activeSubIndex,
    activeStep,
    canAdvanceCurrentStop,
    getResolvedStepRoute,
    isFinalSubStop,
    isLastSubStopOfStep,
    router,
  ]);

  const goBackSubStop = useCallback(() => {
    if (activeSubIndex > 0) {
      const prev = activeStep.subStops[activeSubIndex - 1];
      router.replace(
        buildStoryLabRoute(activeStep.route, activeStep.id, prev.id),
        { scroll: false }
      );
      return;
    }

    if (activeIndex > 0) {
      const prevStep = STORY_LAB_STEPS[activeIndex - 1];
      const lastSub = prevStep.subStops[prevStep.subStops.length - 1];
      scrolledStopRef.current = null;
      router.push(
        buildStoryLabRoute(getResolvedStepRoute(prevStep), prevStep.id, lastSub?.id),
        { scroll: false }
      );
    }
  }, [activeIndex, activeSubIndex, activeStep, getResolvedStepRoute, router]);

  // ---- Floating UI -------------------------------------------------------
  const desiredPlacement = useMemo(
    () => resolveFloatingPlacement(activeSubStop.placement),
    [activeSubStop.placement]
  );

  const {
    refs,
    floatingStyles,
    placement: resolvedFloatingPlacement,
    middlewareData,
    context: floatingContext,
  } = useFloating({
    open: isOpen && !useCenteredFallback,
    placement: desiredPlacement,
    middleware: [
      offset(12),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      size({
        padding: 16,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(220, Math.min(availableHeight, 560))}px`,
          });
        },
      }),
      // eslint-disable-next-line react-hooks/refs -- @floating-ui's documented arrow() API takes a ref it reads asynchronously inside a layout effect, not during render
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Need a separate context for centered fallback so FloatingFocusManager can still wrap.
  const {
    refs: centeredRefs,
    context: centeredContext,
  } = useFloating({
    open: isOpen && useCenteredFallback,
  });

  // Bind reference element for the anchored case.
  useLayoutEffect(() => {
    if (!useCenteredFallback) {
      refs.setReference(targetEl ?? null);
    }
  }, [refs, targetEl, useCenteredFallback]);

  // Compute arrow transform / side. The arrow is rendered as a rotated square,
  // positioned so its tip points back at the reference (i.e. the OPPOSITE side
  // of the floating element from the placement).
  const arrowSide: Side = (resolvedFloatingPlacement.split("-")[0] as Side) ?? "right";
  const arrowStaticSide = ARROW_OPPOSITE_SIDE[arrowSide];
  const arrowStyle: CSSProperties = useMemo(() => {
    const data = middlewareData.arrow;
    if (!data) return { display: "none" };
    return {
      position: "absolute",
      left: data.x !== undefined ? `${data.x}px` : "",
      top: data.y !== undefined ? `${data.y}px` : "",
      [arrowStaticSide]: "-6px",
    } as CSSProperties;
  }, [middlewareData.arrow, arrowStaticSide]);

  // ---- Effects -----------------------------------------------------------

  // eslint-disable-next-line no-restricted-syntax -- captures document.body after client mount for the story-mode portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the portal host from the post-mount DOM into state is the entire purpose of this effect
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
    scrolledStopRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- updateTarget syncs target rect from the live DOM into local state on every sub-stop change; that DOM->state synchronization is the effect's purpose
    updateTarget({ scroll: true });
  }, [activeStep.id, activeSubStop.id, isOpen, updateTarget]);

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
  }, [activeStep.id, activeSubStop.id, isOpen, updateTarget]);

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
      // Don't hijack typing inside fields or activating buttons/links.
      if (event.target instanceof HTMLElement) {
        const interactive = event.target.closest(
          'a, button, input, textarea, select, [contenteditable="true"], [role="button"], [role="link"], [role="textbox"]'
        );
        if (interactive) return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBackSubStop();
      }
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        goNextSubStop();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goBackSubStop, goNextSubStop, isOpen]);

  if (!isOpen || !portalHost) return null;

  const backDisabled = activeIndex === 0 && activeSubIndex === 0;
  const primaryLabel = isFinalSubStop ? "Finish" : activeStep.actionLabel;
  const PrimaryIcon = isFinalSubStop ? Check : ArrowRight;

  const panelContent = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            Step {activeIndex + 1} of {totalSteps}
          </span>
          {activeStep.subStops.length > 1 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {activeSubIndex + 1} / {activeStep.subStops.length} in this step
            </span>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            canAdvanceCurrentStop
              ? "bg-positive/10 text-positive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {canAdvanceCurrentStop ? "Target visible" : "Target not visible"}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">
            {activeSubStop.eyebrow}
          </p>
          <h2 id="story-lab-title" className="mt-1 text-lg font-bold text-foreground">
            {activeSubStop.title}
          </h2>
        </div>
      </div>

      <p id="story-lab-body" className="mt-4 text-sm leading-6 text-muted-foreground">
        {activeSubStop.body}
      </p>
      {activeSubStop.detail && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground/85">
          {activeSubStop.detail}
        </p>
      )}

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
        style={{ gridTemplateColumns: `repeat(${totalSubStops}, minmax(0, 1fr))` }}
        aria-label="Story progress"
      >
        {Array.from({ length: totalSubStops }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-colors",
              index < seenSubStops ? "bg-primary" : "bg-muted"
            )}
            aria-label={`Sub-stop ${index + 1} of ${totalSubStops}`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {backDisabled ? (
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
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              goBackSubStop();
            }}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </button>
        )}
        {canAdvanceCurrentStop ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              goNextSubStop();
            }}
            className={buttonVariants({ size: "sm" })}
          >
            <PrimaryIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {primaryLabel}
          </button>
        ) : (
          <span
            className={cn(buttonVariants({ size: "sm" }), "pointer-events-none opacity-50")}
            aria-disabled="true"
          >
            <PrimaryIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {primaryLabel}
          </span>
        )}
      </div>
    </>
  );

  const popover = useCenteredFallback ? (
    <FloatingFocusManager context={centeredContext} modal>
      <section
        ref={centeredRefs.setFloating}
        data-testid="expert-story-lab-popover"
        data-active-target={resolvedTarget ?? activeSubStop.target}
        data-placement="center"
        style={getCenteredPanelStyle()}
        className="z-[1001] rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-lab-title"
        aria-describedby="story-lab-body"
        tabIndex={-1}
      >
        {panelContent}
      </section>
    </FloatingFocusManager>
  ) : (
    <FloatingFocusManager context={floatingContext} modal>
      <section
        ref={refs.setFloating}
        data-testid="expert-story-lab-popover"
        data-active-target={resolvedTarget ?? activeSubStop.target}
        data-placement={resolvedFloatingPlacement}
        style={{ ...floatingStyles, ...getAnchoredPanelWidth(), overflowY: "auto" }}
        className="z-[1001] rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-lab-title"
        aria-describedby="story-lab-body"
        tabIndex={-1}
      >
        {panelContent}
        <div
          ref={(node) => {
            arrowRef.current = node;
          }}
          aria-hidden="true"
          className="pointer-events-none h-3 w-3 rotate-45 border border-border bg-card"
          style={arrowStyle}
        />
      </section>
    </FloatingFocusManager>
  );

  return createPortal(
    <div
      ref={driverRef}
      className="pointer-events-none fixed inset-0 z-[1000]"
      data-testid="expert-story-lab-driver"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-background/10" />

      {targetRect && !useCenteredFallback && (
        <div
          className="fixed rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.42),0_0_0_6px_rgba(255,106,0,0.18)]"
          data-testid="expert-story-lab-spotlight"
          data-active-target={resolvedTarget ?? activeSubStop.target}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <div className="pointer-events-auto">{popover}</div>
    </div>,
    portalHost
  );
}
