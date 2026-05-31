import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpertSetupGuide } from "@/components/expert/onboarding/ExpertSetupGuide";
import { EXPERT_SETUP_GUIDE_EVENT_NAME } from "@/lib/expert-onboarding-route-markers";
import type { ExpertOnboardingChecklistEvents } from "@/lib/expert-onboarding-tour";

const navMocks = vi.hoisted(() => ({
  pathname: "/expert/dashboard",
  search: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navMocks.pathname,
  useRouter: () => ({ push: navMocks.push }),
  useSearchParams: () => new URLSearchParams(navMocks.search),
}));

const EMPTY_EVENTS: ExpertOnboardingChecklistEvents = {
  firstReviewOpened: false,
  practiceReviewCompleted: false,
  applicationsVisited: false,
  guildsVisited: false,
  endorsementsVisited: false,
  governanceVisited: false,
  stakingExplanationViewed: false,
  commitRevealViewed: false,
  rewardsVisited: false,
  reputationVisited: false,
  notificationsVisited: false,
};

function renderGuide(
  events: ExpertOnboardingChecklistEvents = EMPTY_EVENTS,
  markChecklistEvent = vi.fn()
) {
  render(
    <ExpertSetupGuide
      enabled
      checklistEvents={events}
      markChecklistEvent={markChecklistEvent}
    />
  );
  return { markChecklistEvent };
}

describe("ExpertSetupGuide", () => {
  beforeEach(() => {
    navMocks.pathname = "/expert/dashboard";
    navMocks.search = "";
    navMocks.push.mockReset();
    sessionStorage.clear();
  });

  it("starts from the shared setup event and routes to the next guided page automatically", async () => {
    const markChecklistEvent = vi.fn();
    renderGuide(EMPTY_EVENTS, markChecklistEvent);

    expect(screen.queryByLabelText("Expert setup guide")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(EXPERT_SETUP_GUIDE_EVENT_NAME));
    });

    expect(await screen.findByLabelText("Expert setup guide")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    await waitFor(() => {
      expect(navMocks.push).toHaveBeenCalledWith("/expert/voting");
    });
    expect(screen.getByRole("button", { name: /^next$/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("vetted:expert-setup-guide-active")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(markChecklistEvent).toHaveBeenCalledWith("applicationsVisited");
    expect(navMocks.push).toHaveBeenCalledWith("/expert/guilds");
  });

  it("advances to the first incomplete setup page", () => {
    sessionStorage.setItem("vetted:expert-setup-guide-active", "true");

    renderGuide({
      ...EMPTY_EVENTS,
      applicationsVisited: true,
      guildsVisited: true,
    });

    expect(screen.getByText("Staking")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeInTheDocument();
    expect(navMocks.push).toHaveBeenCalledWith("/expert/dashboard?openStaking=withdraw");
  });

  it("waits on the guided page until the user clicks next", async () => {
    sessionStorage.setItem("vetted:expert-setup-guide-active", "true");
    navMocks.pathname = "/expert/reputation";
    const markChecklistEvent = vi.fn();

    renderGuide(
      {
        ...EMPTY_EVENTS,
        applicationsVisited: true,
        guildsVisited: true,
        stakingExplanationViewed: true,
        endorsementsVisited: true,
        governanceVisited: true,
        rewardsVisited: true,
      },
      markChecklistEvent
    );

    expect(await screen.findByText("Reputation")).toBeInTheDocument();
    expect(markChecklistEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(markChecklistEvent).toHaveBeenCalledWith("reputationVisited");
    expect(navMocks.push).toHaveBeenCalledWith("/expert/notifications");
  });

  it("clears itself when the full guided setup is complete", async () => {
    sessionStorage.setItem("vetted:expert-setup-guide-active", "true");

    renderGuide({
      ...EMPTY_EVENTS,
      applicationsVisited: true,
      guildsVisited: true,
      stakingExplanationViewed: true,
      endorsementsVisited: true,
      governanceVisited: true,
      rewardsVisited: true,
      reputationVisited: true,
      notificationsVisited: true,
    });

    expect(screen.queryByLabelText("Expert setup guide")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(sessionStorage.getItem("vetted:expert-setup-guide-active")).toBeNull();
    });
  });
});
