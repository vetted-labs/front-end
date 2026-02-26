"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { guildApplicationsApi } from "@/lib/api";
import { formatDeadline, ensureHttps } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useVotingApplicationData } from "@/lib/hooks/useVotingApplicationData";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Linkedin,
  Github,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { StructuredApplicationDisplay } from "@/components/StructuredApplicationDisplay";
import { CommitRevealPhaseIndicator } from "@/components/CommitRevealPhaseIndicator";
import { VotingInterface } from "@/components/expert/VotingInterface";
import { FinalizedView } from "@/components/expert/FinalizedView";
import type { CandidateProfile } from "@/types";

interface VotingApplicationPageProps {
  applicationId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/* ----------------------------------------------------------------
   Candidate Profile Panel -- shows LinkedIn, GitHub, resume, bio
   ---------------------------------------------------------------- */
function CandidateProfileSection({
  profile,
  candidateId,
}: {
  profile: CandidateProfile;
  candidateId?: string;
}) {
  const hasLinks =
    profile.linkedIn ||
    profile.github ||
    profile.resumeUrl ||
    (profile.socialLinks && profile.socialLinks.length > 0);
  const hasBio = profile.bio || profile.headline;

  if (!hasLinks && !hasBio) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Candidate Profile
      </h3>

      {profile.headline && (
        <p className="text-base text-foreground font-medium">
          {profile.headline}
        </p>
      )}

      {profile.bio && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {profile.bio}
        </p>
      )}

      {hasLinks && (
        <div className="flex flex-wrap gap-2">
          {profile.linkedIn && (
            <a
              href={ensureHttps(profile.linkedIn)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
          )}
          {profile.github && (
            <a
              href={ensureHttps(profile.github)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          )}
          {profile.resumeUrl && candidateId && (
            <a
              href={`${API_URL}/api/candidates/${candidateId}/resume`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
            >
              <FileText className="w-4 h-4" />
              Resume / CV
            </a>
          )}
          {profile.socialLinks?.map((link, i) => (
            <a
              key={i}
              href={ensureHttps(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {link.label || link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Compact quick-access links for the header area
   ---------------------------------------------------------------- */
function CandidateQuickLinks({
  profile,
  candidateId,
}: {
  profile: CandidateProfile;
  candidateId?: string;
}) {
  const hasAnyLink = profile.linkedIn || profile.github || profile.resumeUrl;
  if (!hasAnyLink) return null;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {profile.linkedIn && (
        <a
          href={ensureHttps(profile.linkedIn)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:border-primary/30 hover:text-primary transition-colors text-muted-foreground"
          title="LinkedIn"
        >
          <Linkedin className="w-4 h-4" />
        </a>
      )}
      {profile.github && (
        <a
          href={ensureHttps(profile.github)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:border-primary/30 hover:text-primary transition-colors text-muted-foreground"
          title="GitHub"
        >
          <Github className="w-4 h-4" />
        </a>
      )}
      {profile.resumeUrl && candidateId && (
        <a
          href={`${API_URL}/api/candidates/${candidateId}/resume`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:border-primary/30 hover:text-primary transition-colors text-muted-foreground"
          title="Resume / CV"
        >
          <FileText className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Main component
   ---------------------------------------------------------------- */
export default function VotingApplicationPage({
  applicationId,
}: VotingApplicationPageProps) {
  const router = useRouter();
  const { address: wagmiAddress } = useAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;

  // UI state that changes based on user actions (not initial data loading)
  const [showVoting, setShowVoting] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  const {
    application,
    expertData,
    candidateProfile,
    stakingStatus,
    crPhase,
    voteHistory,
    loading,
    loadPhaseStatus,
    loadApplication,
  } = useVotingApplicationData(applicationId, address);

  /* -- user actions -- */
  const handleVote = async (
    score: number,
    stakeAmount: number,
    comment: string
  ) => {
    if (!expertData) {
      toast.error("Expert data not loaded");
      return;
    }
    if (!stakingStatus?.meetsMinimum) {
      toast.error("You must stake the minimum VETD amount to vote");
      return;
    }
    try {
      setIsSubmittingVote(true);
      await guildApplicationsApi.vote(applicationId, {
        expertId: expertData.id,
        score,
        stakeAmount,
        comment,
      });
      toast.success("Score submitted successfully!");
      setShowVoting(false);
      loadApplication();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit score"
      );
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleCommitOrReveal = () => {
    loadPhaseStatus();
    loadApplication();
  };

  /* -- loading state -- */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground mb-4">
            Application not found
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  /* -- derived values -- */
  const isFinalized = application.finalized;
  const isReviewer = application.is_assigned_reviewer;
  const hasVoted = application.has_voted;
  const showVotingInterface = !isFinalized && isReviewer;
  const canVote =
    !!isReviewer &&
    !hasVoted &&
    !isFinalized &&
    !!stakingStatus?.meetsMinimum;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* -- Back link -- */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </button>

        {/* -- Header -- */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {application.candidate_name}
            </h1>
            <div className="flex gap-2 shrink-0">
              <Badge variant="secondary">{application.guild_name}</Badge>
              {isFinalized ? (
                <Badge
                  variant={
                    application.outcome === "approved"
                      ? "default"
                      : "destructive"
                  }
                >
                  {application.outcome === "approved"
                    ? "Approved"
                    : "Rejected"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-500"
                >
                  Voting Open
                </Badge>
              )}
            </div>
          </div>

          {/* Metadata line */}
          <p className="text-sm text-muted-foreground">
            {application.candidate_email}
            {(application.years_of_experience ?? 0) > 0 && (
              <> &middot; {application.years_of_experience} yrs</>
            )}
            {candidateProfile?.headline && (
              <> &middot; {candidateProfile.headline}</>
            )}
            {" "}&middot; Applied{" "}
            {new Date(application.created_at).toLocaleDateString()}
          </p>

          {/* Metrics line (contextual) */}
          <p className="text-sm text-muted-foreground mt-0.5">
            {isFinalized ? (
              <>
                {application.finalized_at && (
                  <>
                    Finalized{" "}
                    {new Date(
                      application.finalized_at
                    ).toLocaleDateString()}{" "}
                    &middot;{" "}
                  </>
                )}
                {application.vote_count} votes
                {application.consensus_score !== undefined && (
                  <>
                    {" "}
                    &middot; Consensus:{" "}
                    {application.consensus_score.toFixed(1)}/100
                  </>
                )}
              </>
            ) : (
              <>
                Deadline: {formatDeadline(application.voting_deadline)}
                {" "}&middot; {application.vote_count}/
                {application.assigned_reviewer_count || "?"} voted{" "}&middot;{" "}
                {application.required_stake} VETD staked
              </>
            )}
          </p>

          {/* Quick-access links */}
          {candidateProfile && (
            <CandidateQuickLinks
              profile={candidateProfile}
              candidateId={application.candidate_id}
            />
          )}
        </div>

        {/* -- Staking warning -- */}
        {stakingStatus && !stakingStatus.meetsMinimum && isReviewer && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  Staking Required to Vote
                </p>
                <p className="text-sm text-muted-foreground">
                  You must stake at least{" "}
                  {stakingStatus.minimumRequired || "?"} VETD to submit your
                  score. Current stake: {stakingStatus.stakedAmount || "0"}{" "}
                  VETD.
                </p>
              </div>
              <Button variant="default" size="sm">
                Stake VETD
              </Button>
            </div>
          </div>
        )}

        {/* -- CR Phase indicator -- */}
        {crPhase && crPhase.phase !== "direct" && (
          <div className="mb-6">
            <CommitRevealPhaseIndicator
              currentPhase={crPhase.phase}
              commitDeadline={crPhase.commitDeadline}
              revealDeadline={crPhase.revealDeadline}
              commitCount={crPhase.commitCount}
              revealCount={crPhase.revealCount}
              totalExpected={
                crPhase.totalExpected || application.assigned_reviewer_count
              }
            />
          </div>
        )}

        {/* ============================================================
           ACTIVE VOTING LAYOUT -- 8+4 grid with sticky sidebar
           ============================================================ */}
        {!isFinalized && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main content */}
            <div className="lg:col-span-8 order-last lg:order-first space-y-10">
              {candidateProfile && (
                <CandidateProfileSection
                  profile={candidateProfile}
                  candidateId={application.candidate_id}
                />
              )}
              <StructuredApplicationDisplay
                application={application}
                compact={false}
                showHeader={false}
              />
            </div>

            {/* Sidebar -- sticky voting form */}
            {showVotingInterface && (
              <VotingInterface
                application={application}
                crPhase={crPhase}
                expertId={expertData?.id}
                hasVoted={!!hasVoted}
                meetsMinimumStake={canVote}
                showVoting={showVoting}
                isSubmittingVote={isSubmittingVote}
                onToggleVoting={setShowVoting}
                onVote={handleVote}
                onCommitOrReveal={handleCommitOrReveal}
              />
            )}
          </div>
        )}

        {/* ============================================================
           FINALIZED LAYOUT -- full-width single column
           ============================================================ */}
        {isFinalized && (
          <FinalizedView
            application={application}
            voteHistory={voteHistory}
            candidateProfile={candidateProfile}
            wallet={address}
            CandidateProfileSection={CandidateProfileSection}
          />
        )}
      </div>
    </div>
  );
}
