import type {
  ExpertOnboardingChecklistEvent,
  ExpertOnboardingChecklistEvents,
} from "@/lib/expert-onboarding-tour";

export interface ExpertSetupGuideStep {
  id: string;
  event: ExpertOnboardingChecklistEvent;
  href: string;
  title: string;
  body: string;
}

export const EXPERT_SETUP_GUIDE_STEPS: ExpertSetupGuideStep[] = [
  {
    id: "applications",
    event: "applicationsVisited",
    href: "/expert/voting",
    title: "Applications",
    body: "This is the real work queue. Assigned guild applications and reviews appear here when there is work ready for you.",
  },
  {
    id: "guilds",
    event: "guildsVisited",
    href: "/expert/guilds",
    title: "Guilds",
    body: "Guild pages show membership, rank, stake context, and the places where guild-specific approval work is managed.",
  },
  {
    id: "staking",
    event: "stakingExplanationViewed",
    href: "/expert/dashboard?openStaking=withdraw",
    title: "Staking",
    body: "Manage your stake from the dashboard: stake to unlock vetting, see what is locked by reviews, and request withdrawals when review windows settle.",
  },
  {
    id: "endorsements",
    event: "endorsementsVisited",
    href: "/expert/endorsements",
    title: "Endorsements",
    body: "Endorsements are separate from guild membership review. Use this page to inspect and back candidate signals.",
  },
  {
    id: "governance",
    event: "governanceVisited",
    href: "/expert/governance",
    title: "Governance",
    body: "Governance is where protocol and guild decisions appear when experts need to vote on proposals.",
  },
  {
    id: "earnings",
    event: "rewardsVisited",
    href: "/expert/earnings",
    title: "Earnings",
    body: "Earnings shows reward totals, payout history, and the financial outcome of completed review work.",
  },
  {
    id: "reputation",
    event: "reputationVisited",
    href: "/expert/reputation",
    title: "Reputation",
    body: "Reputation shows how consensus alignment, review outcomes, and activity affect your expert weight over time.",
  },
  {
    id: "notifications",
    event: "notificationsVisited",
    href: "/expert/notifications",
    title: "Notifications",
    body: "Notifications collect deadlines, assigned work, finalized outcomes, and other prompts that need attention.",
  },
];

export type DashboardTourCompletionAction =
  | "open-practice-review"
  | "start-page-guide"
  | "none";

export function getNextExpertSetupGuideStep(
  events: ExpertOnboardingChecklistEvents
): ExpertSetupGuideStep | null {
  return EXPERT_SETUP_GUIDE_STEPS.find((step) => !events[step.event]) ?? null;
}

export function getNextExpertSetupGuideStepAfter(
  currentStepId: string,
  events: ExpertOnboardingChecklistEvents
): ExpertSetupGuideStep | null {
  const currentIndex = EXPERT_SETUP_GUIDE_STEPS.findIndex(
    (step) => step.id === currentStepId
  );
  if (currentIndex < 0) return getNextExpertSetupGuideStep(events);

  return (
    EXPERT_SETUP_GUIDE_STEPS.slice(currentIndex + 1).find(
      (step) => !events[step.event]
    ) ?? null
  );
}

export function getDashboardTourCompletionAction({
  hasCompletedSetup,
  practiceReviewCompleted,
}: {
  hasCompletedSetup: boolean;
  practiceReviewCompleted: boolean;
}): DashboardTourCompletionAction {
  if (hasCompletedSetup) return "none";
  return practiceReviewCompleted ? "start-page-guide" : "open-practice-review";
}
