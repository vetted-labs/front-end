export const EXPERT_ONBOARDING_TOUR_VERSION = "v1";
export const EXPERT_ONBOARDING_TOUR_PREFIX = `vetted:expert-onboarding-tour:${EXPERT_ONBOARDING_TOUR_VERSION}`;

export const EXPERT_ONBOARDING_CHECKLIST_EVENTS = [
  "firstReviewOpened",
  "practiceReviewCompleted",
  "applicationsVisited",
  "guildsVisited",
  "endorsementsVisited",
  "governanceVisited",
  "stakingExplanationViewed",
  "commitRevealViewed",
  "rewardsVisited",
  "reputationVisited",
  "notificationsVisited",
] as const;

export const EXPERT_ONBOARDING_SETUP_REQUIRED_EVENTS = [
  "practiceReviewCompleted",
  "applicationsVisited",
  "guildsVisited",
  "stakingExplanationViewed",
  "endorsementsVisited",
  "governanceVisited",
  "rewardsVisited",
  "reputationVisited",
  "notificationsVisited",
] as const satisfies readonly ExpertOnboardingChecklistEvent[];

export type ExpertOnboardingChecklistEvent =
  (typeof EXPERT_ONBOARDING_CHECKLIST_EVENTS)[number];

export type ExpertOnboardingChecklistEvents = Record<
  ExpertOnboardingChecklistEvent,
  boolean
>;

export interface ExpertOnboardingIdentity {
  expertId?: string | null;
  walletAddress?: string | null;
}

export interface ExpertOnboardingState {
  dismissed: boolean;
  completed: boolean;
  checklistDismissed: boolean;
  events: ExpertOnboardingChecklistEvents;
}

const LEGACY_COMPLETED_VALUE = "completed";
const memoryStateByKey = new Map<string, ExpertOnboardingState>();

export function hasCompletedExpertOnboardingSetup(
  state: { events: ExpertOnboardingChecklistEvents; completed?: boolean }
): boolean {
  if (state.completed === true) return true;
  return EXPERT_ONBOARDING_SETUP_REQUIRED_EVENTS.every(
    (event) => state.events[event] === true
  );
}

function getMemoryState(key: string): ExpertOnboardingState | null {
  const state = memoryStateByKey.get(key);
  return state ? createExpertOnboardingState(state) : null;
}

export function buildExpertOnboardingStorageKey({
  expertId,
  walletAddress,
}: ExpertOnboardingIdentity): string | null {
  const identity = expertId?.trim() || walletAddress?.trim().toLowerCase();
  if (!identity) return null;
  return `${EXPERT_ONBOARDING_TOUR_PREFIX}:${identity}`;
}

export function createExpertOnboardingState(
  overrides: Partial<ExpertOnboardingState> = {},
): ExpertOnboardingState {
  return {
    dismissed: overrides.dismissed === true,
    completed: overrides.completed === true,
    checklistDismissed: overrides.checklistDismissed === true,
    events: {
      firstReviewOpened: overrides.events?.firstReviewOpened === true,
      practiceReviewCompleted:
        overrides.events?.practiceReviewCompleted === true,
      applicationsVisited: overrides.events?.applicationsVisited === true,
      guildsVisited: overrides.events?.guildsVisited === true,
      endorsementsVisited: overrides.events?.endorsementsVisited === true,
      governanceVisited: overrides.events?.governanceVisited === true,
      stakingExplanationViewed:
        overrides.events?.stakingExplanationViewed === true,
      commitRevealViewed: overrides.events?.commitRevealViewed === true,
      rewardsVisited: overrides.events?.rewardsVisited === true,
      reputationVisited: overrides.events?.reputationVisited === true,
      notificationsVisited: overrides.events?.notificationsVisited === true,
    },
  };
}

function normalizeStoredState(value: unknown): ExpertOnboardingState {
  if (!value || typeof value !== "object") {
    return createExpertOnboardingState();
  }

  const stored = value as Partial<ExpertOnboardingState>;

  return createExpertOnboardingState({
    dismissed: stored.dismissed === true,
    completed: stored.completed === true,
    checklistDismissed: stored.checklistDismissed === true,
    events:
      stored.events && typeof stored.events === "object"
        ? stored.events
        : undefined,
  });
}

export function getExpertOnboardingState(
  storage: Storage | null | undefined,
  key: string | null,
): ExpertOnboardingState {
  if (!key) {
    return createExpertOnboardingState();
  }

  if (!storage) {
    return getMemoryState(key) ?? createExpertOnboardingState();
  }

  try {
    const memoryState = getMemoryState(key);
    if (memoryState) return memoryState;

    const raw = storage.getItem(key);
    if (!raw) return createExpertOnboardingState();
    if (raw === LEGACY_COMPLETED_VALUE) {
      return createExpertOnboardingState({ completed: true });
    }
    return normalizeStoredState(JSON.parse(raw));
  } catch {
    return getMemoryState(key) ?? createExpertOnboardingState();
  }
}

export function writeExpertOnboardingState(
  storage: Storage | null | undefined,
  key: string | null,
  state: ExpertOnboardingState,
): void {
  if (!key) return;
  const nextState = createExpertOnboardingState(state);
  if (!storage) {
    memoryStateByKey.set(key, nextState);
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(nextState));
    memoryStateByKey.delete(key);
  } catch {
    memoryStateByKey.set(key, nextState);
  }
}

export function updateExpertOnboardingState(
  storage: Storage | null | undefined,
  key: string | null,
  update: (state: ExpertOnboardingState) => ExpertOnboardingState,
): ExpertOnboardingState {
  const nextState = update(getExpertOnboardingState(storage, key));
  writeExpertOnboardingState(storage, key, nextState);
  return nextState;
}

export function dismissExpertOnboardingTour(
  storage: Storage | null | undefined,
  key: string | null,
): void {
  updateExpertOnboardingState(storage, key, (state) =>
    createExpertOnboardingState({ ...state, dismissed: true })
  );
}

export function markExpertOnboardingComplete(
  storage: Storage | null | undefined,
  key: string | null,
): void {
  updateExpertOnboardingState(storage, key, (state) =>
    createExpertOnboardingState({ ...state, completed: true })
  );
}

export function dismissExpertOnboardingChecklist(
  storage: Storage | null | undefined,
  key: string | null,
): void {
  updateExpertOnboardingState(storage, key, (state) =>
    createExpertOnboardingState({ ...state, checklistDismissed: true })
  );
}

export function markExpertOnboardingChecklistEvent(
  storage: Storage | null | undefined,
  key: string | null,
  event: ExpertOnboardingChecklistEvent,
): void {
  updateExpertOnboardingState(storage, key, (state) =>
    createExpertOnboardingState({
      ...state,
      events: { ...state.events, [event]: true },
    })
  );
}

export function resetExpertOnboardingState(
  storage: Storage | null | undefined,
  key: string | null,
): void {
  if (!key) return;
  memoryStateByKey.delete(key);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
