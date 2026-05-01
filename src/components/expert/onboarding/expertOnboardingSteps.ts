import { TOUR_TARGETS } from "./tourTargets";
import type { TourStep } from "./ExpertOnboardingTour";

export const EXPERT_ONBOARDING_STEPS = [
  {
    id: "dashboard-overview",
    title: "Your expert command center",
    body: "Start here to see assigned reviews, staking status, reputation, rewards, and anything that needs attention.",
    targets: [TOUR_TARGETS.dashboardOverview],
  },
  {
    id: "practice-review",
    title: "Start with a practice review",
    body: "Use the sandbox review before touching real queues. It walks through evidence, scoring, red flags, feedback, and commit/reveal without submitting anything.",
    targets: [TOUR_TARGETS.practiceReviewCta],
    fallbackTargets: [TOUR_TARGETS.onboardingChecklist],
    actionLabel: "Open practice review",
  },
  {
    id: "expert-navigation",
    title: "Use the expert navigation",
    body: "Desktop navigation keeps applications, guilds, governance, earnings, and reputation close by. On mobile, use the menu button.",
    targets: [TOUR_TARGETS.desktopSidebar, TOUR_TARGETS.mobileNav],
  },
  {
    id: "review-queue",
    title: "Find real assigned reviews",
    body: "Applications and proposals assigned to you appear in the review queue. Practice mode is only training; real candidate outcomes start here.",
    targets: [TOUR_TARGETS.reviewQueue],
  },
  {
    id: "staking-requirement",
    title: "Check staking requirements",
    body: "Some reviews require VETD stake. If an action is locked, the staking status explains what is missing.",
    targets: [TOUR_TARGETS.stakingStatus],
  },
  {
    id: "commit-reveal",
    title: "Commit first, reveal automatically",
    body: "Commit/reveal rounds hide scores during voting. Commit blind; the app and backend reveal or finalize when the round is ready.",
    targets: [TOUR_TARGETS.commitReveal],
    fallbackTargets: [TOUR_TARGETS.reviewQueue],
  },
  {
    id: "notifications",
    title: "Watch notifications",
    body: "Assignments, review updates, reveal windows, and rewards surface in the notification bell.",
    targets: [TOUR_TARGETS.notifications],
  },
  {
    id: "rewards-reputation",
    title: "Track rewards and reputation",
    body: "Aligned reviews improve reputation and unlock rewards. Use earnings and reputation once outcomes finalize.",
    targets: [TOUR_TARGETS.rewardsSummary],
  },
] as const satisfies readonly TourStep[];
