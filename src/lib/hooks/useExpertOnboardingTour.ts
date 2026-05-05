"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildExpertOnboardingStorageKey,
  createExpertOnboardingState,
  getExpertOnboardingState,
  hasCompletedExpertOnboardingSetup,
  resetExpertOnboardingState,
  writeExpertOnboardingState,
  type ExpertOnboardingChecklistEvent,
  type ExpertOnboardingState,
} from "@/lib/expert-onboarding-tour";

const EXPERT_ONBOARDING_STATE_CHANGE_EVENT =
  "vetted:expert-onboarding-tour-state-change";

interface UseExpertOnboardingTourOptions {
  expertId?: string | null;
  walletAddress?: string | null;
  isApprovedExpert: boolean;
  isDashboardRoute: boolean;
  profileLoaded: boolean;
  serverState?: ExpertOnboardingState | null;
  onStateChange?: (
    state: ExpertOnboardingState
  ) => ExpertOnboardingState | void | Promise<ExpertOnboardingState | void>;
}

interface ExpertOnboardingStateChangeDetail {
  key: string;
  state: ExpertOnboardingState;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function dispatchOnboardingStateChange(
  key: string | null,
  state: ExpertOnboardingState,
): void {
  if (!key || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ExpertOnboardingStateChangeDetail>(
      EXPERT_ONBOARDING_STATE_CHANGE_EVENT,
      { detail: { key, state } }
    )
  );
}

export const dispatchExpertOnboardingStateChange = dispatchOnboardingStateChange;

function getOnboardingStateChangeDetail(
  event: Event,
): ExpertOnboardingStateChangeDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail as Partial<ExpertOnboardingStateChangeDetail>;
  if (!detail || typeof detail.key !== "string" || !detail.state) return null;
  return {
    key: detail.key,
    state: createExpertOnboardingState(detail.state),
  };
}

function isEligibleForExpertOnboarding({
  isApprovedExpert,
  isDashboardRoute,
  profileLoaded,
}: UseExpertOnboardingTourOptions): boolean {
  return (
    isApprovedExpert === true &&
    isDashboardRoute === true &&
    profileLoaded === true
  );
}

function canRecordExpertOnboardingProgress({
  isApprovedExpert,
  profileLoaded,
}: UseExpertOnboardingTourOptions): boolean {
  return isApprovedExpert === true && profileLoaded === true;
}

function autoStartFlagEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR !== "false";
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function mergeOnboardingState(
  primary: ExpertOnboardingState,
  fallback: ExpertOnboardingState,
): ExpertOnboardingState {
  const completed = primary.completed || fallback.completed;

  return createExpertOnboardingState({
    completed,
    dismissed: completed ? false : primary.dismissed || fallback.dismissed,
    checklistDismissed:
      primary.checklistDismissed || fallback.checklistDismissed,
    events: {
      firstReviewOpened:
        primary.events.firstReviewOpened || fallback.events.firstReviewOpened,
      practiceReviewCompleted:
        primary.events.practiceReviewCompleted ||
        fallback.events.practiceReviewCompleted,
      applicationsVisited:
        primary.events.applicationsVisited || fallback.events.applicationsVisited,
      guildsVisited:
        primary.events.guildsVisited || fallback.events.guildsVisited,
      endorsementsVisited:
        primary.events.endorsementsVisited || fallback.events.endorsementsVisited,
      governanceVisited:
        primary.events.governanceVisited || fallback.events.governanceVisited,
      stakingExplanationViewed:
        primary.events.stakingExplanationViewed ||
        fallback.events.stakingExplanationViewed,
      commitRevealViewed:
        primary.events.commitRevealViewed || fallback.events.commitRevealViewed,
      rewardsVisited:
        primary.events.rewardsVisited || fallback.events.rewardsVisited,
      reputationVisited:
        primary.events.reputationVisited || fallback.events.reputationVisited,
      notificationsVisited:
        primary.events.notificationsVisited || fallback.events.notificationsVisited,
    },
  });
}

export function useExpertOnboardingTour(options: UseExpertOnboardingTourOptions) {
  const { expertId, walletAddress, onStateChange, serverState } = options;
  // Only treat the server snapshot as authoritative when the profile load
  // produced a real onboarding-state object. `null`/`undefined` means we
  // either haven't fetched yet or no record exists, in which case the
  // localStorage-derived state must be preserved (otherwise hydrating with
  // the empty default would clobber any locally-persisted `completed: true`).
  const hasAuthoritativeServerState =
    options.profileLoaded &&
    serverState !== undefined &&
    serverState !== null;
  const serverStateKey = JSON.stringify(serverState ?? null);
  const normalizedServerState = useMemo(
    () =>
      hasAuthoritativeServerState
        ? createExpertOnboardingState(serverState ?? {})
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- JSON key keeps equivalent server snapshots stable across renders
    [hasAuthoritativeServerState, serverStateKey]
  );
  const onStateChangeRef = useRef<typeof onStateChange>(onStateChange);
  // eslint-disable-next-line no-restricted-syntax -- keeps persistence callback current without rehydrating state
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  const storageKey = useMemo(
    () => buildExpertOnboardingStorageKey({ expertId, walletAddress }),
    [expertId, walletAddress]
  );
  const walletStorageKey = useMemo(
    () => buildExpertOnboardingStorageKey({ walletAddress }),
    [walletAddress]
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const [tourState, setTourState] = useState<ExpertOnboardingState>(() =>
    createExpertOnboardingState()
  );
  const tourStateRef = useRef(tourState);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const autoStartedKeyRef = useRef<string | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- keeps imperative persistence helpers synchronized with React state
  useEffect(() => {
    tourStateRef.current = tourState;
  }, [tourState]);

  const isEligible = isEligibleForExpertOnboarding(options);
  const canRecordProgress = canRecordExpertOnboardingProgress(options);
  const canPersistForIdentity = storageKey !== null;
  const canStartTour =
    canPersistForIdentity &&
    isHydrated &&
    hydratedStorageKey === storageKey &&
    isEligible;
  const canWriteCurrentIdentity =
    canPersistForIdentity &&
    isHydrated &&
    hydratedStorageKey === storageKey;
  const canWriteProgress =
    canWriteCurrentIdentity &&
    canRecordProgress;
  const canAutoStart =
    canStartTour &&
    autoStartFlagEnabled() &&
    !tourState.dismissed &&
    !tourState.completed &&
    !hasCompletedExpertOnboardingSetup(tourState);

  // eslint-disable-next-line no-restricted-syntax -- hydrates guarded local/server onboarding state
  useEffect(() => {
    autoStartedKeyRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets hydration flag before re-reading storage
    setIsHydrated(false);
    setHydratedStorageKey(null);

    const localStorage = getBrowserStorage();
    let nextState = getExpertOnboardingState(localStorage, storageKey);

    if (normalizedServerState) {
      nextState = normalizedServerState;
      writeExpertOnboardingState(localStorage, storageKey, nextState);
      if (walletStorageKey && walletStorageKey !== storageKey) {
        resetExpertOnboardingState(localStorage, walletStorageKey);
      }
    } else if (storageKey && walletStorageKey && storageKey !== walletStorageKey) {
      nextState = mergeOnboardingState(
        nextState,
        getExpertOnboardingState(localStorage, walletStorageKey)
      );
      writeExpertOnboardingState(localStorage, storageKey, nextState);
      resetExpertOnboardingState(localStorage, walletStorageKey);
    }

    tourStateRef.current = nextState;
    setTourState(nextState);
    setIsTourOpen(false);
    setHydratedStorageKey(storageKey);
    setIsHydrated(true);
  }, [normalizedServerState, storageKey, walletStorageKey]);

  // eslint-disable-next-line no-restricted-syntax -- first-run tour opens only after current-key persistence has hydrated
  useEffect(() => {
    if (!canAutoStart || autoStartedKeyRef.current === storageKey) return;
    autoStartedKeyRef.current = storageKey;
    setIsTourOpen(true);
  }, [canAutoStart, storageKey]);

  // eslint-disable-next-line no-restricted-syntax -- close an already-open tour if approval/route eligibility changes underneath it
  useEffect(() => {
    if (canStartTour) return;
    if (!tourState.dismissed && !tourState.completed) {
      autoStartedKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes tour when eligibility is lost
    setIsTourOpen(false);
  }, [canStartTour, tourState.completed, tourState.dismissed]);

  // eslint-disable-next-line no-restricted-syntax -- same-tab sync between layout/dashboard hook instances
  useEffect(() => {
    if (!storageKey) return;

    const handleStateChange = (event: Event) => {
      const detail = getOnboardingStateChangeDetail(event);
      if (!detail || detail.key !== storageKey) return;

      const nextState = mergeOnboardingState(detail.state, tourStateRef.current);
      tourStateRef.current = nextState;
      setTourState(nextState);
    };

    window.addEventListener(
      EXPERT_ONBOARDING_STATE_CHANGE_EVENT,
      handleStateChange
    );
    return () => {
      window.removeEventListener(
        EXPERT_ONBOARDING_STATE_CHANGE_EVENT,
        handleStateChange
      );
    };
  }, [storageKey]);

  const persistState = useCallback(
    (update: (state: ExpertOnboardingState) => ExpertOnboardingState) => {
      const localStorage = getBrowserStorage();
      const latestState = getExpertOnboardingState(localStorage, storageKey);
      const baselineState = mergeOnboardingState(tourStateRef.current, latestState);
      const nextState = createExpertOnboardingState(update(baselineState));

      const commitState = (state: ExpertOnboardingState) => {
        const persistedState = createExpertOnboardingState(state);
        writeExpertOnboardingState(localStorage, storageKey, persistedState);
        tourStateRef.current = persistedState;
        setTourState(persistedState);
        dispatchOnboardingStateChange(storageKey, persistedState);
      };

      commitState(nextState);

      const maybePersistedState = onStateChangeRef.current?.(nextState);
      if (isPromiseLike<ExpertOnboardingState | void>(maybePersistedState)) {
        return maybePersistedState.then((persistedState) => {
          commitState(
            mergeOnboardingState(
              persistedState ? createExpertOnboardingState(persistedState) : nextState,
              tourStateRef.current
            )
          );
        });
      }

      const persistedState = createExpertOnboardingState(
        maybePersistedState ?? nextState
      );
      commitState(mergeOnboardingState(persistedState, tourStateRef.current));
    },
    [storageKey]
  );

  const startTour = useCallback(() => {
    if (!canStartTour) return;
    setIsTourOpen(true);
  }, [canStartTour]);

  const completeTour = useCallback(() => {
    const shouldPersistTourAction = canStartTour || isTourOpen;
    if (!canWriteCurrentIdentity || !shouldPersistTourAction) return;
    const persistResult = persistState((state) =>
      createExpertOnboardingState({ ...state, completed: true, dismissed: false })
    );
    if (persistResult) {
      return persistResult.then(() => {
        setIsTourOpen(false);
      });
    }
    setIsTourOpen(false);
  }, [canStartTour, canWriteCurrentIdentity, isTourOpen, persistState]);

  const dismissTour = useCallback(() => {
    const shouldPersistTourAction = canStartTour || isTourOpen;
    setIsTourOpen(false);
    if (!canWriteCurrentIdentity || !shouldPersistTourAction) return;
    const persistResult = persistState((state) =>
      createExpertOnboardingState({
        ...state,
        dismissed: state.completed ? false : true,
        completed: state.completed,
      })
    );
    if (persistResult) void persistResult.catch(() => {});
  }, [canStartTour, canWriteCurrentIdentity, isTourOpen, persistState]);

  const replayTour = useCallback(() => {
    if (!canStartTour) return;
    setIsTourOpen(true);
  }, [canStartTour]);

  const resetTour = useCallback(() => {
    if (!canStartTour) return;
    const localStorage = getBrowserStorage();
    resetExpertOnboardingState(localStorage, storageKey);
    if (walletStorageKey && walletStorageKey !== storageKey) {
      resetExpertOnboardingState(localStorage, walletStorageKey);
    }
    const nextState = createExpertOnboardingState();
    tourStateRef.current = nextState;
    setTourState(nextState);
    autoStartedKeyRef.current = storageKey;
    setIsTourOpen(true);
  }, [canStartTour, storageKey, walletStorageKey]);

  const dismissChecklist = useCallback(() => {
    if (!canWriteProgress) return;
    const persistResult = persistState((state) =>
      createExpertOnboardingState({ ...state, checklistDismissed: true })
    );
    if (persistResult) void persistResult.catch(() => {});
  }, [canWriteProgress, persistState]);

  const markChecklistEvent = useCallback(
    (event: ExpertOnboardingChecklistEvent) => {
      if (!canWriteProgress) return;
      const persistResult = persistState((state) => {
        const events = { ...state.events, [event]: true };
        const hasCompletedSetup = hasCompletedExpertOnboardingSetup({
          events,
          completed: state.completed,
        });

        return createExpertOnboardingState({
          ...state,
          completed: hasCompletedSetup ? true : state.completed,
          checklistDismissed: hasCompletedSetup ? true : state.checklistDismissed,
          events,
        });
      });
      if (persistResult) void persistResult.catch(() => {});
    },
    [canWriteProgress, persistState]
  );

  const hasCompletedSetup = hasCompletedExpertOnboardingSetup(tourState);

  return {
    isHydrated,
    storageKey,
    hasDismissedTour: tourState.dismissed,
    hasCompletedTour: tourState.completed,
    hasCompletedSetup,
    hasDismissedChecklist: tourState.checklistDismissed,
    checklistEvents: tourState.events,
    canStartTour,
    shouldShowChecklist: canStartTour && !tourState.checklistDismissed && !hasCompletedSetup,
    shouldShowTour: canAutoStart,
    isTourOpen,
    startTour,
    replayTour,
    completeTour,
    dismissTour,
    resetTour,
    dismissChecklist,
    markChecklistEvent,
  };
}
