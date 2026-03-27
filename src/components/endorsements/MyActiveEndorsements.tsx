"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Award, ArrowRight, CheckCircle2, Clock, XCircle, TrendingUp, Coins } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { ActiveEndorsement, EndorsementApplication } from "@/types";

type LifecycleInfo = {
  icon: React.ReactNode;
  message: string;
  className: string;
  dotColor: string;
  /** Color key for the spinning ring: positive, warning, neutral */
  ringColor: "positive" | "warning" | "neutral" | "info" | "negative";
};

function getEndorsementLifecycleInfo(endorsement: ActiveEndorsement): LifecycleInfo | null {
  const status = endorsement.application?.status;
  const candidateName = endorsement.candidate?.name ?? "this candidate";

  switch (status) {
    case "hired":
      return {
        icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
        message: "Reward pending",
        className: STATUS_COLORS.positive.text,
        dotColor: STATUS_COLORS.positive.dot,
        ringColor: "positive",
      };
    case "offered":
      return {
        icon: <TrendingUp className="w-3 h-3 shrink-0" />,
        message: `${candidateName} received an offer`,
        className: STATUS_COLORS.info.text,
        dotColor: STATUS_COLORS.info.dot,
        ringColor: "info",
      };
    case "rejected":
    case "withdrawn":
      return {
        icon: <XCircle className="w-3 h-3 shrink-0" />,
        message: status === "rejected" ? "Not selected" : "Withdrawn",
        className: STATUS_COLORS.negative.text,
        dotColor: STATUS_COLORS.negative.dot,
        ringColor: "negative",
      };
    case "interviewing":
      return {
        icon: <Clock className="w-3 h-3 shrink-0" />,
        message: "Interviewing",
        className: STATUS_COLORS.info.text,
        dotColor: STATUS_COLORS.info.dot,
        ringColor: "positive",
      };
    case "accepted":
      return {
        icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
        message: "Accepted — awaiting confirmation",
        className: STATUS_COLORS.positive.text,
        dotColor: STATUS_COLORS.positive.dot,
        ringColor: "positive",
      };
    default:
      return null;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

const RING_COLOR_MAP: Record<string, string> = {
  positive: "hsl(var(--positive))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info-blue))",
  negative: "hsl(var(--negative))",
  neutral: "hsl(var(--primary))",
};

const STATUS_LABEL_MAP: Record<string, { label: string; statusClass: string }> = {
  interviewing: { label: "Interviewing", statusClass: `${STATUS_COLORS.positive.badge}` },
  hired: { label: "Reward Pending", statusClass: `${STATUS_COLORS.positive.badge}` },
  offered: { label: "Offered", statusClass: `${STATUS_COLORS.info.badge}` },
  accepted: { label: "Accepted", statusClass: `${STATUS_COLORS.positive.badge}` },
  rejected: { label: "Not Selected", statusClass: `${STATUS_COLORS.negative.badge}` },
  withdrawn: { label: "Withdrawn", statusClass: `${STATUS_COLORS.neutral.badge}` },
  under_review: { label: "Under Review", statusClass: `${STATUS_COLORS.warning.badge}` },
  pending: { label: "Pending", statusClass: `${STATUS_COLORS.neutral.badge}` },
};

function EndorsementSpinCard({
  endorsement,
  lifecycle,
  initials,
  bidAmount,
  rank,
  animationDelay,
  onClick,
}: {
  endorsement: ActiveEndorsement;
  lifecycle: LifecycleInfo | null;
  initials: string;
  bidAmount: number;
  rank: number | undefined;
  animationDelay: string;
  onClick: () => void;
}) {
  const ringColor = lifecycle ? RING_COLOR_MAP[lifecycle.ringColor] : "hsl(var(--primary))";
  const status = endorsement.application?.status ?? "pending";
  const statusInfo = STATUS_LABEL_MAP[status] ?? STATUS_LABEL_MAP.pending;

  return (
    <div
      className="flex-none w-[340px] scroll-snap-start cursor-pointer"
      onClick={onClick}
    >
      {/* Outer spinning gradient border */}
      <div
        className="rounded-[22px] p-[2px] endo-spinning-border"
        style={{
          background: `conic-gradient(from var(--endo-spin-angle, 0deg), ${ringColor}, transparent 40%, transparent 60%, ${ringColor})`,
          animationDelay,
        }}
      >
        <div className="bg-background rounded-[20px] p-5 flex flex-col gap-3.5 h-full relative z-[1]">
          {/* Top: Avatar with spinning ring + info */}
          <div className="flex items-center gap-3.5">
            {/* Avatar with ring */}
            <div className="relative w-14 h-14 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from var(--endo-spin-angle, 0deg), ${ringColor}, transparent 50%, ${ringColor})`,
                  animation: "endo-card-spin 3s linear infinite",
                  animationDelay,
                }}
              />
              <Avatar className="absolute inset-[3px] rounded-full border-0">
                {endorsement.candidate?.profilePicture && (
                  <AvatarImage
                    src={endorsement.candidate.profilePicture}
                    alt={endorsement.candidate?.name ?? ''}
                    className="rounded-full"
                  />
                )}
                <AvatarFallback className="rounded-full bg-muted/30 text-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {endorsement.candidate?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {endorsement.job?.title}
              </p>
              <p className="text-xs text-muted-foreground/50">
                applying at {endorsement.job?.companyName}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] px-2.5 py-1 rounded-full ${statusInfo.statusClass}`}>
              <span className="w-[5px] h-[5px] rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-muted/30" />

          {/* Bid + Rank */}
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-base text-primary">
              {bidAmount.toFixed(0)} VETD
            </span>
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
              {rank !== undefined && rank > 0 ? (
                <>
                  Rank
                  <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px] bg-primary/10 text-primary text-xs font-bold">
                    #{rank}
                  </span>
                </>
              ) : (
                <span className="italic text-muted-foreground/50">Blind period</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MyActiveEndorsementsProps {
  userEndorsements: ActiveEndorsement[];
  allUserEndorsements: ActiveEndorsement[];
  guildName: string;
  onSelectEndorsement: (applicationForModal: EndorsementApplication) => void;
}

export function MyActiveEndorsements({
  userEndorsements,
  allUserEndorsements,
  guildName,
  onSelectEndorsement,
}: MyActiveEndorsementsProps) {
  const handleEndorsementClick = (endorsement: ActiveEndorsement) => {
    const applicationForModal: EndorsementApplication = {
      application_id: endorsement.application?.id ?? endorsement.applicationId ?? "",
      candidate_id: endorsement.candidate?.id ?? "",
      job_id: endorsement.job?.id ?? "",
      company_id: endorsement.job?.companyId,
      candidate_name: endorsement.candidate?.name ?? "",
      candidate_headline: endorsement.candidate?.headline ?? "",
      candidate_profile_picture_url: endorsement.candidate?.profilePicture,
      candidate_bio: endorsement.candidate?.bio ?? "",
      candidate_wallet: endorsement.candidate?.walletAddress ?? "",
      job_title: endorsement.job?.title ?? "",
      job_description: endorsement.job?.description,
      company_name: endorsement.job?.companyName ?? "",
      company_logo: endorsement.job?.companyLogo,
      location: endorsement.job?.location ?? "",
      job_type: endorsement.job?.jobType ?? "",
      salary_min: endorsement.job?.salaryMin ?? 0,
      salary_max: endorsement.job?.salaryMax ?? 0,
      salary_currency: endorsement.job?.salaryCurrency,
      status: endorsement.application?.status,
      applied_at: endorsement.application?.appliedAt ?? endorsement.endorsedAt,
      cover_letter: endorsement.application?.coverLetter,
      screening_answers: endorsement.application?.screeningAnswers,
      guild_score: endorsement.guildScore ?? 0,
      current_bid: endorsement.stakeAmount,
      rank: endorsement.blockchainData?.rank ?? 0,
      requirements: endorsement.job?.requirements ?? [],
      job_skills: endorsement.job?.skills ?? [],
      experience_level: endorsement.candidate?.experienceLevel,
      linkedin: endorsement.candidate?.linkedin,
      github: endorsement.candidate?.github,
      resume_url: endorsement.candidate?.resumeUrl,
    };

    onSelectEndorsement(applicationForModal);
  };

  // Compute total staked across guild endorsements
  const totalStaked = userEndorsements.reduce((sum, e) => sum + parseFloat(e.stakeAmount || '0'), 0);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-xl tracking-tight flex items-center gap-2.5">
          Your Active Endorsements
          {userEndorsements.length > 0 && (
            <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {userEndorsements.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4">
          {totalStaked > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              Total: <span className="text-foreground font-medium">{totalStaked.toFixed(0)} VETD</span> staked
            </span>
          )}
          {allUserEndorsements.length > 0 && (
            <Link href="/expert/endorsements/history">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border text-muted-foreground hover:bg-muted/30 hover:border-border"
              >
                View All ({allUserEndorsements.length})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Horizontally scrollable cards */}
      {userEndorsements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-2">
            You haven&apos;t endorsed any candidates in {guildName} yet
          </p>
          {allUserEndorsements.length > 0 ? (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                You have {allUserEndorsements.length} endorsement{allUserEndorsements.length !== 1 ? 's' : ''} in other guilds:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from(new Set(allUserEndorsements.map((e) => e.guild?.name).filter(Boolean))).map((name) => (
                  <span key={name} className="text-xs px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary/80">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60">
              Browse applications below and endorse candidates you believe will succeed
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.06]">
          {userEndorsements.map((endorsement, idx) => {
            const lifecycle = getEndorsementLifecycleInfo(endorsement);
            const initials = endorsement.candidate?.name ? getInitials(endorsement.candidate.name) : '??';
            const bidAmount = parseFloat(endorsement.stakeAmount || '0');
            const rank = endorsement.blockchainData?.rank;

            return (
              <EndorsementSpinCard
                key={endorsement.application?.id || endorsement.endorsementId}
                endorsement={endorsement}
                lifecycle={lifecycle}
                initials={initials}
                bidAmount={bidAmount}
                rank={rank}
                animationDelay={`${-idx}s`}
                onClick={() => handleEndorsementClick(endorsement)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
