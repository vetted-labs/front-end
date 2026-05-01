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

export interface StoryLabNavTrigger {
  /** Tour target on the sidebar nav item the user must click. */
  target: TourTargetValue;
  /** Sidebar label shown in the popover instruction (e.g. "My Guilds"). */
  label: string;
  /** Pathname prefix that means the user has navigated successfully. */
  matchPathname: string;
}

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
  /**
   * If set, the popover anchors to the named sidebar nav target and replaces
   * the primary advance button with an instruction telling the user to click
   * that nav item. The walkthrough advances when the URL pathname starts with
   * `matchPathname`.
   */
  navTrigger?: StoryLabNavTrigger;
}

export interface StoryLabStep {
  id: string;
  page: StoryLabPage;
  route: string;
  navLabel: string;
  icon: LucideIcon;
  subStops: StoryLabSubStop[];
  dynamicRoute?: "firstGuild" | "firstReview";
  /** @deprecated use subStops[0].target — kept for driver compat */
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
  /** @deprecated — driver uses this on the LAST substop of the step as the
   * primary button label (the click that navigates to the next page). All
   * intermediate substops show "Continue" instead, set in the driver. */
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
        eyebrow: "Welcome",
        title: "This is your home base for review work",
        body:
          "Everything you need — reviews waiting, rewards earned, reputation, deadlines — lives on one page so you can pick up where you left off.",
        detail:
          "A quick walkthrough now will save you guessing later when real work lands.",
      },
      {
        id: "stats-row",
        target: TOUR_TARGETS.dashboardStatsRow,
        fallbackTarget: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "At a glance",
        title: "Five numbers tell you how you're doing",
        body:
          "Reputation, earnings, stake, reviews completed, and vote weight. Together they show what you've earned and how much your voice counts.",
        detail:
          "Each number updates the moment a review you scored finalizes.",
      },
      {
        id: "reputation-stat",
        target: TOUR_TARGETS.dashboardReputationStat,
        fallbackTarget: TOUR_TARGETS.dashboardStatsRow,
        placement: "auto",
        eyebrow: "Reputation",
        title: "Reputation is your weight on the panel",
        body:
          "It rises when your scores agree with consensus and slips if you go quiet or score sloppily. A small dot warns you when decay is about to bite.",
        detail:
          "Higher reputation means more weight on every vote you cast.",
      },
      {
        id: "earnings-stat",
        target: TOUR_TARGETS.rewardsSummary,
        fallbackTarget: TOUR_TARGETS.dashboardStatsRow,
        placement: "auto",
        eyebrow: "Earnings",
        title: "Aligned reviews pay you in VETD",
        body:
          "Every time the panel finalizes a review you scored, your share lands here. Out-of-step scores don't earn.",
        detail:
          "Click through later to see each reward tied back to the review that produced it.",
      },
      {
        id: "review-queue",
        target: TOUR_TARGETS.dashboardReviewQueue,
        fallbackTarget: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Your queue",
        title: "Pending reviews show up right here",
        body:
          "Assignments land in this list as deadlines approach, ordered by what's due first. You can jump into a review with one click.",
        detail:
          "When the queue is empty, the dashboard nudges you toward open work.",
      },
      {
        id: "guilds-and-stake",
        target: TOUR_TARGETS.dashboardGuildsSection,
        fallbackTarget: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Your guilds",
        title: "Each guild you stake in is listed here",
        body:
          "This card shows the guilds you belong to, your rank in each, and how much VETD you've staked behind your work.",
        detail:
          "Your stake earns more when you review well and is at risk when you don't.",
        navTrigger: {
          target: TOUR_TARGETS.navGuilds,
          label: "My Guilds",
          matchPathname: "/expert/guilds",
        },
      },
    ],
    target: TOUR_TARGETS.dashboardOverview,
    title: "This is your home base for review work",
    eyebrow: "Welcome",
    body:
      "Everything you need — reviews waiting, rewards earned, reputation, deadlines — lives on one page so you can pick up where you left off.",
    detail:
      "A quick walkthrough now will save you guessing later when real work lands.",
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
        id: "guilds-overview",
        target: TOUR_TARGETS.guildDirectory,
        placement: "auto",
        eyebrow: "Your guilds",
        title: "These are the guilds you belong to",
        body:
          "Each card is one guild — the domain you review in. Your guilds decide which applications, endorsements, and votes show up for you.",
        detail:
          "Cards with pending work float to the top so urgent reviews never hide at the bottom.",
      },
      {
        id: "guilds-action-required",
        target: TOUR_TARGETS.guildsActionRequired,
        fallbackTarget: TOUR_TARGETS.guildDirectory,
        placement: "auto",
        eyebrow: "Pending work",
        title: "Guilds with reviews waiting on you surface here first",
        body:
          "Any guild with applications in your queue gets pinned to this panel with a count and a one-click jump into the review.",
        detail:
          "Hit Review All to take everything in one sitting, or open a single guild row to focus.",
      },
      {
        id: "guilds-card-stats",
        target: TOUR_TARGETS.guildCardStats,
        fallbackTarget: TOUR_TARGETS.guildCardItem,
        placement: "auto",
        eyebrow: "Your standing",
        title: "Three numbers tell you where you stand in this guild",
        body:
          "Staked is the VETD you've put behind your judgment here, Earned is what aligned reviews have paid you, and Rep is how heavily your vote weighs in this guild.",
        detail:
          "All three are scoped to this guild only — your numbers in Engineering are independent of your numbers in Design.",
      },
      {
        id: "guilds-join-cta",
        target: TOUR_TARGETS.guildsJoinCta,
        fallbackTarget: TOUR_TARGETS.guildDirectory,
        placement: "auto",
        eyebrow: "Expand your reach",
        title: "Join another guild when you're ready to review more domains",
        body:
          "Join Guild opens the directory of every guild you don't already belong to, so you can apply with the credentials you already have.",
        detail:
          "New guilds start you at zero rep in that domain — your other guild reputations stay intact.",
      },
    ],
    target: TOUR_TARGETS.guildDirectory,
    title: "These are the guilds you belong to",
    eyebrow: "Your guilds",
    body:
      "Each card is one guild — the domain you review in. Your guilds decide which applications, endorsements, and votes show up for you.",
    detail:
      "Cards with pending work float to the top so urgent reviews never hide at the bottom.",
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
        id: "standards-overview",
        target: TOUR_TARGETS.guildStandards,
        placement: "auto",
        eyebrow: "Inside the guild",
        title: "This is the bar you uphold",
        body:
          "This panel describes who the guild is and what it expects from new members. Skim it before you score — your reviews should match this standard.",
        detail:
          "Consistency across the panel comes from everyone reading the same standard.",
      },
      {
        id: "your-role",
        target: TOUR_TARGETS.guildYourPosition,
        fallbackTarget: TOUR_TARGETS.guildStandards,
        placement: "auto",
        eyebrow: "Your role here",
        title: "Your rank inside this guild",
        body:
          "Your reputation and rank in this guild decide how much your vote weighs and which reviews you can take. Higher ranks unlock harder calls.",
        detail:
          "Reputation is per-guild — being a master in one does not carry into another.",
      },
      {
        id: "stake-widget",
        target: TOUR_TARGETS.guildStakeWidget,
        fallbackTarget: TOUR_TARGETS.guildYourPosition,
        placement: "auto",
        eyebrow: "Skin in the game",
        title: "Your VETD locked here",
        body:
          "You stake VETD in the guild to unlock reviewing. Staying aligned with the panel returns it with rewards; sloppy or out-of-step votes cost you.",
        detail:
          "If your stake drops below the minimum, reviewing pauses until you top it back up.",
      },
      {
        id: "recent-activity",
        target: TOUR_TARGETS.guildPostFeed,
        fallbackTarget: TOUR_TARGETS.guildStandards,
        placement: "auto",
        eyebrow: "What's moving",
        title: "Catch up on the discussion",
        body:
          "Posts from members live here — calibration debates, rubric questions, and notes on tricky applicants. Skim recent ones before you review.",
        detail:
          "If you are unsure about a score, this is where the panel works it out together.",
      },
      {
        id: "start-reviewing",
        target: TOUR_TARGETS.guildStartReviewing,
        fallbackTarget: TOUR_TARGETS.guildStandards,
        placement: "auto",
        eyebrow: "Pick one up",
        title: "Open an application to start reviewing",
        body:
          "Each card is one applicant waiting on your vote. Open one to read their evidence and score against the rubric.",
        detail:
          "You will walk through that flow next.",
        navTrigger: {
          target: TOUR_TARGETS.navApplications,
          label: "Applications",
          matchPathname: "/expert/voting",
        },
      },
    ],
    target: TOUR_TARGETS.guildStandards,
    title: "This is the bar you uphold",
    eyebrow: "Inside the guild",
    body:
      "This panel describes who the guild is and what it expects from new members. Skim it before you score — your reviews should match this standard.",
    detail:
      "Consistency across the panel comes from everyone reading the same standard.",
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
        id: "applications-overview",
        target: TOUR_TARGETS.applicationsOverview,
        placement: "auto",
        eyebrow: "Your queue",
        title: "This is your review workbench",
        body:
          "Every assignment you owe — guild applications, candidate reviews, and proposals — collects on this page. You will work through them from the top down.",
        detail:
          "Stats up here tell you what is pending versus what is already done.",
      },
      {
        id: "applications-stats",
        target: TOUR_TARGETS.applicationsStats,
        fallbackTarget: TOUR_TARGETS.applicationsOverview,
        placement: "bottom",
        eyebrow: "At a glance",
        title: "Your numbers, before you dig in",
        body:
          "Pending tells you what is waiting on your score, To Vote tracks open proposals, Completed is your finished work, and Guilds is where you can act.",
        detail:
          "If pending is zero, you are caught up.",
      },
      {
        id: "applications-tabs",
        target: TOUR_TARGETS.applicationsTabs,
        fallbackTarget: TOUR_TARGETS.applicationsOverview,
        placement: "bottom",
        eyebrow: "Switch surfaces",
        title: "Four queues, one page",
        body:
          "Expert Reviews are people applying to your guilds. Candidate Reviews are people applying to jobs. Proposals are guild rule changes. History is everything you've already done.",
        detail:
          "The badge on each tab is the count waiting on you.",
      },
      {
        id: "applications-assignment-filter",
        target: TOUR_TARGETS.applicationsAssignmentToggle,
        fallbackTarget: TOUR_TARGETS.applicationsOverview,
        placement: "bottom",
        eyebrow: "Yours vs. everything",
        title: "Assigned shows what is on your plate",
        body:
          "Assigned narrows the list to reviews where the panel is waiting on you. Switch to All to see everything moving through the guild, even items you don't owe.",
        detail:
          "Default to Assigned to stay focused on real obligations.",
      },
      {
        id: "applications-queue",
        target: TOUR_TARGETS.applicationsQueue,
        fallbackTarget: TOUR_TARGETS.applicationsOverview,
        placement: "auto",
        eyebrow: "The queue",
        title: "Each row is one assignment",
        body:
          "Items are ordered by deadline so the most urgent work sits at the top. When this list is empty, you are caught up — that is the goal.",
        detail:
          "Open the next card to see what an individual assignment looks like.",
      },
    ],
    target: TOUR_TARGETS.applicationsOverview,
    title: "This is your review workbench",
    eyebrow: "Your queue",
    body:
      "Every assignment you owe — guild applications, candidate reviews, and proposals — collects on this page. You will work through them from the top down.",
    detail:
      "Stats up here tell you what is pending versus what is already done.",
    actionLabel: "Open Maya's application",
  },
  {
    id: "application-card",
    page: "applications",
    route: "/expert/voting",
    navLabel: "Application",
    icon: FileCheck2,
    subStops: [
      {
        id: "card-identity",
        target: TOUR_TARGETS.applicationCardIdentity,
        fallbackTarget: TOUR_TARGETS.applicationReviewCard,
        placement: "right",
        eyebrow: "Who is applying",
        title: "Maya Chen, the applicant",
        body:
          "The avatar and name identify the person whose work you are about to score. Click the row to open their full evidence packet.",
        detail:
          "Names link to a profile so you can sanity-check identity before reviewing.",
      },
      {
        id: "card-level",
        target: TOUR_TARGETS.applicationCardLevel,
        fallbackTarget: TOUR_TARGETS.applicationReviewCard,
        placement: "bottom",
        eyebrow: "The bar",
        title: "The level she is applying at",
        body:
          "This pill shows the seniority Maya is claiming. Score her against that bar — Senior evidence is judged differently than Junior.",
        detail:
          "Mismatched level is itself something to flag.",
      },
      {
        id: "card-progress",
        target: TOUR_TARGETS.applicationCardProgress,
        fallbackTarget: TOUR_TARGETS.applicationReviewCard,
        placement: "top",
        eyebrow: "Panel progress",
        title: "How many reviewers have weighed in",
        body:
          "This counter shows how many panel members have already submitted. Your review pushes it toward the quorum the guild requires.",
        detail:
          "A low count means your score carries more weight in the final outcome.",
      },
      {
        id: "card-deadline",
        target: TOUR_TARGETS.applicationCardDeadline,
        fallbackTarget: TOUR_TARGETS.applicationCardProgress,
        placement: "top",
        eyebrow: "Time pressure",
        title: "How long you have left",
        body:
          "The countdown is the commit-phase deadline. Miss it and the panel finalizes without your score, which costs you reputation.",
        detail:
          "Cards are sorted so the most urgent timer floats to the top of the queue.",
      },
      {
        id: "card-cta",
        target: TOUR_TARGETS.applicationCardCta,
        fallbackTarget: TOUR_TARGETS.applicationReviewCard,
        placement: "left",
        eyebrow: "Open it",
        title: "Click Review to start scoring",
        body:
          "This is how you enter the evidence packet and rubric. After you submit, this button becomes a View link to the score you committed.",
        detail:
          "Open Maya's now to see what scoring looks like.",
      },
    ],
    target: TOUR_TARGETS.applicationReviewCard,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Maya Chen, the applicant",
    eyebrow: "Who is applying",
    body:
      "The avatar and name identify the person whose work you are about to score. Click the row to open their full evidence packet.",
    detail:
      "Names link to a profile so you can sanity-check identity before reviewing.",
    actionLabel: "Open review walkthrough",
  },
  {
    id: "review-evidence",
    page: "review",
    route: "/expert/voting",
    navLabel: "Read Evidence",
    icon: ShieldCheck,
    subStops: [
      {
        id: "evidence-overview",
        target: TOUR_TARGETS.practiceReviewProfile,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Read first",
        title: "Start with the evidence",
        body:
          "Skim the whole profile before you score. The cleanest reviews come from anchoring on what was actually submitted, not on a number you set in advance.",
        detail:
          "You will work top-to-bottom: header, motivation, expertise, links, then the resume.",
      },
      {
        id: "evidence-motivation",
        target: TOUR_TARGETS.practiceReviewMotivation,
        fallbackTarget: TOUR_TARGETS.practiceReviewProfile,
        placement: "right",
        eyebrow: "Why they applied",
        title: "Read the motivation in their words",
        body:
          "A strong motivation names a specific problem the applicant wants to work on with the guild. Generic enthusiasm is a weak signal — concrete projects, references, or trade-offs are strong ones.",
        detail:
          "Bio sits next to motivation when present and gives you a fuller picture.",
      },
      {
        id: "evidence-expertise",
        target: TOUR_TARGETS.practiceReviewExpertise,
        fallbackTarget: TOUR_TARGETS.practiceReviewProfile,
        placement: "top",
        eyebrow: "Self-claimed skills",
        title: "Note the claimed expertise areas",
        body:
          "These are the skills the applicant chose to put forward. Treat them as a checklist you will verify against the resume and the rubric answers — not as proof on their own.",
        detail:
          "Mismatches between this list and the resume are worth flagging later.",
      },
      {
        id: "evidence-links",
        target: TOUR_TARGETS.practiceReviewLinks,
        fallbackTarget: TOUR_TARGETS.practiceReviewProfile,
        placement: "bottom",
        eyebrow: "External proof",
        title: "Open at least one link",
        body:
          "Resume, LinkedIn, and portfolio links are where the work lives. Open the ones that match the level claim — code samples for engineers, case studies for designers, a track record for leads.",
        detail:
          "Each link opens in a new tab so you can keep the modal open beside it.",
      },
      {
        id: "evidence-ready-to-score",
        target: TOUR_TARGETS.practiceReviewProfile,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "You've read enough",
        title: "Form your opinion before opening the rubric",
        body:
          "Decide where this applicant lands in your head — strong, borderline, weak — before you advance. The rubric is for translating that judgment into points, not for forming it.",
        detail:
          "Hit Next when you have a working opinion.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewProfile,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Start with the evidence",
    eyebrow: "Read first",
    body:
      "Skim the whole profile before you score. The cleanest reviews come from anchoring on what was actually submitted, not on a number you set in advance.",
    detail:
      "You will work top-to-bottom: header, motivation, expertise, links, then the resume.",
    actionLabel: "Show scoring rubric",
  },
  {
    id: "review-scoring",
    page: "review",
    route: "/expert/voting",
    navLabel: "Score",
    icon: ClipboardCheck,
    subStops: [
      {
        id: "scoring-overview",
        target: TOUR_TARGETS.practiceReviewGeneralRubric,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Score the work",
        title: "The general rubric runs first",
        body:
          "General questions cover judgment, communication, and craft — the things every member of this guild needs regardless of level. Each question carries its own points and its own justification.",
        detail:
          "Score per question, then move to domain in step 3.",
      },
      {
        id: "scoring-criteria",
        target: TOUR_TARGETS.practiceReviewCriteria,
        fallbackTarget: TOUR_TARGETS.practiceReviewGeneralRubric,
        placement: "right",
        eyebrow: "Break it down",
        title: "Each question splits into criteria",
        body:
          "A question rarely scores as one number. The rubric splits it into criteria — clarity, depth, evidence — so you score each piece on its own and the totals add up.",
        detail:
          "Max points per criterion show in muted text next to the label.",
      },
      {
        id: "scoring-buttons",
        target: TOUR_TARGETS.practiceReviewScoreButtons,
        fallbackTarget: TOUR_TARGETS.practiceReviewCriteria,
        placement: "bottom",
        eyebrow: "Set the score",
        title: "Tap a number to score",
        body:
          "Pick the value that matches the evidence — not the one that splits the difference. A 0 means missing, a max means clear and complete.",
        detail:
          "Click again on the same number to clear it.",
      },
      {
        id: "scoring-justification",
        target: TOUR_TARGETS.practiceReviewJustification,
        fallbackTarget: TOUR_TARGETS.practiceReviewCriteria,
        placement: "top",
        eyebrow: "Required note",
        title: "Justify every score in one line",
        body:
          "One concrete sentence is enough — quote a phrase, point at a missing piece, name the trade-off. Reviews without a justification cannot be submitted.",
        detail:
          "Other reviewers and the applicant only ever see the score plus your note.",
      },
      {
        id: "scoring-guide",
        target: TOUR_TARGETS.practiceReviewInterpretationGuide,
        fallbackTarget: TOUR_TARGETS.practiceReviewGeneralRubric,
        placement: "top",
        eyebrow: "When you're unsure",
        title: "The guide tells you what each band means",
        body:
          "Score ranges map to plain-English bands — strong, mixed, weak. When two scores feel equally defensible, the guide is the tiebreaker.",
        detail:
          "Bands are the same ones the rest of the panel sees.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewGeneralRubric,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "The general rubric runs first",
    eyebrow: "Score the work",
    body:
      "General questions cover judgment, communication, and craft — the things every member of this guild needs regardless of level. Each question carries its own points and its own justification.",
    detail:
      "Score per question, then move to domain in step 3.",
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
        id: "domain-overview",
        target: TOUR_TARGETS.practiceReviewDomainRubric,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Domain & risk",
        title: "Now score the deep, specialized signal",
        body:
          "Domain topics test the work that only this guild can judge. You will score each topic on a five-point scale, justify it, then mark any red flags before you submit.",
        detail:
          "Step 3 mixes scoring and risk in one screen.",
      },
      {
        id: "domain-look-for",
        target: TOUR_TARGETS.practiceReviewWhatToLookFor,
        fallbackTarget: TOUR_TARGETS.practiceReviewTopicCard,
        placement: "right",
        eyebrow: "Calibration",
        title: "Use the \"what to look for\" list",
        body:
          "This is the guild's own checklist for the topic. If the answer hits two of three items clearly, that is your 3-4 band; all three with depth is a 5.",
        detail:
          "The four-tile grid below maps each band to the behavior that earns it.",
      },
      {
        id: "domain-red-flags",
        target: TOUR_TARGETS.practiceReviewRedFlagList,
        fallbackTarget: TOUR_TARGETS.practiceReviewDomainRubric,
        placement: "top",
        eyebrow: "Risk separately",
        title: "Mark red flags as deductions",
        body:
          "Red flags capture concerns scoring can't — fabricated claims, hostile tone, missing core experience. Each flag carries a fixed point deduction defined by the guild.",
        detail:
          "Toggling a flag updates the deductions tile in real time.",
      },
      {
        id: "domain-deductions",
        target: TOUR_TARGETS.practiceReviewOverallSummary,
        fallbackTarget: TOUR_TARGETS.practiceReviewDomainRubric,
        placement: "top",
        eyebrow: "How it stacks",
        title: "General + Domain - Deductions = Overall",
        body:
          "This card shows how the three numbers combine into the overall score the panel will compare. Deductions can pull a strong score below the line, which is exactly the point.",
        detail:
          "Overall never drops below zero.",
      },
      {
        id: "domain-feedback",
        target: TOUR_TARGETS.practiceReviewFeedback,
        fallbackTarget: TOUR_TARGETS.practiceReviewDomainRubric,
        placement: "top",
        eyebrow: "Optional",
        title: "Leave feedback the applicant can read",
        body:
          "Justifications stay internal to the panel. This box is the only message the applicant sees, so use it to point at one or two things they could improve.",
        detail:
          "1000-character limit, optional but encouraged.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewDomainRubric,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Now score the deep, specialized signal",
    eyebrow: "Domain & risk",
    body:
      "Domain topics test the work that only this guild can judge. You will score each topic on a five-point scale, justify it, then mark any red flags before you submit.",
    detail:
      "Step 3 mixes scoring and risk in one screen.",
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
        id: "commit-overview",
        target: TOUR_TARGETS.practiceReviewCommitReveal,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Submit privately",
        title: "Your score is sealed before the panel sees it",
        body:
          "When you submit, your score is hashed and locked on-chain. Other reviewers can't read it until everyone has committed, which keeps each review independent.",
        detail:
          "This is the same flow real assignments use.",
      },
      {
        id: "commit-stake",
        target: TOUR_TARGETS.practiceReviewStakeInput,
        fallbackTarget: TOUR_TARGETS.practiceReviewCommitReveal,
        placement: "top",
        eyebrow: "Skin in the game",
        title: "Stake VETD on your score",
        body:
          "Staking ties your reputation and tokens to this review. Aligned scores grow your stake; out-of-step ones shrink it. The minimum is set by the guild.",
        detail:
          "The field is pre-filled at the minimum so you can submit without thinking about the amount.",
      },
      {
        id: "commit-button",
        target: TOUR_TARGETS.practiceReviewSubmitButton,
        fallbackTarget: TOUR_TARGETS.practiceReviewCommitReveal,
        placement: "top",
        eyebrow: "Send it",
        title: "Submit locks your score in",
        body:
          "Pressing Submit hashes your score, opens your wallet, and posts the commit. After this point you can leave the page — reveal is automatic when the panel finishes.",
        detail:
          "Hit it when you're ready and we'll move on to the result.",
      },
      {
        id: "commit-after-submit",
        target: TOUR_TARGETS.practiceReviewCommitReveal,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "After submit",
        title: "Reveal happens on its own",
        body:
          "Once every assigned reviewer has committed, scores reveal at the same time and the panel finalizes. You don't have to come back to trigger it.",
        detail:
          "A notification will tell you when the result is in.",
      },
    ],
    target: TOUR_TARGETS.practiceReviewCommitReveal,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Your score is sealed before the panel sees it",
    eyebrow: "Submit privately",
    body:
      "When you submit, your score is hashed and locked on-chain. Other reviewers can't read it until everyone has committed, which keeps each review independent.",
    detail:
      "This is the same flow real assignments use. This step uses synthetic data — the app will not sign a transaction and will never call a wallet.",
    actionLabel: "See your submitted score",
  },
  {
    id: "review-result",
    page: "review",
    route: "/expert/voting",
    navLabel: "Submitted",
    icon: ShieldCheck,
    subStops: [
      {
        id: "result-overview",
        target: TOUR_TARGETS.practiceReviewResult,
        fallbackTarget: TOUR_TARGETS.applicationsQueue,
        placement: "auto",
        eyebrow: "Review submitted",
        title: "Your score is in",
        body:
          "This screen confirms the commit landed and the panel is now waiting on the rest of the reviewers. Nothing else is required from you on this application.",
        detail:
          "The same screen shows up after a real submit.",
      },
      {
        id: "result-summary",
        target: TOUR_TARGETS.practiceReviewScoreSummary,
        fallbackTarget: TOUR_TARGETS.practiceReviewResult,
        placement: "right",
        eyebrow: "What you scored",
        title: "Your three numbers, side by side",
        body:
          "General, domain, and deductions are shown alongside the overall total so you can see how your score broke down. This is the same view your panel-mates see at reveal.",
        detail:
          "The percentage bar at the bottom maps overall score to the rubric's max.",
      },
      {
        id: "result-tx",
        target: TOUR_TARGETS.practiceReviewTxConfirmed,
        fallbackTarget: TOUR_TARGETS.practiceReviewResult,
        placement: "top",
        eyebrow: "On-chain proof",
        title: "The commit lives on Ethereum now",
        body:
          "This block links to the transaction on Etherscan so anyone can verify your commit was made before the reveal. The hash is yours — keep it if you want a record.",
        detail:
          "Save the hash if you want a personal record of the commit.",
      },
      {
        id: "result-next",
        target: TOUR_TARGETS.practiceReviewWhatsNext,
        fallbackTarget: TOUR_TARGETS.practiceReviewResult,
        placement: "top",
        eyebrow: "What's next",
        title: "Reveal is automatic",
        body:
          "Once every assigned reviewer has committed, all scores reveal together and IQR-based consensus picks the result. Your alignment with the panel will move your reputation and rewards.",
        detail:
          "You can close this modal — the system will notify you when the result lands.",
      },
      {
        id: "result-close",
        target: TOUR_TARGETS.practiceReviewCloseButton,
        fallbackTarget: TOUR_TARGETS.practiceReviewResult,
        placement: "left",
        eyebrow: "Wrap up",
        title: "Close the modal to keep going",
        body:
          "Hit the X to step out of the review. The walkthrough continues on the result notification, then earnings, then reputation — the same chain every review follows.",
        detail:
          "Closing won't undo the commit you just made.",
        navTrigger: {
          target: TOUR_TARGETS.navNotifications,
          label: "Notifications",
          matchPathname: "/expert/notifications",
        },
      },
    ],
    target: TOUR_TARGETS.practiceReviewResult,
    fallbackTarget: TOUR_TARGETS.applicationsQueue,
    title: "Your score is in",
    eyebrow: "Review submitted",
    body:
      "This screen confirms the commit landed and the panel is now waiting on the rest of the reviewers. Nothing else is required from you on this application.",
    detail:
      "The same screen shows up after a real submit.",
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
        id: "result-notification",
        target: TOUR_TARGETS.notificationResultCard,
        fallbackTarget: TOUR_TARGETS.notificationsList,
        placement: "auto",
        eyebrow: "Result",
        title: "Maya's review reached consensus",
        body:
          "The panel finished and Maya passed. Your score lined up with the rest of the reviewers, so reward and reputation are now headed your way.",
        detail:
          "Bold text and the orange dot mark it unread until you click in.",
      },
      {
        id: "action-notifications",
        target: TOUR_TARGETS.notificationsActionGroup,
        fallbackTarget: TOUR_TARGETS.notificationsList,
        placement: "auto",
        eyebrow: "Action needed",
        title: "Deadlines and new assignments stand out",
        body:
          "Red-striped cards mean a review is due soon; primary-striped cards mean fresh work just landed in your queue. The countdown badge tells you how long you have left.",
        detail:
          "Urgent rows pulse with a soft glow until you act on them.",
      },
      {
        id: "deep-link-behavior",
        target: TOUR_TARGETS.notificationResultCard,
        fallbackTarget: TOUR_TARGETS.notificationsList,
        placement: "auto",
        eyebrow: "Jump in",
        title: "Each row deep-links to the source",
        body:
          "Click a result card and you land on Reputation; reward cards take you to Earnings; guild and proposal pings drop you on the exact item that changed.",
        detail:
          "No need to hunt — the notification is the shortcut.",
        navTrigger: {
          target: TOUR_TARGETS.navEarnings,
          label: "Earnings",
          matchPathname: "/expert/earnings",
        },
      },
    ],
    target: TOUR_TARGETS.notificationResultCard,
    fallbackTarget: TOUR_TARGETS.notificationsList,
    title: "Your unread badge sits up top",
    eyebrow: "Inbox",
    body:
      "The pulsing \"X new\" pill counts every notification you haven't opened yet across reviews, rewards, guild, and system. It clears the moment you read each item.",
    detail:
      "Mark all read wipes the badge in one click when you just want a clean slate.",
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
        id: "earnings-summary",
        target: TOUR_TARGETS.earningsSummary,
        fallbackTarget: TOUR_TARGETS.earningsTimeline,
        placement: "auto",
        eyebrow: "Top line",
        title: "Your VETD totals at a glance",
        body:
          "These four cards roll up everything you've earned, split between voting and endorsements, plus the reward tier multiplier your reputation unlocks.",
        detail:
          "Total Earned is lifetime; the tier card shows the multiplier applied to every future reward.",
      },
      {
        id: "earnings-claim",
        target: TOUR_TARGETS.earningsClaimCard,
        fallbackTarget: TOUR_TARGETS.earningsSummary,
        placement: "auto",
        eyebrow: "Cash out",
        title: "Move claimable VETD to your wallet",
        body:
          "Once a reward finalizes, it lands here as claimable. Hit Claim All to sign one transaction and pull every ready payout into your wallet at once.",
        detail:
          "Claiming is on-chain, so you'll confirm in your wallet and pay gas; the link icon takes you to the receipt.",
      },
      {
        id: "earnings-row",
        target: TOUR_TARGETS.earningsRewardRow,
        fallbackTarget: TOUR_TARGETS.earningsTimeline,
        placement: "auto",
        eyebrow: "Just posted",
        title: "Your VETD reward from Maya's review landed here",
        body:
          "This is the row from the review you just submitted — aligned scores earn VETD, out-of-step ones don't. The amount, guild, and timestamp are all on the row.",
        detail:
          "Aligned reviews bank VETD here even before you claim it on-chain.",
        navTrigger: {
          target: TOUR_TARGETS.navReputation,
          label: "Reputation",
          matchPathname: "/expert/reputation",
        },
      },
    ],
    target: TOUR_TARGETS.earningsSummary,
    fallbackTarget: TOUR_TARGETS.earningsTimeline,
    title: "Your VETD totals at a glance",
    eyebrow: "Top line",
    body:
      "These four cards roll up everything you've earned, split between voting and endorsements, plus the reward tier multiplier your reputation unlocks.",
    detail:
      "Total Earned is lifetime; the tier card shows the multiplier applied to every future reward.",
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
        id: "headline-score",
        target: TOUR_TARGETS.reputationScoreHero,
        fallbackTarget: TOUR_TARGETS.reputationTimeline,
        placement: "auto",
        eyebrow: "Your number",
        title: "This is your reputation, out of 1000",
        body:
          "Your reputation score is the single number the panel weights when you vote and the system trusts when you endorse. It just moved because of the review you finished.",
        detail:
          "Earnings, vote weight, and endorsement slots all flow from this score.",
      },
      {
        id: "tier-progress",
        target: TOUR_TARGETS.reputationTierTower,
        fallbackTarget: TOUR_TARGETS.reputationScoreHero,
        placement: "auto",
        eyebrow: "Where you stand",
        title: "Foundation now, Established next",
        body:
          "Tiers gate reward multipliers, proposal rights, and queue priority. The bar shows how much further you have to climb before the next tier unlocks.",
        detail:
          "Aligned reviews are the fastest way up; deviations slow you down.",
      },
      {
        id: "accuracy-summary",
        target: TOUR_TARGETS.reputationBreakdownCards,
        fallbackTarget: TOUR_TARGETS.reputationScoreHero,
        placement: "auto",
        eyebrow: "Vote quality",
        title: "Accuracy and consistency are tracked separately",
        body:
          "Accuracy is how often you land with consensus. Consistency is whether your gains outpace your losses over time. Both feed your score on top of raw point totals.",
        detail:
          "Activity and endorsement counts sit alongside so you can see volume next to quality.",
      },
      {
        id: "latest-entry",
        target: TOUR_TARGETS.reputationDeltaRow,
        fallbackTarget: TOUR_TARGETS.reputationTimeline,
        placement: "auto",
        eyebrow: "Latest change",
        title: "+12 from Maya's review, marked Aligned",
        body:
          "This row is the review you just submitted. The Aligned tag means your score sat inside consensus distance, and the grid shows your vote, the panel's average, and how far apart they were.",
        detail:
          "Your vote, the consensus, the distance, and the reward all sit in one row so the reasoning is auditable.",
        navTrigger: {
          target: TOUR_TARGETS.navEndorsements,
          label: "Endorsements",
          matchPathname: "/expert/endorsements",
        },
      },
    ],
    target: TOUR_TARGETS.reputationScoreHero,
    fallbackTarget: TOUR_TARGETS.reputationTimeline,
    title: "This is your reputation, out of 1000",
    eyebrow: "Your number",
    body:
      "Your reputation score is the single number the panel weights when you vote and the system trusts when you endorse. It just moved because of the review you finished.",
    detail:
      "Earnings, vote weight, and endorsement slots all flow from this score.",
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
        id: "marketplace-vs-review",
        target: TOUR_TARGETS.endorsementMarketplace,
        placement: "auto",
        eyebrow: "Two different jobs",
        title: "Reviews decide who joins. Endorsements decide who gets hired.",
        body:
          "Guild reviews are about admitting peers into your guild. Endorsements put your reputation behind a candidate for one specific role at one specific company.",
        detail:
          "Same skills you use to review applicants — applied to live job openings.",
      },
      {
        id: "bid-mechanic",
        target: TOUR_TARGETS.endorseAmountInput,
        fallbackTarget: TOUR_TARGETS.endorseModal,
        placement: "auto",
        eyebrow: "Stake to back",
        title: "Type how much VETD you'd stake on Riley",
        body:
          "Your bid is your conviction. Top three highest-staked endorsers earn the reward when the candidate is hired and stays in the role.",
        detail:
          "Bids placed more than 24 hours before close are blind — you can't see the other endorsers' amounts.",
      },
      {
        id: "consequences",
        target: TOUR_TARGETS.endorseSlashWarning,
        fallbackTarget: TOUR_TARGETS.endorseModal,
        placement: "auto",
        eyebrow: "What you win, what you lose",
        title: "Earn if they're hired and stay. Slashed if they aren't.",
        body:
          "If you're top-three and Riley is hired and stays through the retention window, you earn from the company's escrow. If the hire falls through, 10% of your bid is slashed; non-winners are refunded minus a 1.5% fee.",
        detail:
          "Endorse only candidates whose work you'd vouch for in a hiring meeting.",
      },
      {
        id: "accountability-history",
        target: TOUR_TARGETS.endorsementHistoryLink,
        fallbackTarget: TOUR_TARGETS.endorsementMarketplace,
        placement: "auto",
        eyebrow: "Your track record",
        title: "Every endorsement you make is on the record",
        body:
          "Active endorsements show above the marketplace; the full history — wins, losses, slashes — lives behind View All so anyone can audit your calls.",
        detail:
          "Companies and other experts weigh your endorsement track record when yours appears next to theirs.",
        navTrigger: {
          target: TOUR_TARGETS.navGovernance,
          label: "Proposals",
          matchPathname: "/expert/governance",
        },
      },
    ],
    target: TOUR_TARGETS.endorsementMarketplace,
    title: "Reviews decide who joins. Endorsements decide who gets hired.",
    eyebrow: "Two different jobs",
    body:
      "Guild reviews are about admitting peers into your guild. Endorsements put your reputation behind a candidate for one specific role at one specific company.",
    detail:
      "Same skills you use to review applicants — applied to live job openings.",
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
        id: "governance-purpose",
        target: TOUR_TARGETS.governanceHero,
        fallbackTarget: TOUR_TARGETS.governanceProposals,
        placement: "auto",
        eyebrow: "Governance",
        title: "Vote on the rules, not just the people",
        body:
          "Reviews decide who joins a guild. Governance decides how every future review runs — quorum, rewards, slashing, policy.",
        detail:
          "This is where you push back on rules you think are wrong.",
      },
      {
        id: "governance-vote-weight",
        target: TOUR_TARGETS.governanceVoteWeight,
        fallbackTarget: TOUR_TARGETS.governanceHero,
        placement: "auto",
        eyebrow: "Your weight",
        title: "Your vote scales with your reputation",
        body:
          "The multiplier here is your voting power — earned from aligned reviews, applied to every governance vote you cast.",
        detail:
          "Stronger reviewers carry more weight when the rules change.",
      },
      {
        id: "governance-cast-vote",
        target: TOUR_TARGETS.governanceProposalCard,
        fallbackTarget: TOUR_TARGETS.governanceProposals,
        placement: "auto",
        eyebrow: "Casting a vote",
        title: "For, Against, or Abstain — pick one",
        body:
          "Inside the proposal you choose a side and confirm with your wallet; abstain still counts toward quorum without taking a position.",
        detail:
          "Once submitted, your vote is locked on-chain and the card flips to \"You voted.\"",
      },
      {
        id: "governance-past",
        target: TOUR_TARGETS.governancePastSection,
        fallbackTarget: TOUR_TARGETS.governanceProposals,
        placement: "auto",
        eyebrow: "The record",
        title: "Past decisions stay readable",
        body:
          "Every closed proposal — passed or rejected — is archived below with the final tally and whether you voted.",
        detail:
          "Use this when you need to show why a rule exists today.",
      },
      {
        id: "governance-create",
        target: TOUR_TARGETS.governanceCreateCta,
        fallbackTarget: TOUR_TARGETS.governanceHero,
        placement: "auto",
        eyebrow: "Your turn",
        title: "Open your own proposal when you see something to fix",
        body:
          "Anyone with reputation can draft a proposal — pick a type, write the rationale, set the voting window, submit.",
        detail:
          "Drafts are previewed before they go on-chain so you can check the wording.",
        navTrigger: {
          target: TOUR_TARGETS.navDashboard,
          label: "Dashboard",
          matchPathname: "/expert/dashboard",
        },
      },
    ],
    target: TOUR_TARGETS.governanceHero,
    fallbackTarget: TOUR_TARGETS.governanceProposals,
    title: "Vote on the rules, not just the people",
    eyebrow: "Governance",
    body:
      "Reviews decide who joins a guild. Governance decides how every future review runs — quorum, rewards, slashing, policy.",
    detail:
      "This is where you push back on rules you think are wrong.",
    actionLabel: "Wrap up",
  },
  {
    id: "complete",
    page: "complete",
    route: "/expert/dashboard",
    navLabel: "Complete",
    icon: CheckCircle2,
    subStops: [
      {
        id: "victory-lap",
        target: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "You're set",
        title: "You've seen the whole loop",
        body:
          "Guild, application, review, reward, reputation, endorsement, governance — that's the job. Welcome to the panel.",
        detail:
          "From here on, it's real work and real stakes.",
      },
      {
        id: "start-real-work",
        target: TOUR_TARGETS.dashboardReviewQueue,
        fallbackTarget: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Start here",
        title: "Pick up your first real review",
        body:
          "Anything assigned to you is in this queue right now. Open the top row when you're ready — the deadline order makes the choice for you.",
        detail:
          "If nothing is waiting yet, the queue will fill as guild rounds open.",
      },
      {
        id: "ready-to-go",
        target: TOUR_TARGETS.dashboardOverview,
        placement: "auto",
        eyebrow: "Ready",
        title: "You're set — go take real work",
        body:
          "The tour ends here. Real reviews, real rewards, real reputation — same loop, same surfaces.",
        detail:
          "Hit Finish to leave the walkthrough.",
      },
    ],
    target: TOUR_TARGETS.dashboardOverview,
    title: "You've seen the whole loop",
    eyebrow: "You're set",
    body:
      "Guild, application, review, reward, reputation, endorsement, governance — that's the job. Welcome to the panel.",
    detail:
      "From here on, it's real work and real stakes.",
    actionLabel: "Finish",
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
  // navTrigger sub-stops resolve onto the sidebar nav item — that's a valid
  // ready state because the user advances by clicking the nav link, not by
  // hitting Continue.
  if (subStop.navTrigger && resolvedTarget === subStop.navTrigger.target) return true;
  if (resolvedTarget === subStop.target) return true;
  // The fallback target exists precisely because the primary may not render
  // on every page state (e.g. members-only sidebar cards). If the driver
  // resolved on the fallback, that's still a valid "Ready" state — the
  // popover content describes the same concept either way.
  if (subStop.fallbackTarget && resolvedTarget === subStop.fallbackTarget) return true;
  return false;
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
  // Always include the first sub-stop id so the launch URL is canonical and
  // the driver does not have to back-fill `storySub` on first paint.
  return buildStoryLabRoute(firstStep.route, firstStep.id, firstStep.subStops[0]?.id);
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
