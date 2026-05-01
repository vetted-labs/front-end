import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildExpertOnboardingStorageKey,
  createExpertOnboardingState,
  getExpertOnboardingState,
  markExpertOnboardingComplete,
  markExpertOnboardingChecklistEvent,
  resetExpertOnboardingState,
} from "@/lib/expert-onboarding-tour";
import { useExpertOnboardingTour } from "@/lib/hooks/useExpertOnboardingTour";

const EVENTS = {
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

describe("expert onboarding tour persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("prefers expert id and normalizes wallet fallback keys", () => {
    expect(
      buildExpertOnboardingStorageKey({
        expertId: "expert-123",
        walletAddress: "0xABC",
      })
    ).toBe("vetted:expert-onboarding-tour:v1:expert-123");

    expect(
      buildExpertOnboardingStorageKey({
        walletAddress: "0xABCDEF",
      })
    ).toBe("vetted:expert-onboarding-tour:v1:0xabcdef");
  });

  it("stores versioned JSON with separate tour and checklist fields", () => {
    const key = buildExpertOnboardingStorageKey({ expertId: "expert-456" });

    expect(getExpertOnboardingState(window.localStorage, key)).toEqual({
      dismissed: false,
      completed: false,
      checklistDismissed: false,
      events: EVENTS,
    });

    markExpertOnboardingComplete(window.localStorage, key);
    expect(JSON.parse(window.localStorage.getItem(key ?? "") ?? "{}")).toEqual({
      dismissed: false,
      completed: true,
      checklistDismissed: false,
      events: EVENTS,
    });

    resetExpertOnboardingState(window.localStorage, key);
    expect(getExpertOnboardingState(window.localStorage, key)).toEqual({
      dismissed: false,
      completed: false,
      checklistDismissed: false,
      events: EVENTS,
    });
  });

  it("reads legacy raw completed values as completed tour state", () => {
    const key = buildExpertOnboardingStorageKey({ expertId: "legacy-complete" });
    localStorage.setItem(key ?? "", "completed");

    expect(getExpertOnboardingState(window.localStorage, key)).toEqual({
      dismissed: false,
      completed: true,
      checklistDismissed: false,
      events: EVENTS,
    });
  });

  it("strictly normalizes corrupt stored booleans and checklist events", () => {
    const key = buildExpertOnboardingStorageKey({ expertId: "corrupt-state" });
    localStorage.setItem(
      key ?? "",
      JSON.stringify({
        dismissed: "true",
        completed: 1,
        checklistDismissed: "yes",
        events: {
          firstReviewOpened: "true",
          practiceReviewCompleted: true,
          applicationsVisited: true,
          guildsVisited: "true",
          endorsementsVisited: true,
          governanceVisited: false,
          stakingExplanationViewed: 1,
          commitRevealViewed: true,
          rewardsVisited: null,
          reputationVisited: "true",
          notificationsVisited: true,
        },
      })
    );

    expect(getExpertOnboardingState(window.localStorage, key)).toEqual({
      dismissed: false,
      completed: false,
      checklistDismissed: false,
      events: {
        firstReviewOpened: false,
        practiceReviewCompleted: true,
        applicationsVisited: true,
        guildsVisited: false,
        endorsementsVisited: true,
        governanceVisited: false,
        stakingExplanationViewed: false,
        commitRevealViewed: true,
        rewardsVisited: false,
        reputationVisited: false,
        notificationsVisited: true,
      },
    });
  });

  it("stores practice review completion separately from real review progress", () => {
    const key = buildExpertOnboardingStorageKey({ expertId: "practice-expert" });

    markExpertOnboardingChecklistEvent(
      window.localStorage,
      key,
      "practiceReviewCompleted"
    );

    expect(getExpertOnboardingState(window.localStorage, key).events).toMatchObject({
      firstReviewOpened: false,
      commitRevealViewed: false,
      practiceReviewCompleted: true,
    });
  });

  it("keeps rendering safe when storage is unavailable", () => {
    const brokenStorage: Storage = {
      length: 0,
      clear: vi.fn(() => {
        throw new Error("blocked");
      }),
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      key: vi.fn(() => null),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(getExpertOnboardingState(brokenStorage, "tour-key")).toEqual({
      dismissed: false,
      completed: false,
      checklistDismissed: false,
      events: EVENTS,
    });

    expect(() => markExpertOnboardingComplete(brokenStorage, "tour-key")).not.toThrow();
    expect(() => resetExpertOnboardingState(brokenStorage, "tour-key")).not.toThrow();
  });
});

describe("useExpertOnboardingTour", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the approved predicate contract and expert ID before wallet for auto-start", () => {
    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-1",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.storageKey).toBe("vetted:expert-onboarding-tour:v1:expert-1");
    expect(result.current.shouldShowTour).toBe(true);
    expect(result.current.isTourOpen).toBe(true);
    expect(result.current.canStartTour).toBe(true);
  });

  it("falls back to the lowercased wallet address when expert ID is missing", () => {
    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.storageKey).toBe("vetted:expert-onboarding-tour:v1:0xabc");
    expect(result.current.shouldShowTour).toBe(true);
  });

  it("uses server onboarding state so completed experts do not repeat the story on a new browser", () => {
    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-server-complete",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
        serverState: createExpertOnboardingState({
          completed: true,
          checklistDismissed: true,
          events: {
            ...EVENTS,
            practiceReviewCompleted: true,
            applicationsVisited: true,
            guildsVisited: true,
            stakingExplanationViewed: true,
            endorsementsVisited: true,
            governanceVisited: true,
            rewardsVisited: true,
            reputationVisited: true,
            notificationsVisited: true,
          },
        }),
      })
    );

    expect(result.current.hasCompletedSetup).toBe(true);
    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.shouldShowChecklist).toBe(false);
  });

  it("treats loaded server state as authoritative over stale browser cache", () => {
    const storageKey = buildExpertOnboardingStorageKey({
      expertId: "expert-server-reset",
    });
    markExpertOnboardingComplete(window.localStorage, storageKey);

    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-server-reset",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
        serverState: createExpertOnboardingState(),
      })
    );

    expect(result.current.hasCompletedSetup).toBe(false);
    expect(result.current.hasCompletedTour).toBe(false);
    expect(result.current.shouldShowTour).toBe(true);
    expect(getExpertOnboardingState(window.localStorage, storageKey)).toMatchObject({
      completed: false,
    });
  });

  it("preserves localStorage when server state is null (no authoritative server snapshot)", () => {
    // A `null` serverState means we haven't fetched a real onboarding record
    // (or no record exists yet). It must NOT clobber a locally-persisted
    // `completed: true`, otherwise E2E test seeding and Finish-flow completion
    // get wiped on every remount.
    const storageKey = buildExpertOnboardingStorageKey({
      expertId: "expert-server-null-reset",
    });
    markExpertOnboardingComplete(window.localStorage, storageKey);

    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-server-null-reset",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
        serverState: null,
      })
    );

    expect(result.current.hasCompletedTour).toBe(true);
    expect(result.current.shouldShowTour).toBe(false);
    expect(getExpertOnboardingState(window.localStorage, storageKey)).toMatchObject({
      completed: true,
    });
  });

  it("does not accept the legacy enabled-only contract", () => {
    const legacyOptions = {
      expertId: "expert-legacy-enabled",
      enabled: true,
    } as unknown as Parameters<typeof useExpertOnboardingTour>[0];

    const { result } = renderHook(() => useExpertOnboardingTour(legacyOptions));

    expect(result.current.storageKey).toBe(
      "vetted:expert-onboarding-tour:v1:expert-legacy-enabled"
    );
    expect(result.current.canStartTour).toBe(false);
    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);

    act(() => result.current.startTour());
    expect(result.current.isTourOpen).toBe(false);
  });

  it("does not auto-start or manually open without identity, profile load, approval, or dashboard route", () => {
    const noIdentity = renderHook(() =>
      useExpertOnboardingTour({
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );
    expect(noIdentity.result.current.storageKey).toBeNull();
    expect(noIdentity.result.current.canStartTour).toBe(false);
    expect(noIdentity.result.current.shouldShowTour).toBe(false);
    expect(noIdentity.result.current.isTourOpen).toBe(false);

    act(() => {
      noIdentity.result.current.startTour();
      noIdentity.result.current.replayTour();
      noIdentity.result.current.resetTour();
      noIdentity.result.current.dismissTour();
      noIdentity.result.current.completeTour();
      noIdentity.result.current.dismissChecklist();
      noIdentity.result.current.markChecklistEvent("commitRevealViewed");
    });
    expect(noIdentity.result.current.isTourOpen).toBe(false);
    expect(noIdentity.result.current.hasDismissedTour).toBe(false);
    expect(noIdentity.result.current.hasCompletedTour).toBe(false);
    expect(noIdentity.result.current.hasDismissedChecklist).toBe(false);
    expect(noIdentity.result.current.checklistEvents.commitRevealViewed).toBe(false);

    const loadingProfile = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-1",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: false,
      })
    );
    expect(loadingProfile.result.current.canStartTour).toBe(false);
    expect(loadingProfile.result.current.shouldShowTour).toBe(false);
    expect(loadingProfile.result.current.isTourOpen).toBe(false);

    const pending = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-1",
        isApprovedExpert: false,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );
    expect(pending.result.current.canStartTour).toBe(false);
    expect(pending.result.current.shouldShowTour).toBe(false);
    expect(pending.result.current.isTourOpen).toBe(false);

    act(() => {
      pending.result.current.startTour();
      pending.result.current.replayTour();
      pending.result.current.resetTour();
      pending.result.current.dismissTour();
      pending.result.current.completeTour();
      pending.result.current.dismissChecklist();
      pending.result.current.markChecklistEvent("commitRevealViewed");
    });
    expect(pending.result.current.isTourOpen).toBe(false);
    expect(pending.result.current.hasDismissedTour).toBe(false);
    expect(pending.result.current.hasCompletedTour).toBe(false);
    expect(pending.result.current.hasDismissedChecklist).toBe(false);
    expect(pending.result.current.checklistEvents.commitRevealViewed).toBe(false);

    const otherRoute = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-1",
        isApprovedExpert: true,
        isDashboardRoute: false,
        profileLoaded: true,
      })
    );
    expect(otherRoute.result.current.canStartTour).toBe(false);
    expect(otherRoute.result.current.shouldShowTour).toBe(false);
    expect(otherRoute.result.current.isTourOpen).toBe(false);

    act(() => {
      otherRoute.result.current.startTour();
      otherRoute.result.current.replayTour();
      otherRoute.result.current.resetTour();
      otherRoute.result.current.dismissTour();
      otherRoute.result.current.completeTour();
    });
    expect(otherRoute.result.current.isTourOpen).toBe(false);
    expect(otherRoute.result.current.hasDismissedTour).toBe(false);
    expect(otherRoute.result.current.hasCompletedTour).toBe(false);
    expect(otherRoute.result.current.hasDismissedChecklist).toBe(false);
    expect(otherRoute.result.current.checklistEvents.commitRevealViewed).toBe(false);
  });

  it("records checklist progress for approved experts outside the dashboard route", () => {
    const storageKey = buildExpertOnboardingStorageKey({
      expertId: "expert-off-dashboard-progress",
    });
    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-off-dashboard-progress",
        isApprovedExpert: true,
        isDashboardRoute: false,
        profileLoaded: true,
      })
    );

    expect(result.current.canStartTour).toBe(false);
    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);

    act(() => {
      result.current.markChecklistEvent("rewardsVisited");
      result.current.dismissChecklist();
    });

    expect(result.current.checklistEvents.rewardsVisited).toBe(true);
    expect(result.current.hasDismissedChecklist).toBe(true);
    expect(result.current.hasDismissedTour).toBe(false);
    expect(result.current.hasCompletedTour).toBe(false);
    expect(getExpertOnboardingState(window.localStorage, storageKey)).toMatchObject({
      checklistDismissed: true,
      events: { rewardsVisited: true },
    });
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-off-dashboard-progress",
        isApprovedExpert: true,
        isDashboardRoute: false,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.checklistEvents.rewardsVisited).toBe(true);
    expect(remount.result.current.hasDismissedChecklist).toBe(true);
  });

  it("persists skip separately from done and allows replay after a remount", () => {
    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-skip",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => result.current.dismissTour());

    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.hasDismissedTour).toBe(true);
    expect(result.current.hasCompletedTour).toBe(false);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-skip",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.shouldShowTour).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
    expect(remount.result.current.hasDismissedTour).toBe(true);
    expect(remount.result.current.hasCompletedTour).toBe(false);
    expect(remount.result.current.canStartTour).toBe(true);

    act(() => remount.result.current.startTour());
    expect(remount.result.current.isTourOpen).toBe(true);
  });

  it("persists done separately from skip and allows replay after a remount", () => {
    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-done",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => result.current.completeTour());

    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.hasDismissedTour).toBe(false);
    expect(result.current.hasCompletedTour).toBe(true);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-done",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.shouldShowTour).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
    expect(remount.result.current.hasDismissedTour).toBe(false);
    expect(remount.result.current.hasCompletedTour).toBe(true);
    expect(remount.result.current.canStartTour).toBe(true);

    act(() => remount.result.current.startTour());
    expect(remount.result.current.isTourOpen).toBe(true);
  });

  it("replays a completed tour without erasing completion when skipped", () => {
    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-completed-replay",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => result.current.completeTour());
    expect(result.current.hasCompletedTour).toBe(true);

    act(() => result.current.replayTour());
    expect(result.current.isTourOpen).toBe(true);

    act(() => result.current.dismissTour());
    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.hasCompletedTour).toBe(true);
    expect(result.current.hasDismissedTour).toBe(false);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-completed-replay",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.hasCompletedTour).toBe(true);
    expect(remount.result.current.shouldShowTour).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
  });

  it.each([
    ["dismissed", { dismissed: true }],
    ["completed", { completed: true }],
  ])(
    "does not auto-open with stale wallet state when expert ID key is already %s",
    (_label, persistedState) => {
      const expertKey = buildExpertOnboardingStorageKey({ expertId: "expert-loaded" });
      localStorage.setItem(
        expertKey ?? "",
        JSON.stringify({
          dismissed: false,
          completed: false,
          checklistDismissed: false,
          events: EVENTS,
          ...persistedState,
        })
      );

      const { result, rerender } = renderHook(
        ({ expertId }: { expertId?: string }) =>
          useExpertOnboardingTour({
            expertId,
            walletAddress: "0xABC",
            isApprovedExpert: true,
            isDashboardRoute: true,
            profileLoaded: true,
          }),
        { initialProps: { expertId: undefined } as { expertId?: string } }
      );

      expect(result.current.storageKey).toBe("vetted:expert-onboarding-tour:v1:0xabc");
      expect(result.current.isTourOpen).toBe(true);

      rerender({ expertId: "expert-loaded" });

      expect(result.current.storageKey).toBe(
        "vetted:expert-onboarding-tour:v1:expert-loaded"
      );
      expect(result.current.shouldShowTour).toBe(false);
      expect(result.current.isTourOpen).toBe(false);
    }
  );

  it("removes migrated wallet fallback state so reset is not re-contaminated", () => {
    const walletKey = "vetted:expert-onboarding-tour:v1:0xabc";
    localStorage.setItem(
      walletKey,
      JSON.stringify({
        dismissed: true,
        completed: false,
        checklistDismissed: true,
        events: { ...EVENTS, rewardsVisited: true },
      })
    );

    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-migrated",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.hasDismissedTour).toBe(true);
    expect(result.current.hasDismissedChecklist).toBe(true);
    expect(result.current.checklistEvents.rewardsVisited).toBe(true);
    expect(localStorage.getItem(walletKey)).toBeNull();

    act(() => result.current.resetTour());

    expect(result.current.hasDismissedTour).toBe(false);
    expect(result.current.hasDismissedChecklist).toBe(false);
    expect(result.current.checklistEvents.rewardsVisited).toBe(false);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-migrated",
        walletAddress: "0xABC",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.hasDismissedTour).toBe(false);
    expect(remount.result.current.hasDismissedChecklist).toBe(false);
    expect(remount.result.current.checklistEvents.rewardsVisited).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(true);
  });

  it("persists all checklist events and checklist dismissal separately", () => {
    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-events",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => {
      result.current.markChecklistEvent("firstReviewOpened");
      result.current.markChecklistEvent("stakingExplanationViewed");
      result.current.markChecklistEvent("commitRevealViewed");
      result.current.markChecklistEvent("rewardsVisited");
      result.current.dismissChecklist();
    });

    expect(result.current.hasDismissedChecklist).toBe(true);
    expect(result.current.shouldShowChecklist).toBe(false);
    expect(result.current.checklistEvents).toEqual({
      ...EVENTS,
      firstReviewOpened: true,
      stakingExplanationViewed: true,
      commitRevealViewed: true,
      rewardsVisited: true,
    });
    expect(result.current.hasCompletedTour).toBe(false);
    expect(result.current.hasDismissedTour).toBe(false);
  });

  it("hides setup UI after the full first-run setup is complete", () => {
    const storageKey = buildExpertOnboardingStorageKey({
      expertId: "expert-full-setup",
    });
    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-full-setup",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => {
      result.current.markChecklistEvent("practiceReviewCompleted");
      result.current.markChecklistEvent("applicationsVisited");
      result.current.markChecklistEvent("guildsVisited");
      result.current.markChecklistEvent("stakingExplanationViewed");
      result.current.markChecklistEvent("commitRevealViewed");
      result.current.markChecklistEvent("endorsementsVisited");
      result.current.markChecklistEvent("governanceVisited");
      result.current.markChecklistEvent("rewardsVisited");
      result.current.markChecklistEvent("reputationVisited");
      result.current.markChecklistEvent("notificationsVisited");
    });

    expect(result.current.hasCompletedSetup).toBe(true);
    expect(result.current.shouldShowChecklist).toBe(false);
    expect(result.current.shouldShowTour).toBe(false);
    expect(getExpertOnboardingState(window.localStorage, storageKey)).toMatchObject({
      completed: true,
      checklistDismissed: true,
    });
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-full-setup",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.hasCompletedSetup).toBe(true);
    expect(remount.result.current.shouldShowChecklist).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
  });

  it("disables auto-start when the env flag is false but still allows replay", () => {
    vi.stubEnv("NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR", "false");

    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-flag",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.shouldShowTour).toBe(false);
    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.canStartTour).toBe(true);

    act(() => result.current.startTour());
    expect(result.current.isTourOpen).toBe(true);
  });

  it("closes an already-open tour when eligibility changes", async () => {
    const { result, rerender } = renderHook(
      ({ isApprovedExpert }: { isApprovedExpert: boolean }) =>
        useExpertOnboardingTour({
          expertId: "expert-eligibility-loss",
          isApprovedExpert,
          isDashboardRoute: true,
          profileLoaded: true,
        }),
      { initialProps: { isApprovedExpert: true } }
    );

    expect(result.current.isTourOpen).toBe(true);

    rerender({ isApprovedExpert: false });

    await waitFor(() => expect(result.current.isTourOpen).toBe(false));
    expect(result.current.canStartTour).toBe(false);

    act(() => result.current.dismissTour());
    expect(result.current.hasDismissedTour).toBe(false);

    rerender({ isApprovedExpert: true });

    await waitFor(() => expect(result.current.isTourOpen).toBe(true));
    expect(result.current.hasDismissedTour).toBe(false);
    expect(result.current.hasCompletedTour).toBe(false);
  });

  it("does not crash or block current-session actions when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-blocked",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.shouldShowTour).toBe(true);
    expect(result.current.isTourOpen).toBe(true);

    act(() => {
      result.current.dismissTour();
      result.current.markChecklistEvent("rewardsVisited");
      result.current.dismissChecklist();
    });

    expect(result.current.isTourOpen).toBe(false);
    expect(result.current.hasDismissedTour).toBe(true);
    expect(result.current.checklistEvents.rewardsVisited).toBe(true);
    expect(result.current.hasDismissedChecklist).toBe(true);
  });

  it("remembers dismissed state across remounts when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-memory-fallback",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(result.current.isTourOpen).toBe(true);

    act(() => result.current.dismissTour());
    expect(result.current.hasDismissedTour).toBe(true);
    expect(result.current.isTourOpen).toBe(false);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-memory-fallback",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.hasDismissedTour).toBe(true);
    expect(remount.result.current.shouldShowTour).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
  });

  it("prefers in-memory fallback over stale storage after write failures", () => {
    const key = buildExpertOnboardingStorageKey({ expertId: "expert-stale-storage" });
    localStorage.setItem(
      key ?? "",
      JSON.stringify({
        dismissed: false,
        completed: false,
        checklistDismissed: false,
        events: EVENTS,
      })
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked write");
    });

    const { result, unmount } = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-stale-storage",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    act(() => result.current.dismissTour());
    expect(result.current.hasDismissedTour).toBe(true);
    unmount();

    const remount = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-stale-storage",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );

    expect(remount.result.current.hasDismissedTour).toBe(true);
    expect(remount.result.current.shouldShowTour).toBe(false);
    expect(remount.result.current.isTourOpen).toBe(false);
  });

  it("merges latest persisted state when multiple hook instances share an identity", () => {
    const first = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-shared-key",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );
    const second = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-shared-key",
        isApprovedExpert: true,
        isDashboardRoute: false,
        profileLoaded: true,
      })
    );

    act(() => first.result.current.completeTour());
    act(() => second.result.current.markChecklistEvent("rewardsVisited"));

    const key = buildExpertOnboardingStorageKey({ expertId: "expert-shared-key" });
    expect(getExpertOnboardingState(window.localStorage, key)).toMatchObject({
      completed: true,
      events: { rewardsVisited: true },
    });
  });

  it("syncs same-tab hook instances so layout gates update after dashboard completion", async () => {
    const dashboard = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-same-tab-sync",
        isApprovedExpert: true,
        isDashboardRoute: true,
        profileLoaded: true,
      })
    );
    const layout = renderHook(() =>
      useExpertOnboardingTour({
        expertId: "expert-same-tab-sync",
        isApprovedExpert: true,
        isDashboardRoute: false,
        profileLoaded: true,
      })
    );

    expect(layout.result.current.hasCompletedSetup).toBe(false);

    act(() => {
      dashboard.result.current.markChecklistEvent("practiceReviewCompleted");
      dashboard.result.current.markChecklistEvent("applicationsVisited");
      dashboard.result.current.markChecklistEvent("guildsVisited");
      dashboard.result.current.markChecklistEvent("stakingExplanationViewed");
      dashboard.result.current.markChecklistEvent("endorsementsVisited");
      dashboard.result.current.markChecklistEvent("governanceVisited");
      dashboard.result.current.markChecklistEvent("rewardsVisited");
      dashboard.result.current.markChecklistEvent("reputationVisited");
      dashboard.result.current.markChecklistEvent("notificationsVisited");
    });

    await waitFor(() => {
      expect(layout.result.current.hasCompletedSetup).toBe(true);
    });
  });
});
