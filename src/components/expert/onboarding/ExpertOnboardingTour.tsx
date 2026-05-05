"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tourTargetSelector, type TourTargetValue } from "./tourTargets";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  targets?: readonly TourTargetValue[];
  fallbackTargets?: readonly TourTargetValue[];
  actionLabel?: string;
}

export type ExpertTourStep = TourStep;

export interface ExpertTourStepViewEvent {
  stepId: string;
  targetResolved: boolean;
  target: TourTargetValue | null;
  selector: string | null;
  targetSource: "primary" | "fallback" | null;
}

interface ExpertOnboardingTourProps {
  open: boolean;
  steps: readonly TourStep[];
  canDismiss?: boolean;
  onDismiss: () => void;
  onComplete: () => void | Promise<void>;
  onStepViewed?: (event: ExpertTourStepViewEvent) => void;
  onStepAction?: (step: TourStep) => void;
}

interface TargetRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface ResolvedTarget {
  element: HTMLElement;
  rect: TargetRect;
  selector: string;
  target: TourTargetValue;
  source: "primary" | "fallback";
}

interface ResolvedTargetState {
  stepId: string | null;
  target: ResolvedTarget | null;
}

interface PanelPosition {
  placement: "center" | "right" | "left" | "below" | "above" | "mobile-bottom";
  style: CSSProperties;
}

interface TargetCandidate {
  selector: `[data-tour-target="${TourTargetValue}"]`;
  target: TourTargetValue;
}

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 280;
const DESKTOP_EDGE_GAP = 24;
const TARGET_GAP = 18;

function getTargetCandidates(targets: readonly TourTargetValue[] | undefined): TargetCandidate[] {
  const candidates: TargetCandidate[] = [];
  const seen = new Set<TourTargetValue>();
  const add = (candidate: TargetCandidate) => {
    if (seen.has(candidate.target)) return;
    seen.add(candidate.target);
    candidates.push(candidate);
  };

  for (const target of targets ?? []) {
    add({
      selector: tourTargetSelector(target),
      target,
    });
  }

  return candidates;
}

function getAllTargetCandidates(step: TourStep | undefined): TargetCandidate[] {
  if (!step) return [];
  return [
    ...getTargetCandidates(step.targets),
    ...getTargetCandidates(step.fallbackTargets),
  ];
}

function rectFromElement(element: HTMLElement): TargetRect | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function areRectsEqual(left: TargetRect, right: TargetRect): boolean {
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.width === right.width &&
    left.height === right.height
  );
}

function areResolvedTargetsEqual(
  left: ResolvedTarget | null,
  right: ResolvedTarget | null
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.element === right.element &&
    left.selector === right.selector &&
    left.target === right.target &&
    left.source === right.source &&
    areRectsEqual(left.rect, right.rect)
  );
}

function areResolvedTargetStatesEqual(
  left: ResolvedTargetState,
  right: ResolvedTargetState
): boolean {
  return left.stepId === right.stepId && areResolvedTargetsEqual(left.target, right.target);
}

function isUsableTarget(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function isVisibleTarget(rect: TargetRect): boolean {
  if (typeof window === "undefined") return true;

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function isFocusableVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    !element.closest("[inert], [aria-hidden='true'], fieldset[disabled]") &&
    element.getAttribute("aria-disabled") !== "true" &&
    element.tabIndex >= 0
  );
}

function resolveTargetGroup(
  targets: readonly TourTargetValue[] | undefined,
  source: "primary" | "fallback"
): ResolvedTarget | null {
  let firstUsableTarget: ResolvedTarget | null = null;

  for (const candidate of getTargetCandidates(targets)) {
    const matches = Array.from(document.querySelectorAll<HTMLElement>(candidate.selector));
    for (const element of matches) {
      const rect = rectFromElement(element);
      if (!rect) continue;
      if (!isUsableTarget(element)) continue;

      const resolved = {
        element,
        rect,
        selector: candidate.selector,
        target: candidate.target,
        source,
      };

      if (isVisibleTarget(rect)) return resolved;
      firstUsableTarget ??= resolved;
    }
  }

  return firstUsableTarget;
}

function resolveTarget(step: TourStep | undefined): ResolvedTarget | null {
  if (!step || typeof document === "undefined") return null;

  return (
    resolveTargetGroup(step.targets, "primary") ??
    resolveTargetGroup(step.fallbackTargets, "fallback")
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",")
    )
  ).filter((element) => !element.hasAttribute("disabled") && isFocusableVisible(element));
}

function clamp(value: number, min: number, max: number): number {
  const normalizedMax = Math.max(min, max);
  return Math.min(Math.max(value, min), normalizedMax);
}

function centerPanelPosition(): PanelPosition {
  return {
    placement: "center",
    style: {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: `min(${PANEL_WIDTH}px, calc(100vw - 48px))`,
    },
  };
}

const DEFAULT_PANEL_SIZE: PanelSize = {
  width: PANEL_WIDTH,
  height: PANEL_HEIGHT,
};

interface PanelSize {
  width: number;
  height: number;
}

function getPanelPosition(
  target: ResolvedTarget | null,
  panelSize: PanelSize
): PanelPosition {
  if (typeof window === "undefined") {
    return centerPanelPosition();
  }

  if (!target) {
    return centerPanelPosition();
  }

  if (window.innerWidth < 768) {
    const mobilePanelMaxHeight = Math.min(window.innerHeight * 0.46, 360);
    const measuredPanelHeight =
      panelSize.height > 0 ? panelSize.height : PANEL_HEIGHT;
    const panelHeight = Math.min(measuredPanelHeight, mobilePanelMaxHeight);
    const targetBottom = target.rect.bottom;
    const targetTop = target.rect.top;
    const wouldCollideWithBottomPanel =
      (targetBottom > window.innerHeight - panelHeight - DESKTOP_EDGE_GAP ||
        targetTop > window.innerHeight * 0.5);

    return {
      placement: wouldCollideWithBottomPanel ? "above" : "mobile-bottom",
      style: {
        left: 0,
        right: 0,
        ...(wouldCollideWithBottomPanel ? { top: 0 } : { bottom: 0 }),
        maxHeight: "min(46vh, 360px)",
      },
    };
  }

  const { rect } = target;
  const panelHeight = panelSize.height > 0 ? panelSize.height : PANEL_HEIGHT;
  const panelWidth = panelSize.width > 0 ? Math.min(panelSize.width, PANEL_WIDTH) : PANEL_WIDTH;
  const top = clamp(rect.top, DESKTOP_EDGE_GAP, window.innerHeight - panelHeight - DESKTOP_EDGE_GAP);
  const canPlaceRight =
    rect.right + TARGET_GAP + panelWidth <= window.innerWidth - DESKTOP_EDGE_GAP;
  const canPlaceLeft = rect.left - TARGET_GAP - panelWidth >= DESKTOP_EDGE_GAP;
  const canPlaceBelow =
    rect.bottom + TARGET_GAP + panelHeight <= window.innerHeight - DESKTOP_EDGE_GAP;
  const canPlaceAbove = rect.top - TARGET_GAP - panelHeight >= DESKTOP_EDGE_GAP;

  if (canPlaceRight) {
    return {
      placement: "right",
      style: {
        width: PANEL_WIDTH,
        left: rect.right + TARGET_GAP,
        top,
      },
    };
  }

  if (canPlaceLeft) {
    return {
      placement: "left",
      style: {
        width: PANEL_WIDTH,
        left: rect.left - panelWidth - TARGET_GAP,
        top,
      },
    };
  }

  if (canPlaceBelow) {
    return {
      placement: "below",
      style: {
        width: PANEL_WIDTH,
        left: clamp(rect.left, DESKTOP_EDGE_GAP, window.innerWidth - panelWidth - DESKTOP_EDGE_GAP),
        top: rect.bottom + TARGET_GAP,
      },
    };
  }

  if (canPlaceAbove) {
    return {
      placement: "above",
      style: {
        width: PANEL_WIDTH,
        left: clamp(rect.left, DESKTOP_EDGE_GAP, window.innerWidth - panelWidth - DESKTOP_EDGE_GAP),
        top: rect.top - panelHeight - TARGET_GAP,
      },
    };
  }

  return {
    placement: "center",
    style: {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: `min(${PANEL_WIDTH}px, calc(100vw - 48px))`,
    },
  };
}

function isActionableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;

  return Boolean(
    element.closest(
      [
        "a[href]",
        "button",
        "input",
        "textarea",
        "select",
        "[role='button']",
        "[contenteditable='true']",
      ].join(",")
    )
  );
}

export function ExpertOnboardingTour({
  open,
  steps,
  canDismiss = true,
  onDismiss,
  onComplete,
  onStepViewed,
  onStepAction,
}: ExpertOnboardingTourProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolvedTargetState, setResolvedTargetState] = useState<ResolvedTargetState>({
    stepId: null,
    target: null,
  });
  const [panelSize, setPanelSize] = useState<PanelSize>(DEFAULT_PANEL_SIZE);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeIndexRef = useRef(0);
  const completionNotifiedRef = useRef(false);
  const viewedStepEventsRef = useRef<Set<string>>(new Set());
  const onStepViewedRef = useRef<typeof onStepViewed>(onStepViewed);
  const scrolledTargetKeyRef = useRef<string | null>(null);
  const scrollRefreshFrameRef = useRef<number | null>(null);
  const resolvedTargetStateRef = useRef<ResolvedTargetState>({
    stepId: null,
    target: null,
  });
  const activeStep = steps[activeIndex];
  const activeStepId = activeStep?.id ?? null;
  const isLastStep = activeIndex === steps.length - 1;
  const resolvedTarget =
    resolvedTargetState.stepId === activeStepId ? resolvedTargetState.target : null;

  // eslint-disable-next-line no-restricted-syntax -- keep latest callback without retriggering target scroll
  useEffect(() => {
    onStepViewedRef.current = onStepViewed;
  }, [onStepViewed]);

  const storeResolvedTargetState = useCallback((nextState: ResolvedTargetState) => {
    if (areResolvedTargetStatesEqual(resolvedTargetStateRef.current, nextState)) return;

    resolvedTargetStateRef.current = nextState;
    setResolvedTargetState(nextState);
  }, []);

  const emitStepViewed = useCallback((step: TourStep, target: ResolvedTarget | null) => {
    const handler = onStepViewedRef.current;
    if (!handler) return;

    const event: ExpertTourStepViewEvent = {
      stepId: step.id,
      targetResolved: Boolean(target),
      target: target?.target ?? null,
      selector: target?.selector ?? null,
      targetSource: target?.source ?? null,
    };
    const eventKey = `${event.stepId}:${event.target ?? "missing"}:${event.targetSource ?? "none"}`;
    if (viewedStepEventsRef.current.has(eventKey)) return;

    viewedStepEventsRef.current.add(eventKey);
    handler(event);
  }, []);

  const scrollTargetIntoView = useCallback((step: TourStep, target: ResolvedTarget | null) => {
    if (!target) return;

    const scrollKey = `${step.id}:${target.target}:${target.source}`;
    if (scrolledTargetKeyRef.current === scrollKey) return;

    scrolledTargetKeyRef.current = scrollKey;
    // Use an immediate scroll so the panel positions against the final target
    // instead of chasing every intermediate frame of a smooth scroll.
    target.element.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "auto",
    });

    if (scrollRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollRefreshFrameRef.current);
    }

    scrollRefreshFrameRef.current = window.requestAnimationFrame(() => {
      scrollRefreshFrameRef.current = null;
      if (resolvedTargetStateRef.current.stepId !== step.id) return;
      const refreshedTarget = resolveTarget(step);
      storeResolvedTargetState({ stepId: step.id, target: refreshedTarget });
    });
  }, [storeResolvedTargetState]);

  const updateTarget = useCallback(
    (step: TourStep, options: { scroll?: boolean } = {}) => {
      const target = resolveTarget(step);
      storeResolvedTargetState({ stepId: step.id, target });

      if (options.scroll) {
        scrollTargetIntoView(step, target);
      }

      return target;
    },
    [scrollTargetIntoView, storeResolvedTargetState]
  );

  const goBack = useCallback(() => {
    const nextIndex = Math.max(0, activeIndexRef.current - 1);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }, []);

  const completeTour = useCallback(async () => {
    if (completionNotifiedRef.current) return;

    completionNotifiedRef.current = true;
    try {
      await onComplete();
    } catch {
      completionNotifiedRef.current = false;
    }
  }, [onComplete]);

  const goNext = useCallback(() => {
    const currentIndex = activeIndexRef.current;
    if (currentIndex >= steps.length - 1) {
      void completeTour();
      return;
    }

    const nextIndex = currentIndex + 1;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }, [completeTour, steps.length]);

  useLayoutEffect(() => {
    if (!open) {
      viewedStepEventsRef.current.clear();
      completionNotifiedRef.current = false;
      scrolledTargetKeyRef.current = null;
      if (scrollRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollRefreshFrameRef.current);
        scrollRefreshFrameRef.current = null;
      }
      activeIndexRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets step when tour closes
      setActiveIndex(0);
      storeResolvedTargetState({ stepId: null, target: null });
      return;
    }

    viewedStepEventsRef.current.clear();
    completionNotifiedRef.current = false;
    scrolledTargetKeyRef.current = null;
    if (scrollRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollRefreshFrameRef.current);
      scrollRefreshFrameRef.current = null;
    }
    activeIndexRef.current = 0;
    setActiveIndex(0);
  }, [open, storeResolvedTargetState]);

  // eslint-disable-next-line no-restricted-syntax -- cancels pending scroll refresh on direct unmount
  useEffect(() => {
    return () => {
      if (scrollRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollRefreshFrameRef.current);
        scrollRefreshFrameRef.current = null;
      }
    };
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- clamp active step when caller changes step config
  useEffect(() => {
    if (activeIndex <= steps.length - 1) return;
    const nextIndex = Math.max(0, steps.length - 1);
    activeIndexRef.current = nextIndex;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamps step index when config shrinks
    setActiveIndex(nextIndex);
  }, [activeIndex, steps.length]);

  // eslint-disable-next-line no-restricted-syntax -- focus restore is required modal behavior
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [open]);

  // eslint-disable-next-line no-restricted-syntax -- portal tour locks page scroll while open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !activeStep) return;
    if (activeIndex !== activeIndexRef.current) return;
    updateTarget(activeStep, { scroll: true });
  }, [activeIndex, activeStep, open, updateTarget]);

  // eslint-disable-next-line no-restricted-syntax -- late-mounting dashboard targets should replace fallback copy while tour is open
  useEffect(() => {
    if (!open || !activeStep) return;

    const onChange = () => updateTarget(activeStep);
    const onViewportChange = () => {
      updateTarget(activeStep);
      setPanelSize((current) => ({ ...current }));
    };
    let targetRefreshFrame: number | null = null;
    const refreshTargetAfterMutation = () => {
      targetRefreshFrame = null;
      const nextTarget = resolveTarget(activeStep);
      const currentTarget = resolvedTargetStateRef.current.target;
      if (resolvedTargetStateRef.current.stepId !== activeStep.id) return;
      if (areResolvedTargetsEqual(currentTarget, nextTarget)) {
        return;
      }

      storeResolvedTargetState({ stepId: activeStep.id, target: nextTarget });
      if (nextTarget) {
        scrollTargetIntoView(activeStep, nextTarget);
      }
    };
    const onTargetMutation = () => {
      if (targetRefreshFrame !== null) return;
      targetRefreshFrame = window.requestAnimationFrame(refreshTargetAfterMutation);
    };
    const shouldObserveTargetMutations = getAllTargetCandidates(activeStep).length > 0;
    const observer = !shouldObserveTargetMutations || typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(onTargetMutation);

    observer?.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-tour-target", "style", "class", "hidden"],
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("scroll", onChange, true);

    return () => {
      if (targetRefreshFrame !== null) {
        window.cancelAnimationFrame(targetRefreshFrame);
      }
      observer?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [
    activeStep,
    open,
    resolvedTarget,
    scrollTargetIntoView,
    storeResolvedTargetState,
    updateTarget,
  ]);

  // eslint-disable-next-line no-restricted-syntax -- step view notifications bridge tour progress to checklist events
  useEffect(() => {
    if (!open || !activeStep) return;
    if (resolvedTargetState.stepId !== activeStepId) return;
    emitStepViewed(activeStep, resolvedTarget);
  }, [
    activeStep,
    activeStepId,
    emitStepViewed,
    onStepViewed,
    open,
    resolvedTarget,
    resolvedTargetState.stepId,
  ]);

  // eslint-disable-next-line no-restricted-syntax -- keyboard support and focus trapping are required dialog behavior
  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (canDismiss) {
          onDismiss();
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }

      if (event.key === "Enter" && !isActionableElement(document.activeElement)) {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (active && !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [canDismiss, goBack, goNext, onDismiss, open]);

  // eslint-disable-next-line no-restricted-syntax -- active step changes should move focus back to the dialog
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [activeIndex, open]);

  useLayoutEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const measurePanel = () => {
      const rect = panel.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      setPanelSize((current) => {
        if (current.width === rect.width && current.height === rect.height) {
          return current;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    measurePanel();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measurePanel);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [activeIndex, open, resolvedTarget]);

  const panelPosition = getPanelPosition(resolvedTarget, panelSize);

  if (!open || typeof document === "undefined" || steps.length === 0 || !activeStep) {
    return null;
  }

  const hasConfiguredTarget = getAllTargetCandidates(activeStep).length > 0;

  return createPortal(
    <div
      className="fixed inset-0"
      data-testid="expert-tour-overlay"
      style={{ zIndex: 1000 }}
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />

      {resolvedTarget && (
        <div
          className="pointer-events-none fixed rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.42),0_0_0_6px_rgba(255,106,0,0.18)] transition-all duration-200 ease-out motion-reduce:transition-none"
          data-testid="expert-tour-spotlight"
          data-active-target={resolvedTarget.target ?? resolvedTarget.selector}
          style={{
            top: resolvedTarget.rect.top - 8,
            left: resolvedTarget.rect.left - 8,
            width: resolvedTarget.rect.width + 16,
            height: resolvedTarget.rect.height + 16,
          }}
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expert-tour-title"
        aria-describedby="expert-tour-description"
        tabIndex={-1}
        data-testid="expert-tour-panel"
        data-placement={panelPosition.placement}
        className={cn(
          "fixed border border-border bg-card p-5 shadow-2xl outline-none",
          "max-h-[min(80vh,420px)] overflow-y-auto",
          "transition-[left,top,right,bottom,transform] duration-200 ease-out motion-reduce:transition-none",
          panelPosition.placement === "mobile-bottom"
            ? "rounded-t-xl"
            : "rounded-xl"
        )}
        style={panelPosition.style}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {activeIndex + 1} of {steps.length}
          </span>
          {canDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Skip walkthrough"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h2 id="expert-tour-title" className="text-lg font-bold text-foreground">
            {activeStep.title}
          </h2>
          <p id="expert-tour-description" className="text-sm leading-6 text-muted-foreground">
            {activeStep.body}
          </p>
          {!resolvedTarget && hasConfiguredTarget && (
            <p className="text-xs leading-5 text-muted-foreground/80">
              This area is not visible right now, but the same control appears when relevant data is available.
            </p>
          )}
          {activeStep.actionLabel && onStepAction && (
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => onStepAction(activeStep)}
            >
              {activeStep.actionLabel}
            </Button>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={goBack}
            disabled={activeIndex === 0}
            icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {canDismiss && (
              <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
                Skip
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              icon={
                isLastStep ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {isLastStep ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
