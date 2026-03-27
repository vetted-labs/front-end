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
      };
    case "offered":
      return {
        icon: <TrendingUp className="w-3 h-3 shrink-0" />,
        message: `${candidateName} received an offer`,
        className: STATUS_COLORS.info.text,
        dotColor: STATUS_COLORS.info.dot,
      };
    case "rejected":
    case "withdrawn":
      return {
        icon: <XCircle className="w-3 h-3 shrink-0" />,
        message: status === "rejected" ? "Not selected" : "Withdrawn",
        className: STATUS_COLORS.negative.text,
        dotColor: STATUS_COLORS.negative.dot,
      };
    case "interviewing":
      return {
        icon: <Clock className="w-3 h-3 shrink-0" />,
        message: "Interviewing",
        className: STATUS_COLORS.info.text,
        dotColor: STATUS_COLORS.info.dot,
      };
    case "accepted":
      return {
        icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
        message: "Accepted — awaiting confirmation",
        className: STATUS_COLORS.positive.text,
        dotColor: STATUS_COLORS.positive.dot,
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

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Award className="w-4 h-4" />
            My Active Endorsements
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {userEndorsements.length > 0
              ? `${userEndorsements.length} active endorsement${userEndorsements.length !== 1 ? 's' : ''} in ${guildName}`
              : allUserEndorsements.length > 0
              ? `${allUserEndorsements.length} endorsement${allUserEndorsements.length !== 1 ? 's' : ''} in other guilds`
              : `No active endorsements yet. Endorse candidates below to get started.`
            }
          </p>
        </div>
        {allUserEndorsements.length > 0 && (
          <Link href="/expert/endorsements/history">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/[0.10] text-muted-foreground hover:bg-white/[0.04] hover:border-white/[0.18]"
            >
              View All ({allUserEndorsements.length})
            </Button>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {userEndorsements.length === 0 ? (
          <div className="text-center py-8">
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
          <div className="space-y-2.5">
            {userEndorsements.map((endorsement) => {
              const lifecycle = getEndorsementLifecycleInfo(endorsement);
              const initials = endorsement.candidate?.name ? getInitials(endorsement.candidate.name) : '??';
              const bidAmount = parseFloat(endorsement.stakeAmount || '0');
              const rank = endorsement.blockchainData?.rank;

              return (
                <div
                  key={endorsement.application?.id || endorsement.endorsementId}
                  onClick={() => handleEndorsementClick(endorsement)}
                  className="group relative flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/10"
                >
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 rounded-lg border border-white/[0.08] shrink-0">
                    {endorsement.candidate?.profilePicture && (
                      <AvatarImage
                        src={endorsement.candidate.profilePicture}
                        alt={endorsement.candidate?.name ?? ''}
                        className="rounded-lg"
                      />
                    )}
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {endorsement.candidate?.name}
                      </h4>
                      {lifecycle && (
                        <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium ${lifecycle.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${lifecycle.dotColor}`} />
                          {lifecycle.message}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 truncate">
                      {endorsement.job?.title} at {endorsement.job?.companyName}
                    </p>
                  </div>

                  {/* Bid + Date */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Bid Amount */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Coins className="w-3.5 h-3.5 text-primary/70" />
                        <span className="text-sm font-semibold text-primary">
                          {bidAmount.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-medium text-primary/50 uppercase">VETD</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        {rank !== undefined && rank > 0 && (
                          <span className="text-[10px] text-muted-foreground/40">
                            Rank #{rank}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/40">
                          {endorsement.createdAt
                            ? new Date(endorsement.createdAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
