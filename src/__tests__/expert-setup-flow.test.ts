import { describe, expect, it } from "vitest";
import {
  EXPERT_SETUP_GUIDE_STEPS,
  getDashboardTourCompletionAction,
  getNextExpertSetupGuideStep,
  getNextExpertSetupGuideStepAfter,
} from "@/components/expert/onboarding/expertSetupFlow";
import type { ExpertOnboardingChecklistEvents } from "@/lib/expert-onboarding-tour";

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

describe("expert setup flow", () => {
  it("opens practice review before starting the cross-page guide", () => {
    expect(
      getDashboardTourCompletionAction({
        hasCompletedSetup: false,
        practiceReviewCompleted: false,
      })
    ).toBe("open-practice-review");

    expect(
      getDashboardTourCompletionAction({
        hasCompletedSetup: false,
        practiceReviewCompleted: true,
      })
    ).toBe("start-page-guide");

    expect(
      getDashboardTourCompletionAction({
        hasCompletedSetup: true,
        practiceReviewCompleted: true,
      })
    ).toBe("none");
  });

  it("walks the page guide through applications, earnings, reputation, and notifications", () => {
    expect(EXPERT_SETUP_GUIDE_STEPS.map((step) => step.id)).toEqual([
      "applications",
      "guilds",
      "staking",
      "endorsements",
      "governance",
      "earnings",
      "reputation",
      "notifications",
    ]);

    expect(getNextExpertSetupGuideStep(EMPTY_EVENTS)?.id).toBe("applications");
    expect(
      getNextExpertSetupGuideStepAfter("applications", {
        ...EMPTY_EVENTS,
        applicationsVisited: true,
      })?.id
    ).toBe("guilds");
    expect(
      getNextExpertSetupGuideStepAfter("governance", {
        ...EMPTY_EVENTS,
        applicationsVisited: true,
        guildsVisited: true,
        stakingExplanationViewed: true,
        endorsementsVisited: true,
        governanceVisited: true,
      })?.id
    ).toBe("earnings");
    expect(
      getNextExpertSetupGuideStepAfter("earnings", {
        ...EMPTY_EVENTS,
        applicationsVisited: true,
        guildsVisited: true,
        stakingExplanationViewed: true,
        endorsementsVisited: true,
        governanceVisited: true,
        rewardsVisited: true,
      })?.id
    ).toBe("reputation");
    expect(
      getNextExpertSetupGuideStepAfter("reputation", {
        ...EMPTY_EVENTS,
        applicationsVisited: true,
        guildsVisited: true,
        stakingExplanationViewed: true,
        endorsementsVisited: true,
        governanceVisited: true,
        rewardsVisited: true,
        reputationVisited: true,
      })?.id
    ).toBe("notifications");
  });
});
