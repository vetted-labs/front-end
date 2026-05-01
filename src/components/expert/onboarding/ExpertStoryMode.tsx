"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Star,
  Users,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpertOnboardingChecklistEvent } from "@/lib/expert-onboarding-tour";

export const EXPERT_STORY_COMPLETION_EVENTS = [
  "practiceReviewCompleted",
  "applicationsVisited",
  "guildsVisited",
  "stakingExplanationViewed",
  "commitRevealViewed",
  "endorsementsVisited",
  "governanceVisited",
  "rewardsVisited",
  "reputationVisited",
  "notificationsVisited",
] as const satisfies readonly ExpertOnboardingChecklistEvent[];

type StoryStepId =
  | "guild"
  | "application"
  | "review"
  | "result"
  | "reward"
  | "reputation"
  | "endorsement"
  | "governance"
  | "complete";

interface StoryStep {
  id: StoryStepId;
  title: string;
  eyebrow: string;
  body: string;
  detail: string;
  icon: typeof Users;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: "guild",
    title: "Meet your guild",
    eyebrow: "Guild context",
    body:
      "Guilds are the working groups where experts review applications, vote with reputation, and build a visible record of judgment.",
    detail:
      "This demo uses the Engineering Guild. Stake, rank, and prior consensus history give reviewers accountability before real queues open.",
    icon: Users,
  },
  {
    id: "application",
    title: "Maya Chen applies to Engineering",
    eyebrow: "Applications page",
    body:
      "Applications shows assigned review work. In this story, Maya is a fake senior engineer applying for guild membership.",
    detail:
      "The card shows the same signals a real reviewer scans first: level, evidence, domain fit, and any risk that needs closer review.",
    icon: FileCheck2,
  },
  {
    id: "review",
    title: "Run the demo review",
    eyebrow: "Practice review",
    body:
      "The practice modal opens automatically here. Score the evidence, mark red flags if needed, and submit the fake review.",
    detail:
      "Nothing in this step reaches the backend or chain. It is the safe version of the real review mechanics.",
    icon: ShieldCheck,
  },
  {
    id: "result",
    title: "Consensus result",
    eyebrow: "Notification",
    body:
      "After reviewers finish, the app shows the outcome. Here Maya passes because your demo vote matches the reviewer consensus.",
    detail:
      "The real system uses commit/reveal so reviewers commit privately first, then reveal later for an auditable result.",
    icon: Bell,
  },
  {
    id: "reward",
    title: "Reward posted",
    eyebrow: "Earnings",
    body:
      "When your review aligns with consensus, rewards appear in Earnings. This story posts a fake VETD reward.",
    detail:
      "Real payouts depend on guild rules, vote weight, and finalized review rounds. This screen is only showing the mechanics.",
    icon: CircleDollarSign,
  },
  {
    id: "reputation",
    title: "Reputation increased",
    eyebrow: "Reputation",
    body:
      "Reputation changes explain how your judgment is trending across guild work, approvals, disputes, and consensus outcomes.",
    detail:
      "The demo gain is fake, but the mental model is real: consistent high-quality reviews increase trust in your future votes.",
    icon: Star,
  },
  {
    id: "endorsement",
    title: "Endorse a job candidate",
    eyebrow: "Endorsements",
    body:
      "Guild review decides whether someone joins a guild. Endorsements are separate: experts can back a candidate for a specific job.",
    detail:
      "In this fake job story, Maya also applies to a Frontend Lead role. The endorsement view is where you decide whether to back her.",
    icon: BriefcaseBusiness,
  },
  {
    id: "governance",
    title: "Vote on guild decisions",
    eyebrow: "Governance",
    body:
      "Some work is not about one applicant. Governance is where experts vote on protocol proposals, guild rules, and operational decisions.",
    detail:
      "This story does not cast a vote. It shows where decisions live so a new expert understands why governance is separate from reviews.",
    icon: Vote,
  },
  {
    id: "complete",
    title: "Story complete",
    eyebrow: "Ready for real work",
    body:
      "You have seen the full loop: guild context, application review, commit/reveal, notification, rewards, reputation, and endorsements.",
    detail:
      "The first-run story disappears after this. Real queues, payouts, and endorsements remain unchanged until you take real actions.",
    icon: CheckCircle2,
  },
];

interface ExpertStoryModeProps {
  open: boolean;
  suspended?: boolean;
  practiceCompleted: boolean;
  onOpenPracticeReview: () => void;
  onComplete: () => void;
}

function StoryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/70 p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-bold",
          tone === "positive"
            ? "text-positive"
            : tone === "warning"
              ? "text-primary"
              : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function GuildScene() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/80 bg-background/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">
              Engineering Guild
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              128 active experts
            </p>
          </div>
          <Users className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StoryMetric label="Your rank" value="Senior" />
          <StoryMetric label="Stake status" value="Ready" tone="positive" />
          <StoryMetric label="Open reviews" value="1 demo" tone="warning" />
        </div>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">
            Real guild actions can affect rewards and reputation. Story mode labels fake moments clearly before you touch real work.
          </p>
        </div>
      </div>
    </div>
  );
}

function ApplicationScene() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">
            Demo application
          </p>
          <h3 className="mt-2 text-xl font-bold text-foreground">
            Maya Chen
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Senior Full-Stack Engineer at Northstar Labs
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Needs review
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StoryMetric label="Evidence" value="Strong" tone="positive" />
        <StoryMetric label="Domain fit" value="Engineering" />
        <StoryMetric label="Risk" value="Web3 depth" tone="warning" />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Story mode uses this fake card to teach what a reviewer checks before opening the review.
      </p>
    </div>
  );
}

function ReviewScene({ practiceCompleted }: { practiceCompleted: boolean }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {practiceCompleted ? "Demo review complete" : "Practice review is open"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {practiceCompleted
              ? "Your fake score is ready for the story outcome."
              : "Complete the demo review to continue, then use Continue story to resume the walkthrough."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultScene() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-positive/30 bg-positive/10 p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-1 h-6 w-6 text-positive" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Maya Chen passed consensus
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your demo vote matched the expert majority. The notification tells you what happened and where to inspect the result.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase text-primary">
          Blockchain mechanics
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Commit/reveal keeps early votes private, then reveals them for a verifiable audit trail after the round closes.
        </p>
      </div>
    </div>
  );
}

function RewardScene() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StoryMetric label="Outcome" value="Consensus" tone="positive" />
        <StoryMetric label="Reward" value="+24 VETD" tone="positive" />
        <StoryMetric label="Status" value="Finalized" />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Earnings is where real reward history and pending payouts collect after rounds finalize.
      </p>
    </div>
  );
}

function ReputationScene() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">
            Reputation ledger
          </p>
          <p className="mt-1 text-3xl font-bold text-positive">+18</p>
        </div>
        <Award className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Reputation explains why a change happened, not just the number. It should make consensus alignment and review quality inspectable.
      </p>
    </div>
  );
}

function EndorsementScene() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">
            Fake job application
          </p>
          <h3 className="mt-2 text-xl font-bold text-foreground">
            Frontend Lead at Northstar
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Maya is now a job candidate, not a guild applicant.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
          Endorsement review
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Endorsing means you are backing a candidate for a role. It is intentionally separate from guild membership approval.
      </p>
    </div>
  );
}

function GovernanceScene() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <div className="flex items-start gap-3">
        <Vote className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Guild policy proposal
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Example: adjust senior-review quorum from 3 experts to 5 experts for high-impact guild applications.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StoryMetric label="Type" value="Policy" />
        <StoryMetric label="Status" value="Open" tone="warning" />
        <StoryMetric label="Action" value="Vote" />
      </div>
    </div>
  );
}

function CompleteScene() {
  return (
    <div className="rounded-xl border border-positive/30 bg-positive/10 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-6 w-6 text-positive" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Story mode will disappear after you finish.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You can now use the real app without this first-run overlay blocking the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepScene({
  step,
  practiceCompleted,
}: {
  step: StoryStep;
  practiceCompleted: boolean;
}) {
  switch (step.id) {
    case "guild":
      return <GuildScene />;
    case "application":
      return <ApplicationScene />;
    case "review":
      return <ReviewScene practiceCompleted={practiceCompleted} />;
    case "result":
      return <ResultScene />;
    case "reward":
      return <RewardScene />;
    case "reputation":
      return <ReputationScene />;
    case "endorsement":
      return <EndorsementScene />;
    case "governance":
      return <GovernanceScene />;
    case "complete":
      return <CompleteScene />;
    default:
      return null;
  }
}

export function ExpertStoryMode({
  open,
  suspended = false,
  practiceCompleted,
  onOpenPracticeReview,
  onComplete,
}: ExpertStoryModeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const practiceLaunchRequestedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const step = STORY_STEPS[activeIndex] ?? STORY_STEPS[0];
  const Icon = step.icon;
  const progressLabel = `${activeIndex + 1} of ${STORY_STEPS.length}`;
  const isReviewStep = step.id === "review";
  const isFinalStep = step.id === "complete";

  const primaryLabel = useMemo(() => {
    if (isReviewStep && !practiceCompleted) return "Waiting for review";
    if (isFinalStep) return "Finish story mode";
    return "Next";
  }, [isFinalStep, isReviewStep, practiceCompleted]);

  // eslint-disable-next-line no-restricted-syntax -- resets the forced story when the first-run overlay is reopened
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setActiveIndex(0);
      practiceLaunchRequestedRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open]);

  // eslint-disable-next-line no-restricted-syntax -- story mode opens the safe practice modal automatically at the review beat
  useEffect(() => {
    if (!open || !isReviewStep || practiceCompleted) return;
    if (practiceLaunchRequestedRef.current) return;
    practiceLaunchRequestedRef.current = true;
    onOpenPracticeReview();
  }, [isReviewStep, onOpenPracticeReview, open, practiceCompleted]);

  // eslint-disable-next-line no-restricted-syntax -- resumes the story after the practice modal reports completion
  useEffect(() => {
    if (!open || !isReviewStep || !practiceCompleted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- advances story step once practice review completes
    setActiveIndex((current) => {
      const currentStep = STORY_STEPS[current];
      if (currentStep?.id !== "review") return current;
      return Math.min(current + 1, STORY_STEPS.length - 1);
    });
  }, [isReviewStep, open, practiceCompleted]);

  if (!open) return null;
  if (suspended) return null;

  const handlePrimaryAction = () => {
    if (isReviewStep && !practiceCompleted) return;
    if (isFinalStep) {
      onComplete();
      return;
    }
    setActiveIndex((current) => Math.min(current + 1, STORY_STEPS.length - 1));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expert-story-mode-dialog-title"
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-background/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p
                id="expert-story-mode-dialog-title"
                className="text-xs font-semibold uppercase text-primary"
              >
                Expert story mode
              </p>
              <p className="text-sm text-muted-foreground">
                Demo only. No real applications, payouts, signatures, or chain actions.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
            {progressLabel}
          </span>
        </div>

        <div className="grid min-h-[520px] overflow-y-auto lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10">
            <span className="mb-5 w-fit rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {step.eyebrow}
            </span>
            <h2
              className="max-w-3xl text-3xl font-bold tracking-normal text-foreground sm:text-4xl"
            >
              {step.title}
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {step.body}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              {step.detail}
            </p>
          </div>

          <div className="border-t border-border bg-background/45 p-5 lg:border-l lg:border-t-0">
            <div className="flex h-full min-h-[320px] flex-col justify-center">
              <StepScene step={step} practiceCompleted={practiceCompleted} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border bg-background/70 px-5 py-4">
          <div className="flex gap-2">
            {STORY_STEPS.map((storyStep, index) => (
              <span
                key={storyStep.id}
                className={cn(
                  "h-2 w-8 rounded-full transition-colors",
                  index <= activeIndex ? "bg-primary" : "bg-muted"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isReviewStep && !practiceCompleted}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
