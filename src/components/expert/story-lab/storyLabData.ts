import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  type LucideIcon,
  ShieldCheck,
  Star,
  Users,
  Vote,
} from "lucide-react";
import { TOUR_TARGETS, type TourTargetValue } from "@/components/expert/onboarding/tourTargets";

export type StoryLabPage =
  | "dashboard"
  | "guilds"
  | "guildDetail"
  | "applications"
  | "review"
  | "notifications"
  | "earnings"
  | "reputation"
  | "endorsements"
  | "governance"
  | "complete";

export type StoryLabTarget =
  TourTargetValue;

export type StoryLabPlacement =
  | "auto"
  | "right"
  | "left"
  | "top"
  | "bottom"
  | "center";

export type StoryLabAdvanceCondition =
  | { kind: "target-visible" }
  | { kind: "user-click"; target: TourTargetValue };

export interface StoryLabSubStop {
  id: string;
  target: TourTargetValue;
  fallbackTarget?: TourTargetValue;
  placement?: StoryLabPlacement;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  advance?: StoryLabAdvanceCondition;
}

export interface StoryLabStep {
  id: string;
  page: StoryLabPage;
  route: string;
  navLabel: string;
  icon: LucideIcon;
  subStops: StoryLabSubStop[];
  dynamicRoute?: "firstGuild" | "firstReview";
  /** @deprecated use subStops[0].target — kept for driver compat until Task 2.3 */
  target: TourTargetValue;
  /** @deprecated */
  fallbackTarget?: TourTargetValue;
  /** @deprecated */
  title: string;
  /** @deprecated */
  eyebrow: string;
  /** @deprecated */
  body: string;
  /** @deprecated */
  detail: string;
  /** @deprecated */
  actionLabel: string;
}

export const STORY_LAB_STEPS: StoryLabStep[] = [
  {
    id: "overview",
    page: "dashboard",
    route: "/expert/dashboard",
    navLabel: "Dashboard",
    icon: ClipboardCheck,
    subStops: [
      {
        id: "overview",
        target: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Orientation",
        title: "Start with the expert loop",
        body:
          "The dashboard is the checkpoint, not the whole tour. It frames the work loop: guild context, applications, review, consensus, rewards, reputation, and governance.",
        detail:
          "This preview runs on the same expert routes you use after login, so the walkthrough can be judged against the actual page state.",
      },
    ],
    target: TOUR_TARGETS.dashboardOverview,
    title: "Start with the expert loop",
    eyebrow: "Orientation",
    body:
      "The dashboard is the checkpoint, not the whole tour. It frames the work loop: guild context, applications, review, consensus, rewards, reputation, and governance.",
    detail:
      "This preview runs on the same expert routes you use after login, so the walkthrough can be judged against the actual page state.",
    actionLabel: "Go to guilds",
  },
  {
    id: "guilds",
    page: "guilds",
    route: "/expert/guilds",
    navLabel: "Guilds",
    icon: Users,
    subStops: [
      {
        id: "guilds",
        target: TOUR_TARGETS.guildDirectory,
        placement: "auto",
        eyebrow: "Guild directory",
        title: "Guilds are where expertise is organized",
        body:
          "A guild is the expert group responsible for a domain. Your memberships decide which review work, endorsement markets, and governance issues are relevant to you.",
        detail:
          "This page shows your guilds, pending work signals, and the path into a guild's standards before you touch a candidate or expert application.",
      },
    ],
    target: TOUR_TARGETS.guildDirectory,
    title: "Guilds are where expertise is organized",
    eyebrow: "Guild directory",
    body:
      "A guild is the expert group responsible for a domain. Your memberships decide which review work, endorsement markets, and governance issues are relevant to you.",
    detail:
      "This page shows your guilds, pending work signals, and the path into a guild's standards before you touch a candidate or expert application.",
    actionLabel: "Open a guild",
  },
  {
    id: "guild-detail",
    page: "guildDetail",
    route: "/expert/guilds",
    dynamicRoute: "firstGuild",
    navLabel: "Guild Detail",
    icon: BadgeCheck,
    subStops: [
      {
        id: "guild-detail",
        target: TOUR_TARGETS.guildStandards,
        placement: "auto",
        eyebrow: "Guild detail",
        title: "Inspect guild standards before reviewing",
        body:
          "Before reviewing, an expert checks the guild context: member role, reputation, stake, review history, and what the guild considers acceptable evidence.",
        detail:
          "The story uses the real guild detail page so the user learns where standards and membership context live, not a detached explainer.",
      },
    ],
    target: TOUR_TARGETS.guildStandards,
    title: "Inspect guild standards before reviewing",
    eyebrow: "Guild detail",
    body:
      "Before reviewing, an expert checks the guild context: member role, reputation, stake, review history, and what the guild considers acceptable evidence.",
    detail:
      "The story uses the real guild detail page so the user learns where standards and membership context live, not a detached explainer.",
    actionLabel: "Go to applications",
  },
  {
    id: "applications",
    page: "applications",
    route: "/expert/voting",
    navLabel: "Applications",
    icon: FileCheck2,
    subStops: [
      {
        id: "applications",
        target: TOUR_TARGETS.applicationsOverview,
        placement: "auto",
        eyebrow: "Applications",
        title: "The review queue is the workbench",
        body:
          "This page collects assigned expert reviews, candidate reviews, proposals, and review history. The story adds one synthetic application so the flow works even when the real queue is empty.",
        detail:
          "Nothing here is submitted to the backend while story mode is active. It is a deterministic training scenario rendered inside the real queue layout.",
      },
    ],
    target: TOUR_TARGETS.applicationsOverview,
    title: "The review queue is the workbench",
    eyebrow: "Applications",
    body:
      "This page collects assigned expert reviews, candidate reviews, proposals, and review history. The story adds one synthetic application so the flow works even when the real queue is empty.",
    detail:
      "Nothing here is submitted to the backend while story mode is active. It is a deterministic training scenario rendered inside the real queue layout.",
    actionLabel: "Show story application",
  },
  {
    id: "application-card",
    page: "applications",
    route: "/expert/voting",
    navLabel: "Story Application",
    icon: FileCheck2,
    subStops: [
      {
        id: "application-card",
        target: TOUR_TARGETS.applicationReviewCard,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Assigned review",
        title: "Maya Chen is the story application",
        body:
          "The card shows what an expert scans before opening work: applicant, guild, current role, review count, deadline state, and whether this is still pending.",
        detail:
          "In a real queue this card would come from backend assignment. In story mode it is local fixture data so every new user sees the same learning arc.",
      },
    ],
    target: TOUR_TARGETS.applicationReviewCard,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Maya Chen is the story application",
    eyebrow: "Assigned review",
    body:
      "The card shows what an expert scans before opening work: applicant, guild, current role, review count, deadline state, and whether this is still pending.",
    detail:
      "In a real queue this card would come from backend assignment. In story mode it is local fixture data so every new user sees the same learning arc.",
    actionLabel: "Open review walkthrough",
  },
  {
    id: "review-evidence",
    page: "review",
    route: "/expert/voting",
    navLabel: "Practice Review",
    icon: ShieldCheck,
    subStops: [
      {
        id: "review-evidence",
        target: TOUR_TARGETS.practiceReviewProfile,
        fallbackTarget: TOUR_TARGETS.applicationReview,
        placement: "auto",
        eyebrow: "Review surface",
        title: "Start review by reading evidence",
        body:
          "The review opens in the real review modal, but in practice mode. First, read the applicant profile, resume/link evidence, motivation, and experience before touching the rubric.",
        detail:
          "This is fake story data. It will not sign, submit, download protected resumes, or mutate a real review.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewProfile,
    fallbackTarget: TOUR_TARGETS.applicationReview,
    title: "Start review by reading evidence",
    eyebrow: "Review surface",
    body:
      "The review opens in the real review modal, but in practice mode. First, read the applicant profile, resume/link evidence, motivation, and experience before touching the rubric.",
    detail:
      "This is fake story data. It will not sign, submit, download protected resumes, or mutate a real review.",
    actionLabel: "Show scoring rubric",
  },
  {
    id: "review-scoring",
    page: "review",
    route: "/expert/voting",
    navLabel: "Score Evidence",
    icon: ClipboardCheck,
    subStops: [
      {
        id: "review-scoring",
        target: TOUR_TARGETS.practiceReviewGeneralRubric,
        fallbackTarget: TOUR_TARGETS.applicationReview,
        placement: "auto",
        eyebrow: "Review mechanics",
        title: "Score evidence against the rubric",
        body:
          "The rubric turns subjective judgment into comparable evidence. Strong reviewers score what is proven, leave justification, and avoid rewarding vague claims.",
        detail:
          "This is where a new expert learns that review quality matters because the later consensus compares their judgment to the panel.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewGeneralRubric,
    fallbackTarget: TOUR_TARGETS.applicationReview,
    title: "Score evidence against the rubric",
    eyebrow: "Review mechanics",
    body:
      "The rubric turns subjective judgment into comparable evidence. Strong reviewers score what is proven, leave justification, and avoid rewarding vague claims.",
    detail:
      "This is where a new expert learns that review quality matters because the later consensus compares their judgment to the panel.",
    actionLabel: "Show red flags",
  },
  {
    id: "review-red-flags",
    page: "review",
    route: "/expert/voting",
    navLabel: "Red Flags",
    icon: ShieldCheck,
    subStops: [
      {
        id: "review-red-flags",
        target: TOUR_TARGETS.practiceReviewDomainRubric,
        fallbackTarget: TOUR_TARGETS.applicationReview,
        placement: "auto",
        eyebrow: "Risk check",
        title: "Record domain signal and red flags",
        body:
          "Domain topics capture specialized evidence. Red flags document risk separately, so a reviewer can say what is strong and what still needs proof.",
        detail:
          "The walkthrough should make clear that feedback is part of accountability: reviewers explain what evidence changed the score.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewDomainRubric,
    fallbackTarget: TOUR_TARGETS.applicationReview,
    title: "Record domain signal and red flags",
    eyebrow: "Risk check",
    body:
      "Domain topics capture specialized evidence. Red flags document risk separately, so a reviewer can say what is strong and what still needs proof.",
    detail:
      "The walkthrough should make clear that feedback is part of accountability: reviewers explain what evidence changed the score.",
    actionLabel: "Show commit behavior",
  },
  {
    id: "review-commit",
    page: "review",
    route: "/expert/voting",
    navLabel: "Commit",
    icon: ShieldCheck,
    subStops: [
      {
        id: "review-commit",
        target: TOUR_TARGETS.practiceReviewCommitReveal,
        fallbackTarget: TOUR_TARGETS.applicationReview,
        placement: "auto",
        eyebrow: "Blockchain mechanics",
        title: "Commit/reveal protects independent judgment",
        body:
          "Some reviews hide the score during voting so reviewers cannot copy one another. The chain stores the commitment, then the app reveals or finalizes eligible scores.",
        detail:
          "Story mode only simulates the explanation. It must never call a wallet, create a transaction, or submit a real review.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewCommitReveal,
    fallbackTarget: TOUR_TARGETS.applicationReview,
    title: "Commit/reveal protects independent judgment",
    eyebrow: "Blockchain mechanics",
    body:
      "Some reviews hide the score during voting so reviewers cannot copy one another. The chain stores the commitment, then the app reveals or finalizes eligible scores.",
    detail:
      "Story mode only simulates the explanation. It must never call a wallet, create a transaction, or submit a real review.",
    actionLabel: "Show simulated result",
  },
  {
    id: "review-result",
    page: "review",
    route: "/expert/voting",
    navLabel: "Review Result",
    icon: ShieldCheck,
    subStops: [
      {
        id: "review-result",
        target: TOUR_TARGETS.practiceReviewResult,
        fallbackTarget: TOUR_TARGETS.applicationReview,
        placement: "auto",
        eyebrow: "Practice result",
        title: "The practice judgment resolves safely",
        body:
          "Before the story leaves the review modal, it shows the safe result state: the walkthrough completed, but no review was submitted and no wallet action happened.",
        detail:
          "This bridges the learning moment between reviewing an applicant and seeing the downstream notification, reward, and reputation effects.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewResult,
    fallbackTarget: TOUR_TARGETS.applicationReview,
    title: "The practice judgment resolves safely",
    eyebrow: "Practice result",
    body:
      "Before the story leaves the review modal, it shows the safe result state: the walkthrough completed, but no review was submitted and no wallet action happened.",
    detail:
      "This bridges the learning moment between reviewing an applicant and seeing the downstream notification, reward, and reputation effects.",
    actionLabel: "Show result notification",
  },
  {
    id: "notification",
    page: "notifications",
    route: "/expert/notifications",
    navLabel: "Notifications",
    icon: Bell,
    subStops: [
      {
        id: "notification",
        target: TOUR_TARGETS.notificationResultCard,
        fallbackTarget: TOUR_TARGETS.notificationsList,
        placement: "auto",
        eyebrow: "Result",
        title: "Consensus result arrives",
        body:
          "After the review, the user should see a concrete result: the application passed, the vote aligned with consensus, and the next effects are reward and reputation.",
        detail:
          "The notification is synthetic in story mode, but it is rendered in the real notifications list so the destination is memorable.",
      },
    ],
    target: TOUR_TARGETS.notificationResultCard,
    fallbackTarget: TOUR_TARGETS.notificationsList,
    title: "Consensus result arrives",
    eyebrow: "Result",
    body:
      "After the review, the user should see a concrete result: the application passed, the vote aligned with consensus, and the next effects are reward and reputation.",
    detail:
      "The notification is synthetic in story mode, but it is rendered in the real notifications list so the destination is memorable.",
    actionLabel: "Open earnings",
  },
  {
    id: "earnings",
    page: "earnings",
    route: "/expert/earnings",
    navLabel: "Rewards",
    icon: CircleDollarSign,
    subStops: [
      {
        id: "earnings",
        target: TOUR_TARGETS.earningsRewardRow,
        fallbackTarget: TOUR_TARGETS.earningsTimeline,
        placement: "auto",
        eyebrow: "Reward mechanics",
        title: "Reward is posted in Earnings",
        body:
          "The story reward appears as a real timeline row: an aligned review earned VETD. This is where experts later distinguish pending, claimable, and historical rewards.",
        detail:
          "The row is fake and read-only, but it teaches the causal link: review quality -> consensus alignment -> reward.",
      },
    ],
    target: TOUR_TARGETS.earningsRewardRow,
    fallbackTarget: TOUR_TARGETS.earningsTimeline,
    title: "Reward is posted in Earnings",
    eyebrow: "Reward mechanics",
    body:
      "The story reward appears as a real timeline row: an aligned review earned VETD. This is where experts later distinguish pending, claimable, and historical rewards.",
    detail:
      "The row is fake and read-only, but it teaches the causal link: review quality -> consensus alignment -> reward.",
    actionLabel: "Open reputation",
  },
  {
    id: "reputation",
    page: "reputation",
    route: "/expert/reputation",
    navLabel: "Reputation",
    icon: Star,
    subStops: [
      {
        id: "reputation",
        target: TOUR_TARGETS.reputationDeltaRow,
        fallbackTarget: TOUR_TARGETS.reputationTimeline,
        placement: "auto",
        eyebrow: "Reputation ledger",
        title: "Reputation changes explain judgment quality",
        body:
          "The same review creates a reputation event. Reputation is the durable record of judgment quality, not just a profile number.",
        detail:
          "This page is where the user can later audit why their rank, vote weight, and credibility changed.",
      },
    ],
    target: TOUR_TARGETS.reputationDeltaRow,
    fallbackTarget: TOUR_TARGETS.reputationTimeline,
    title: "Reputation changes explain judgment quality",
    eyebrow: "Reputation ledger",
    body:
      "The same review creates a reputation event. Reputation is the durable record of judgment quality, not just a profile number.",
    detail:
      "This page is where the user can later audit why their rank, vote weight, and credibility changed.",
    actionLabel: "Open endorsements",
  },
  {
    id: "endorsement",
    page: "endorsements",
    route: "/expert/endorsements",
    navLabel: "Endorsements",
    icon: BriefcaseBusiness,
    subStops: [
      {
        id: "endorsement",
        target: TOUR_TARGETS.endorsementCandidateCard,
        fallbackTarget: TOUR_TARGETS.endorsementMarketplace,
        placement: "auto",
        eyebrow: "Job candidate",
        title: "Endorsement is a different kind of backing",
        body:
          "Endorsement is not guild membership review. Here an expert backs a job candidate after guild signal exists, putting reputation and capital behind a hiring outcome.",
        detail:
          "The story candidate is fake and the button is non-mutating in story mode. The purpose is to show where endorsement opportunities live.",
      },
    ],
    target: TOUR_TARGETS.endorsementCandidateCard,
    fallbackTarget: TOUR_TARGETS.endorsementMarketplace,
    title: "Endorsement is a different kind of backing",
    eyebrow: "Job candidate",
    body:
      "Endorsement is not guild membership review. Here an expert backs a job candidate after guild signal exists, putting reputation and capital behind a hiring outcome.",
    detail:
      "The story candidate is fake and the button is non-mutating in story mode. The purpose is to show where endorsement opportunities live.",
    actionLabel: "Open governance",
  },
  {
    id: "governance",
    page: "governance",
    route: "/expert/governance",
    navLabel: "Governance",
    icon: Vote,
    subStops: [
      {
        id: "governance",
        target: TOUR_TARGETS.governanceProposalCard,
        fallbackTarget: TOUR_TARGETS.governanceProposals,
        placement: "auto",
        eyebrow: "Protocol decisions",
        title: "Guild decisions live in Governance",
        body:
          "Not every expert action is about one applicant. Governance is where experts change standards, quorum, reward rules, and guild operations.",
        detail:
          "This closes the arc: experts review people, endorse hiring outcomes, and govern the rules of the system.",
      },
    ],
    target: TOUR_TARGETS.governanceProposalCard,
    fallbackTarget: TOUR_TARGETS.governanceProposals,
    title: "Guild decisions live in Governance",
    eyebrow: "Protocol decisions",
    body:
      "Not every expert action is about one applicant. Governance is where experts change standards, quorum, reward rules, and guild operations.",
    detail:
      "This closes the arc: experts review people, endorse hiring outcomes, and govern the rules of the system.",
    actionLabel: "Finish story",
  },
  {
    id: "complete",
    page: "complete",
    route: "/expert/dashboard",
    navLabel: "Complete",
    icon: CheckCircle2,
    subStops: [
      {
        id: "complete",
        target: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Ready for real work",
        title: "The full expert story now makes sense",
        body:
          "The expert has seen the full arc across the real app surfaces: guild context, review, consensus, rewards, reputation, endorsements, and governance.",
        detail:
          "In production, this final step should mark onboarding complete and disappear. The preview remains available for iteration.",
      },
    ],
    target: TOUR_TARGETS.dashboardOverview,
    title: "The full expert story now makes sense",
    eyebrow: "Ready for real work",
    body:
      "The expert has seen the full arc across the real app surfaces: guild context, review, consensus, rewards, reputation, endorsements, and governance.",
    detail:
      "In production, this final step should mark onboarding complete and disappear. The preview remains available for iteration.",
    actionLabel: "Exit preview",
  },
];

export const STORY_LAB_QUERY = {
  mode: "storyLab",
  step: "storyStep",
  subStep: "storySub",
  completion: "storyLabComplete",
  value: "expert",
} as const;

export const STORY_LAB_COMPLETION_SESSION_KEY =
  "vetted:expert-story-lab:completion-ready";

export const STORY_LAB_DOM = {
  guildId: "data-story-lab-guild-id",
  reviewUrl: "data-story-lab-review-url",
} as const;

export function getStoryLabStepIndex(stepId: string | null | undefined): number {
  const index = STORY_LAB_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

export function canAdvanceStoryLabSubStop(
  subStop: StoryLabSubStop,
  resolvedTarget: TourTargetValue | null,
): boolean {
  return resolvedTarget === subStop.target;
}

export function canAdvanceStoryLabStep(
  step: StoryLabStep,
  resolvedTarget: StoryLabTarget | null
): boolean {
  return canAdvanceStoryLabSubStop(step.subStops[0], resolvedTarget);
}

export function getStoryLabRoutes(): string[] {
  return STORY_LAB_STEPS.map((step) => step.route);
}

export function buildStoryLabRoute(
  route: string,
  stepId: string,
  subStopId?: string,
): string {
  const [pathnameWithMaybeHash, hash = ""] = route.split("#", 2);
  const [pathname, query = ""] = pathnameWithMaybeHash.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(STORY_LAB_QUERY.mode, STORY_LAB_QUERY.value);
  params.set(STORY_LAB_QUERY.step, stepId);
  if (subStopId) params.set(STORY_LAB_QUERY.subStep, subStopId);

  const queryString = params.toString();
  return `${pathname}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}

export function getStoryLabLaunchRoute(): string {
  const firstStep = STORY_LAB_STEPS[0];
  return buildStoryLabRoute(firstStep.route, firstStep.id);
}

export function getStoryLabCompletionRoute(): string {
  const params = new URLSearchParams();
  params.set(STORY_LAB_QUERY.completion, STORY_LAB_QUERY.value);
  return `/expert/dashboard?${params.toString()}`;
}

export function isExpertStoryLabSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return searchParams.get(STORY_LAB_QUERY.mode) === STORY_LAB_QUERY.value;
}

export function isExpertStoryLabCompletionSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return searchParams.get(STORY_LAB_QUERY.completion) === STORY_LAB_QUERY.value;
}

export function markStoryLabCompletionReady(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORY_LAB_COMPLETION_SESSION_KEY, String(Date.now()));
  } catch {
    // Ignore unavailable session storage.
  }
}

export function consumeStoryLabCompletionReady(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const rawValue = window.sessionStorage.getItem(STORY_LAB_COMPLETION_SESSION_KEY);
    window.sessionStorage.removeItem(STORY_LAB_COMPLETION_SESSION_KEY);
    const timestamp = rawValue ? Number(rawValue) : 0;
    return Number.isFinite(timestamp) && Date.now() - timestamp < 60_000;
  } catch {
    return false;
  }
}

export const STORY_LAB_ACTUAL_ACTION_STEPS = [] as const;

export const STORY_LAB_COMPLETION_SIGNAL = {
  dataSource: "authenticated expert session",
  routeMode: "real expert routes",
  mutationMode: "read-only story fixtures",
} as const;
