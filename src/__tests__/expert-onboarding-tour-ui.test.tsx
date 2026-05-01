import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExpertOnboardingTour,
  type ExpertTourStepViewEvent,
  type TourStep,
} from "@/components/expert/onboarding/ExpertOnboardingTour";
import { ExpertOnboardingChecklist } from "@/components/expert/onboarding/ExpertOnboardingChecklist";
import { EXPERT_ONBOARDING_STEPS } from "@/components/expert/onboarding/expertOnboardingSteps";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";

const basicSteps: TourStep[] = [
  {
    id: "one",
    title: "First step",
    body: "Start here.",
    targets: [TOUR_TARGETS.dashboardOverview],
  },
  {
    id: "two",
    title: "Second step",
    body: "Continue here.",
    targets: [TOUR_TARGETS.reviewQueue],
  },
];

let originalScrollIntoView: Element["scrollIntoView"] | undefined;

function setViewport(width: number, height = 800) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
  window.dispatchEvent(new Event("resize"));
}

function setRect(
  element: Element,
  rect: Partial<DOMRect> & Pick<DOMRect, "left" | "top" | "width" | "height">
) {
  const fullRect = {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  } as DOMRect;

  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(fullRect);
}

function addTarget(
  target: string,
  rect: Partial<DOMRect> & Pick<DOMRect, "left" | "top" | "width" | "height"> = {
    left: 120,
    top: 120,
    width: 220,
    height: 80,
  },
  options: { hidden?: boolean; tag?: keyof HTMLElementTagNameMap } = {}
) {
  const tag = options.tag ?? "div";
  const element = document.createElement(tag);
  element.textContent = target;
  element.setAttribute("data-tour-target", target);
  element.style.display = options.hidden ? "none" : "block";
  document.body.appendChild(element);
  setRect(element, rect);
  return element;
}

function renderTour(
  props: Partial<ComponentProps<typeof ExpertOnboardingTour>> = {}
) {
  return render(
    <ExpertOnboardingTour
      open
      steps={basicSteps}
      onDismiss={vi.fn()}
      onComplete={vi.fn()}
      {...props}
    />
  );
}

async function expectActiveTarget(target: string) {
  await waitFor(() => {
    expect(screen.getByTestId("expert-tour-spotlight")).toHaveAttribute(
      "data-active-target",
      target
    );
  });
}

describe("ExpertOnboardingTour", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
    setViewport(1200);
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalScrollIntoView) {
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        writable: true,
        value: originalScrollIntoView,
      });
    } else {
      delete (Element.prototype as { scrollIntoView?: Element["scrollIntoView"] })
        .scrollIntoView;
    }
    document.body.style.overflow = "";
  });

  it("uses the shared target contract in step config", () => {
    expect(dataTourTarget(TOUR_TARGETS.dashboardOverview)).toEqual({
      "data-tour-target": "expert-dashboard-overview",
    });

    expect(EXPERT_ONBOARDING_STEPS.map((step) => step.id)).toEqual([
      "dashboard-overview",
      "practice-review",
      "expert-navigation",
      "review-queue",
      "staking-requirement",
      "commit-reveal",
      "notifications",
      "rewards-reputation",
    ]);

    expect(EXPERT_ONBOARDING_STEPS.map((step) => step.targets)).toEqual([
      [TOUR_TARGETS.dashboardOverview],
      [TOUR_TARGETS.practiceReviewCta],
      [TOUR_TARGETS.desktopSidebar, TOUR_TARGETS.mobileNav],
      [TOUR_TARGETS.reviewQueue],
      [TOUR_TARGETS.stakingStatus],
      [TOUR_TARGETS.commitReveal],
      [TOUR_TARGETS.notifications],
      [TOUR_TARGETS.rewardsSummary],
    ]);
    expect(EXPERT_ONBOARDING_STEPS[1].fallbackTargets).toEqual([
      TOUR_TARGETS.onboardingChecklist,
    ]);
    expect(EXPERT_ONBOARDING_STEPS[5].fallbackTargets).toEqual([
      TOUR_TARGETS.reviewQueue,
    ]);
  });

  it("renders through a body portal above app chrome", () => {
    const { container } = renderTour();

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("expert-tour-overlay")).toHaveStyle({ zIndex: "1000" });
  });

  it("shows progress and navigates with buttons and arrow keys", () => {
    const onComplete = vi.fn();
    renderTour({ onComplete });

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("First step")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Second step")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("First step")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("Second step")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("First step")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("runs the configured action for the practice review step", () => {
    addTarget(TOUR_TARGETS.practiceReviewCta);
    const onStepAction = vi.fn();

    renderTour({
      steps: [EXPERT_ONBOARDING_STEPS[1]],
      onStepAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /open practice review/i }));

    expect(onStepAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "practice-review" })
    );
  });

  it("advances with Enter unless focus is on an actionable control", () => {
    const onComplete = vi.fn();
    renderTour({ onComplete });

    screen.getByRole("dialog").focus();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByText("Second step")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    const next = screen.getByRole("button", { name: /next/i });
    next.focus();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByText("First step")).toBeInTheDocument();

    screen.getByRole("dialog").focus();
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("dismisses with Skip and Escape and completes with Done", () => {
    const onDismiss = vi.fn();
    const onComplete = vi.fn();
    renderTour({ onDismiss, onComplete });

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("can force the walkthrough to continue without skip, close, or Escape dismissal", () => {
    const onDismiss = vi.fn();
    const onComplete = vi.fn();

    renderTour({
      onDismiss,
      onComplete,
      canDismiss: false,
    });

    expect(screen.queryByRole("button", { name: /^skip$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skip walkthrough/i })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("falls back when no target exists", () => {
    renderTour({
      steps: [
        {
          id: "missing",
          title: "Unavailable target",
          body: "The page can still explain the concept.",
          targets: [TOUR_TARGETS.commitReveal],
        },
      ],
    });

    expect(screen.queryByTestId("expert-tour-spotlight")).not.toBeInTheDocument();
    expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
      "data-placement",
      "center"
    );
    expect(
      screen.getByText(/this area is not visible right now/i)
    ).toBeInTheDocument();
  });

  it("keeps missing-target fallback centered on mobile", () => {
    setViewport(390, 780);

    renderTour({
      steps: [
        {
          id: "missing-mobile",
          title: "Unavailable mobile target",
          body: "The page can still explain the concept.",
          targets: [TOUR_TARGETS.commitReveal],
        },
      ],
    });

    expect(screen.queryByTestId("expert-tour-spotlight")).not.toBeInTheDocument();
    expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
      "data-placement",
      "center"
    );
  });

  it("resolves offscreen targets before scrolling them into view", async () => {
    const target = addTarget(TOUR_TARGETS.dashboardOverview, {
      left: 120,
      top: 1200,
      width: 220,
      height: 80,
    });
    const scrollIntoView = vi.fn(() => {
      Object.defineProperty(target, "getBoundingClientRect", {
        configurable: true,
        writable: true,
        value: vi.fn(() => ({
          x: 120,
          y: 120,
          left: 120,
          top: 120,
          width: 220,
          height: 80,
          right: 340,
          bottom: 200,
          toJSON: () => ({}),
        } as DOMRect)),
      });
    });
    Object.defineProperty(target, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
      behavior: "auto",
    });
    await waitFor(() => {
      expect(screen.getByTestId("expert-tour-spotlight")).toHaveStyle({
        top: "112px",
      });
    });
  });

  it("cancels pending scroll refresh when the tour closes", async () => {
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 42);
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);
    addTarget(TOUR_TARGETS.dashboardOverview, {
      left: 120,
      top: 1200,
      width: 220,
      height: 80,
    });

    const { rerender, unmount } = renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(requestAnimationFrame).toHaveBeenCalled();

    rerender(
      <ExpertOnboardingTour
        open={false}
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);

    cancelAnimationFrame.mockClear();
    addTarget(TOUR_TARGETS.reviewQueue, {
      left: 120,
      top: 1200,
      width: 220,
      height: 80,
    });

    rerender(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await expectActiveTarget(TOUR_TARGETS.reviewQueue);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it("prefers an offscreen primary target over a visible semantic fallback", async () => {
    addTarget(TOUR_TARGETS.commitReveal, {
      left: 120,
      top: 1200,
      width: 220,
      height: 80,
    });
    addTarget(TOUR_TARGETS.reviewQueue, {
      left: 120,
      top: 120,
      width: 220,
      height: 80,
    });

    renderTour({
      steps: [
        {
          id: "commit-reveal",
          title: "Commit/reveal",
          body: "Commit first.",
          targets: [TOUR_TARGETS.commitReveal],
          fallbackTargets: [TOUR_TARGETS.reviewQueue],
        },
      ],
    });

    await expectActiveTarget(TOUR_TARGETS.commitReveal);
  });

  it("updates from fallback copy when a target mounts late", async () => {
    renderTour({
      steps: [
        {
          id: "late-target",
          title: "Late target",
          body: "This starts as fallback copy.",
          targets: [TOUR_TARGETS.commitReveal],
        },
      ],
    });

    expect(screen.queryByTestId("expert-tour-spotlight")).not.toBeInTheDocument();

    act(() => {
      addTarget(TOUR_TARGETS.commitReveal);
      window.dispatchEvent(new Event("resize"));
    });

    await expectActiveTarget(TOUR_TARGETS.commitReveal);
  });

  it("switches from an offscreen primary target to a late visible primary target", async () => {
    addTarget(TOUR_TARGETS.desktopSidebar, {
      left: -260,
      top: 0,
      width: 260,
      height: 700,
    });

    renderTour({
      steps: [
        {
          id: "navigation",
          title: "Navigation",
          body: "Use the current navigation.",
          targets: [TOUR_TARGETS.desktopSidebar, TOUR_TARGETS.mobileNav],
        },
      ],
    });

    await expectActiveTarget(TOUR_TARGETS.desktopSidebar);

    act(() => {
      addTarget(TOUR_TARGETS.mobileNav, {
        left: 12,
        top: 12,
        width: 44,
        height: 44,
      });
    });

    await expectActiveTarget(TOUR_TARGETS.mobileNav);
  });

  it("clears stale spotlight state when the active target unmounts", async () => {
    const target = addTarget(TOUR_TARGETS.dashboardOverview);

    renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);

    act(() => {
      target.remove();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("expert-tour-spotlight")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
      "data-placement",
      "center"
    );
  });

  it("places desktop panels away from the target and uses a mobile bottom sheet", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview, {
      left: 96,
      top: 140,
      width: 220,
      height: 72,
    });

    const { rerender } = renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
      "data-placement",
      "right"
    );

    act(() => {
      setViewport(390, 780);
    });
    rerender(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
        "data-placement",
        "mobile-bottom"
      );
    });
  });

  it("places mobile panel above when the target would collide with the bottom sheet", async () => {
    setViewport(390, 780);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 380,
      height: 340,
      right: 380,
      bottom: 340,
      toJSON: () => ({}),
    } as DOMRect);
    addTarget(TOUR_TARGETS.dashboardOverview, {
      left: 96,
      top: 480,
      width: 220,
      height: 80,
    });

    renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    await waitFor(() => {
      expect(screen.getByTestId("expert-tour-panel")).toHaveAttribute(
        "data-placement",
        "above"
      );
    });
  });

  it("keeps desktop panels inside short viewports", async () => {
    setViewport(1200, 240);
    addTarget(TOUR_TARGETS.dashboardOverview, {
      left: 96,
      top: 180,
      width: 220,
      height: 40,
    });

    renderTour();

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(screen.getByTestId("expert-tour-panel")).toHaveStyle({ top: "24px" });
  });

  it("does not scroll again when the viewed callback identity changes", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    const firstHandler = vi.fn();
    const { rerender } = renderTour({ onStepViewed: firstHandler });

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    rerender(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
        onStepViewed={vi.fn()}
      />
    );

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("reopens from step one without scrolling the stale previous step", async () => {
    const firstTarget = addTarget(TOUR_TARGETS.dashboardOverview);
    const secondTarget = addTarget(TOUR_TARGETS.reviewQueue);
    const firstScroll = vi.fn();
    const secondScroll = vi.fn();
    Object.defineProperty(firstTarget, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: firstScroll,
    });
    Object.defineProperty(secondTarget, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: secondScroll,
    });

    const { rerender } = render(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await expectActiveTarget(TOUR_TARGETS.reviewQueue);

    firstScroll.mockClear();
    secondScroll.mockClear();

    rerender(
      <ExpertOnboardingTour
        open={false}
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    rerender(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await expectActiveTarget(TOUR_TARGETS.dashboardOverview);
    expect(firstScroll).toHaveBeenCalledTimes(1);
    expect(secondScroll).not.toHaveBeenCalled();
  });

  it("traps focus, restores focus, and cleans up body scroll", () => {
    const opener = document.createElement("button");
    opener.textContent = "Open tour";
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = renderTour();
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const close = screen.getByRole("button", { name: "Skip walkthrough" });
    const doneOrNext = screen.getByRole("button", { name: /next/i });

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(doneOrNext).toHaveFocus();

    doneOrNext.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    rerender(
      <ExpertOnboardingTour
        open={false}
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("removes keyboard listeners when closed", () => {
    const onDismiss = vi.fn();
    const { unmount } = renderTour({ onDismiss });

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("resolves representative desktop and mobile targets for every configured step", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    addTarget(TOUR_TARGETS.practiceReviewCta);
    addTarget(TOUR_TARGETS.desktopSidebar, { left: 0, top: 0, width: 260, height: 700 });
    addTarget(TOUR_TARGETS.mobileNav, { left: 12, top: 12, width: 44, height: 44 }, { hidden: true });
    addTarget(TOUR_TARGETS.reviewQueue);
    addTarget(TOUR_TARGETS.stakingStatus);
    addTarget(TOUR_TARGETS.commitReveal);
    addTarget(TOUR_TARGETS.notifications);
    addTarget(TOUR_TARGETS.rewardsSummary);

    const { unmount } = renderTour({ steps: EXPERT_ONBOARDING_STEPS });

    const expectedDesktopTargets = [
      TOUR_TARGETS.dashboardOverview,
      TOUR_TARGETS.practiceReviewCta,
      TOUR_TARGETS.desktopSidebar,
      TOUR_TARGETS.reviewQueue,
      TOUR_TARGETS.stakingStatus,
      TOUR_TARGETS.commitReveal,
      TOUR_TARGETS.notifications,
      TOUR_TARGETS.rewardsSummary,
    ];

    for (const target of expectedDesktopTargets) {
      await expectActiveTarget(target);
      if (target !== expectedDesktopTargets.at(-1)) {
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
      }
    }

    unmount();
    document.body.innerHTML = "";
    addTarget(TOUR_TARGETS.desktopSidebar, { left: -260, top: 0, width: 260, height: 700 });
    addTarget(TOUR_TARGETS.mobileNav, { left: 12, top: 12, width: 44, height: 44 }, { tag: "button" });

    renderTour({ steps: [EXPERT_ONBOARDING_STEPS[2]] });

    await expectActiveTarget(TOUR_TARGETS.mobileNav);
  });

  it("reports target resolution events so commit/reveal can be observed", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    addTarget(TOUR_TARGETS.practiceReviewCta);
    addTarget(TOUR_TARGETS.desktopSidebar, { left: 0, top: 0, width: 260, height: 700 });
    addTarget(TOUR_TARGETS.reviewQueue);
    addTarget(TOUR_TARGETS.stakingStatus);
    const onStepViewed = vi.fn();
    const { rerender } = renderTour({
      steps: EXPERT_ONBOARDING_STEPS,
      onStepViewed,
    });

    await waitFor(() => {
      expect(onStepViewed).toHaveBeenCalledWith({
        stepId: "dashboard-overview",
        targetResolved: true,
        target: TOUR_TARGETS.dashboardOverview,
        selector: `[data-tour-target="${TOUR_TARGETS.dashboardOverview}"]`,
        targetSource: "primary",
      } satisfies ExpertTourStepViewEvent);
    });
    expect(onStepViewed).toHaveBeenCalledTimes(1);

    rerender(
      <ExpertOnboardingTour
        open
        steps={EXPERT_ONBOARDING_STEPS}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
        onStepViewed={onStepViewed}
      />
    );
    expect(onStepViewed).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
      });
    }

    await waitFor(() => {
      const events = onStepViewed.mock.calls.map(
        ([event]) => event as ExpertTourStepViewEvent
      );
      expect(events).toContainEqual({
        stepId: "commit-reveal",
        targetResolved: true,
        target: TOUR_TARGETS.reviewQueue,
        selector: `[data-tour-target="${TOUR_TARGETS.reviewQueue}"]`,
        targetSource: "fallback",
      });
      expect(onStepViewed).toHaveBeenCalledTimes(6);
    });
  });

  it("reports the primary commit/reveal target event", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    addTarget(TOUR_TARGETS.practiceReviewCta);
    addTarget(TOUR_TARGETS.desktopSidebar, { left: 0, top: 0, width: 260, height: 700 });
    addTarget(TOUR_TARGETS.reviewQueue);
    addTarget(TOUR_TARGETS.stakingStatus);
    addTarget(TOUR_TARGETS.commitReveal);
    const onStepViewed = vi.fn();
    renderTour({
      steps: EXPERT_ONBOARDING_STEPS,
      onStepViewed,
    });

    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
      });
    }

    await waitFor(() => {
      const events = onStepViewed.mock.calls.map(
        ([event]) => event as ExpertTourStepViewEvent
      );
      expect(events).toContainEqual({
        stepId: "commit-reveal",
        targetResolved: true,
        target: TOUR_TARGETS.commitReveal,
        selector: `[data-tour-target="${TOUR_TARGETS.commitReveal}"]`,
        targetSource: "primary",
      });
    });
  });

  it("notifies the current step when the viewed handler is added after mount", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    const { rerender } = renderTour();
    const onStepViewed = vi.fn();

    rerender(
      <ExpertOnboardingTour
        open
        steps={basicSteps}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
        onStepViewed={onStepViewed}
      />
    );

    await waitFor(() => {
      expect(onStepViewed).toHaveBeenCalledWith({
        stepId: "one",
        targetResolved: true,
        target: TOUR_TARGETS.dashboardOverview,
        selector: `[data-tour-target="${TOUR_TARGETS.dashboardOverview}"]`,
        targetSource: "primary",
      } satisfies ExpertTourStepViewEvent);
    });
  });

  it("does not report commit/reveal when the tour is skipped before that step", async () => {
    addTarget(TOUR_TARGETS.dashboardOverview);
    addTarget(TOUR_TARGETS.desktopSidebar, { left: 0, top: 0, width: 260, height: 700 });
    addTarget(TOUR_TARGETS.commitReveal);
    const onStepViewed = vi.fn();

    renderTour({
      steps: EXPERT_ONBOARDING_STEPS,
      onStepViewed,
    });

    await waitFor(() => expect(onStepViewed).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    const events = onStepViewed.mock.calls.map(
      ([event]) => event as ExpertTourStepViewEvent
    );
    expect(events.some((event) => event.stepId === "commit-reveal")).toBe(false);
  });
});

describe("ExpertOnboardingChecklist", () => {
  it("exposes item completion state to assistive technology", () => {
    const onActivate = vi.fn();
    const { container } = render(
      <ExpertOnboardingChecklist
        items={[
          {
            id: "wallet",
            label: "Wallet connected",
            description: "Your expert wallet is active.",
            complete: true,
          },
          {
            id: "stake",
            label: "Staking portfolio",
            description: "Manage active stakes.",
            complete: false,
            onActivate,
          },
        ]}
        onReplayTour={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(
      container.querySelector(`[data-tour-target="${TOUR_TARGETS.onboardingChecklist}"]`)
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.textContent === "Wallet connected - Complete"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.textContent === "Staking portfolio - Not complete"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /staking portfolio/i }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
