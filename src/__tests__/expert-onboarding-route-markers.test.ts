import { describe, expect, it } from "vitest";
import {
  EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME,
  dispatchExpertOnboardingChecklistEvent,
  getExpertOnboardingEventForRoute,
  hasExpertProfileVerificationError,
  isApprovedExpertForOnboarding,
  resolveVerifiedExpertIdForOnboarding,
  resolveVerifiedExpertStatusForShell,
} from "@/lib/expert-onboarding-route-markers";

describe("expert onboarding route markers", () => {
  it("uses loaded profile approval before local expert status fallback", () => {
    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: false,
        profileStatus: "approved",
        expertStatus: "approved",
        expertStatusHydrated: true,
      })
    ).toBe(false);

    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: true,
        profileStatus: "pending",
        expertStatus: "approved",
        expertStatusHydrated: true,
      })
    ).toBe(false);

    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: true,
        profileStatus: null,
        expertStatus: "approved",
        expertStatusHydrated: true,
      })
    ).toBe(true);

    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: true,
        profileStatus: undefined,
        expertStatus: "approved",
        expertStatusHydrated: true,
      })
    ).toBe(true);

    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: true,
        profileStatus: null,
        expertStatus: "approved",
        expertStatusHydrated: true,
        requireSyncedExpertStatus: true,
      })
    ).toBe(false);

    expect(
      isApprovedExpertForOnboarding({
        profileLoaded: true,
        profileStatus: "approved",
        expertStatus: "pending",
        expertStatusHydrated: true,
        requireSyncedExpertStatus: true,
      })
    ).toBe(false);
  });

  it("marks education route visits without treating URL shape as a real review open", () => {
    expect(getExpertOnboardingEventForRoute("/expert/voting")).toBe("applicationsVisited");
    expect(getExpertOnboardingEventForRoute("/expert/voting/applications/proposal-1"))
      .toBe("applicationsVisited");
    expect(getExpertOnboardingEventForRoute("/expert/guild/guild-1")).toBe("guildsVisited");
    expect(
      getExpertOnboardingEventForRoute(
        "/expert/guild/guild-1",
        "tab=membershipApplications&applicationId=app-1&applicantType=candidate"
      )
    ).toBe("guildsVisited");
    expect(getExpertOnboardingEventForRoute("/expert/endorsements")).toBe("endorsementsVisited");
    expect(getExpertOnboardingEventForRoute("/expert/governance/create")).toBe("governanceVisited");
    expect(getExpertOnboardingEventForRoute("/expert/notifications")).toBe("notificationsVisited");
  });

  it("marks earnings, reputation, and staking routes independently", () => {
    expect(getExpertOnboardingEventForRoute("/expert/earnings")).toBe("rewardsVisited");
    expect(getExpertOnboardingEventForRoute("/expert/reputation/history"))
      .toBe("reputationVisited");
    expect(getExpertOnboardingEventForRoute("/expert/withdrawals"))
      .toBe("stakingExplanationViewed");
  });

  it("does not trust stale local approved status for shell rendering before profile verification", () => {
    expect(
      resolveVerifiedExpertStatusForShell({
        isE2E: false,
        expertStatus: "approved",
        expertStatusHydrated: true,
        profileLoaded: false,
        profileStatus: null,
      })
    ).toBeNull();

    expect(
      resolveVerifiedExpertStatusForShell({
        isE2E: false,
        expertStatus: "approved",
        expertStatusHydrated: true,
        profileLoaded: true,
        profileStatus: null,
      })
    ).toBeNull();

    expect(
      resolveVerifiedExpertStatusForShell({
        isE2E: false,
        expertStatus: "approved",
        expertStatusHydrated: true,
        profileLoaded: true,
        profileStatus: "pending",
      })
    ).toBe("pending");

    expect(
      resolveVerifiedExpertStatusForShell({
        isE2E: false,
        expertStatus: "approved",
        expertStatusHydrated: true,
        profileLoaded: true,
        profileStatus: "approved",
      })
    ).toBe("approved");
  });

  it("uses the backend-verified expert id for non-E2E onboarding keys", () => {
    expect(
      resolveVerifiedExpertIdForOnboarding({
        isE2E: false,
        authExpertId: "stale-expert-a",
        profileLoaded: true,
        profileExpertId: "verified-expert-b",
      })
    ).toBe("verified-expert-b");

    expect(
      resolveVerifiedExpertIdForOnboarding({
        isE2E: false,
        authExpertId: "stale-expert-a",
        profileLoaded: false,
        profileExpertId: null,
      })
    ).toBeNull();

    expect(
      resolveVerifiedExpertIdForOnboarding({
        isE2E: true,
        authExpertId: "seeded-e2e-expert",
        profileLoaded: false,
        profileExpertId: null,
      })
    ).toBe("seeded-e2e-expert");
  });

  it("dispatches explicit checklist events from proven UI opens", () => {
    const events: unknown[] = [];
    window.addEventListener(EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME, (event) => {
      events.push((event as CustomEvent).detail);
    });

    dispatchExpertOnboardingChecklistEvent("firstReviewOpened");
    dispatchExpertOnboardingChecklistEvent("practiceReviewCompleted");

    expect(events).toEqual([
      { event: "firstReviewOpened" },
      { event: "practiceReviewCompleted" },
    ]);
  });

  it("fails closed for malformed non-E2E backend profile verification", () => {
    expect(
      hasExpertProfileVerificationError({
        isE2E: false,
        profileLoaded: true,
        profileFound: true,
        profileStatus: null,
        profileExpertId: "expert-1",
      })
    ).toBe(true);

    expect(
      hasExpertProfileVerificationError({
        isE2E: false,
        profileLoaded: true,
        profileFound: true,
        profileStatus: "approved",
        profileExpertId: null,
      })
    ).toBe(true);

    expect(
      hasExpertProfileVerificationError({
        isE2E: false,
        profileLoaded: true,
        profileFound: true,
        profileStatus: "approved",
        profileExpertId: "expert-1",
      })
    ).toBe(false);

    expect(
      hasExpertProfileVerificationError({
        isE2E: false,
        profileLoaded: true,
        profileFound: false,
        profileStatus: null,
        profileExpertId: null,
      })
    ).toBe(false);

    expect(
      hasExpertProfileVerificationError({
        isE2E: true,
        profileLoaded: true,
        profileStatus: undefined,
        profileExpertId: null,
      })
    ).toBe(false);
  });
});
