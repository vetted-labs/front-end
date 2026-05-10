"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { guildApplicationsApi } from "@/lib/api";
import { STATUS_COLORS } from "@/config/colors";
import { useApi } from "@/lib/hooks/useFetch";
import { formatDeadline, ensureHttps, cn } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useVotingApplicationData } from "@/lib/hooks/useVotingApplicationData";

import { Button } from "@/components/ui/button";
import { GuildBadge } from "@/components/ui/guild";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Linkedin,
  Github,
  FileText,
  ExternalLink,
  User,
  ScrollText,
  Briefcase,
  Calendar,
  Coins,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Vote,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { StructuredApplicationDisplay } from "@/components/StructuredApplicationDisplay";
import { CommitRevealPhaseIndicator } from "@/components/CommitRevealPhaseIndicator";
import { VotingInterface } from "@/components/expert/VotingInterface";
import { FinalizedView } from "@/components/expert/FinalizedView";
import type { CandidateProfile, GuildApplication } from "@/types";

interface VotingApplicationPageProps {
  applicationId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ─────────────────────────────────────────────────────────────────────
// Candidate profile section (full)
// ─────────────────────────────────────────────────────────────────────
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
      {profile.headline && (
        <p className="text-base text-foreground font-medium leading-relaxed">
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
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
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
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
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
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
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
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-primary/30 hover:text-primary transition-colors"
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

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────
export default function VotingApplicationPage({
  applicationId,
}: VotingApplicationPageProps) {
  const router = useRouter();
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;

  const [showVoting, setShowVoting] = useState(false);
  const { execute: executeVote, isLoading: isSubmittingVote } = useApi();
  const {
    application,
    expertData,
    candidateProfile,
    isStakedInGuild,
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
    if (!isStakedInGuild) {
      toast.error("You must stake VETD tokens in this guild to vote");
      return;
    }
    await executeVote(
      () => guildApplicationsApi.vote(applicationId, {
        expertId: expertData.id,
        score,
        stakeAmount,
        comment,
      }),
      {
        onSuccess: () => {
          toast.success("Score submitted successfully!");
          setShowVoting(false);
          loadApplication();
        },
        onError: (errorMsg) => {
          toast.error(errorMsg || "Failed to submit score");
        },
      }
    );
  };

  const handleCommit = () => {
    loadPhaseStatus();
    loadApplication();
  };

  /* -- loading state -- */
  if (loading) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        role="status"
        aria-label="Loading application"
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Application not found
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  /* -- derived values -- */
  const isFinalized = application.finalized;
  const isConsensusFailed = application.consensus_failed && !isFinalized;
  const isTiebreakerReviewer = application.is_tiebreaker_reviewer;
  const isReviewer = application.is_assigned_reviewer || !!isTiebreakerReviewer;
  const hasVoted = application.has_voted;
  const showVotingInterface = !isFinalized && isReviewer;
  const canVote = !!isReviewer && !hasVoted && !isFinalized && isStakedInGuild;

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to queue
          </button>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
            Voting · Application #{application.id.slice(0, 8)}
          </p>
        </div>

        {/* Workspace */}
        {!isFinalized ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT — Candidate dossier */}
            <div className="lg:col-span-2 space-y-6">
              <CandidateHero
                application={application}
                candidateProfile={candidateProfile}
                isConsensusFailed={!!isConsensusFailed}
                isTiebreakerRequired={!!application.tiebreaker_required}
              />

              {/* Staking warning lives in the dossier flow */}
              {!isStakedInGuild && isReviewer && (
                <div
                  className={cn(
                    "rounded-xl border p-4",
                    STATUS_COLORS.warning.border,
                    STATUS_COLORS.warning.bgSubtle
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={cn("w-5 h-5 mt-0.5", STATUS_COLORS.warning.text)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground mb-1">
                        Staking required to vote
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You must stake VETD tokens in this guild to submit your
                        score on this application.
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        router.push(`/expert/guild/${application.guild_id}`)
                      }
                    >
                      Stake VETD
                    </Button>
                  </div>
                </div>
              )}

              {candidateProfile &&
                (candidateProfile.bio ||
                  candidateProfile.headline ||
                  candidateProfile.linkedIn ||
                  candidateProfile.github ||
                  candidateProfile.resumeUrl ||
                  (candidateProfile.socialLinks &&
                    candidateProfile.socialLinks.length > 0)) && (
                  <Section
                    icon={<User className="w-4 h-4" />}
                    title="Candidate profile"
                  >
                    <CandidateProfileSection
                      profile={candidateProfile}
                      candidateId={application.candidate_id}
                    />
                  </Section>
                )}

              <Section
                icon={<ScrollText className="w-4 h-4" />}
                title="Application"
              >
                <StructuredApplicationDisplay
                  application={application}
                  compact={false}
                  showHeader={false}
                />
              </Section>
            </div>

            {/* RIGHT — Voting rail */}
            <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
              <VotingPhasePanel
                application={application}
                crPhase={crPhase}
              />

              {showVotingInterface && (
                <VotingInterface
                  application={application}
                  crPhase={crPhase}
                  expertId={expertData?.id}
                  expertWallet={expertData?.walletAddress ?? address ?? undefined}
                  hasVoted={!!hasVoted}
                  meetsMinimumStake={canVote}
                  showVoting={showVoting}
                  isSubmittingVote={isSubmittingVote}
                  onToggleVoting={setShowVoting}
                  onVote={handleVote}
                  onCommit={handleCommit}
                />
              )}

              {!showVotingInterface && !isReviewer && (
                <SidebarCard title="Reviewer status">
                  <div className="text-center py-2">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You aren&apos;t assigned as a reviewer for this
                      application.
                    </p>
                  </div>
                </SidebarCard>
              )}
            </aside>
          </div>
        ) : (
          /* Finalized layout — preserves existing behavior */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CandidateHero
                application={application}
                candidateProfile={candidateProfile}
                isConsensusFailed={false}
                isTiebreakerRequired={false}
              />

              <FinalizedView
                application={application}
                voteHistory={voteHistory}
                candidateProfile={candidateProfile}
                wallet={address}
                expertId={expertData?.id}
                CandidateProfileSection={CandidateProfileSection}
              />
            </div>
            <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
              <SidebarCard title="Outcome">
                <FinalizedSummary application={application} />
              </SidebarCard>

              <SidebarCard title="Application meta">
                <KeyValue
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Applied"
                  value={new Date(application.created_at).toLocaleDateString()}
                />
                {application.finalized_at && (
                  <KeyValue
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    label="Finalized"
                    value={new Date(
                      application.finalized_at
                    ).toLocaleDateString()}
                  />
                )}
                <KeyValue
                  icon={<Vote className="w-3.5 h-3.5" />}
                  label="Total votes"
                  value={`${application.vote_count}`}
                />
                <KeyValue
                  icon={<Coins className="w-3.5 h-3.5" />}
                  label="Required stake"
                  value={`${application.required_stake} VETD`}
                />
              </SidebarCard>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Candidate hero card — top of left column
// ─────────────────────────────────────────────────────────────────────
interface CandidateHeroProps {
  application: GuildApplication;
  candidateProfile: CandidateProfile | null;
  isConsensusFailed: boolean;
  isTiebreakerRequired: boolean;
}

function CandidateHero({
  application,
  candidateProfile,
  isConsensusFailed,
  isTiebreakerRequired,
}: CandidateHeroProps) {
  const initial =
    application.candidate_name?.charAt(0).toUpperCase() || "?";
  const headline = candidateProfile?.headline;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.22),transparent_60%)]" />
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <GuildBadge guild={application.guild_name} size="sm" />
          {application.finalized ? (
            application.outcome === "approved" ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-md",
                  STATUS_COLORS.positive.bgSubtle,
                  STATUS_COLORS.positive.text,
                  STATUS_COLORS.positive.border,
                  "border"
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                Approved
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-md",
                  STATUS_COLORS.negative.bgSubtle,
                  STATUS_COLORS.negative.text,
                  STATUS_COLORS.negative.border,
                  "border"
                )}
              >
                <XCircle className="w-3 h-3" />
                Rejected
              </span>
            )
          ) : isConsensusFailed ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-md",
                STATUS_COLORS.warning.bgSubtle,
                STATUS_COLORS.warning.text,
                STATUS_COLORS.warning.border,
                "border"
              )}
            >
              {isTiebreakerRequired ? "Tiebreaker pending" : "Consensus failed"}
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-md",
                STATUS_COLORS.warning.bgSubtle,
                STATUS_COLORS.warning.text,
                STATUS_COLORS.warning.border,
                "border"
              )}
            >
              Voting open
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 sm:px-8 -mt-10 relative pb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-card border-2 border-border shadow-md grid place-items-center flex-shrink-0">
            <span className="text-3xl font-bold font-display text-primary">
              {initial}
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display truncate">
              {application.candidate_name}
            </h1>
            {headline && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {headline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pill icon={<Mail className="w-3.5 h-3.5" />}>
            <span className="truncate max-w-[220px] inline-block align-middle">
              {application.candidate_email}
            </span>
          </Pill>
          {(application.years_of_experience ?? 0) > 0 && (
            <Pill icon={<Briefcase className="w-3.5 h-3.5" />}>
              {application.years_of_experience} yrs
            </Pill>
          )}
          <Pill icon={<Calendar className="w-3.5 h-3.5" />}>
            Applied {new Date(application.created_at).toLocaleDateString()}
          </Pill>
          {!application.finalized && (
            <Pill icon={<Clock className="w-3.5 h-3.5" />}>
              Closes {formatDeadline(application.voting_deadline)}
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Voting phase panel (sticky rail) — countdown + progress + tiebreaker note
// ─────────────────────────────────────────────────────────────────────
interface VotingPhasePanelProps {
  application: GuildApplication;
  crPhase: ReturnType<typeof useVotingApplicationData>["crPhase"];
}

function VotingPhasePanel({ application, crPhase }: VotingPhasePanelProps) {
  const isCommitReveal = crPhase && crPhase.phase !== "direct";
  const totalReviewers =
    application.assigned_reviewer_count ?? crPhase?.totalExpected ?? 0;
  const votedCount = application.vote_count ?? 0;

  const phaseLabel =
    crPhase?.phase === "commit"
      ? "Commit phase"
      : crPhase?.phase === "finalized"
      ? "Finalized"
      : "Voting";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {phaseLabel}
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] border",
            STATUS_COLORS.warning.bgSubtle,
            STATUS_COLORS.warning.text,
            STATUS_COLORS.warning.border
          )}
        >
          <Clock className="w-3 h-3" />
          {formatDeadline(application.voting_deadline)}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {isCommitReveal ? (
          <CommitRevealPhaseIndicator
            currentPhase={crPhase!.phase}
            commitDeadline={crPhase!.commitDeadline}
            commitCount={crPhase!.commitCount}
            totalExpected={
              crPhase!.totalExpected ?? application.assigned_reviewer_count
            }
          />
        ) : (
          <>
            <KeyValue
              icon={<Users className="w-3.5 h-3.5" />}
              label="Reviewers voted"
              value={`${votedCount} / ${totalReviewers || "?"}`}
            />
            {totalReviewers > 0 && (
              <div className="w-full h-1.5 rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (votedCount / Math.max(totalReviewers, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
            <KeyValue
              icon={<Coins className="w-3.5 h-3.5" />}
              label="Required stake"
              value={`${application.required_stake} VETD`}
            />
          </>
        )}

        {application.is_tiebreaker_reviewer && !application.has_voted && (
          <div
            className={cn(
              "rounded-lg p-3 border",
              STATUS_COLORS.info.bgSubtle,
              STATUS_COLORS.info.border
            )}
          >
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-[0.14em]",
                STATUS_COLORS.info.text
              )}
            >
              Tiebreaker
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Scores were split. Your vote determines the final outcome.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Finalized summary (sidebar) — compact outcome chip + my-vote
// ─────────────────────────────────────────────────────────────────────
function FinalizedSummary({ application }: { application: GuildApplication }) {
  const approved = application.outcome === "approved";

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg p-4 border text-center",
          approved
            ? cn(STATUS_COLORS.positive.bgSubtle, STATUS_COLORS.positive.border)
            : cn(STATUS_COLORS.negative.bgSubtle, STATUS_COLORS.negative.border)
        )}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em]",
            approved ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
          )}
        >
          {approved ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          {approved ? "Approved" : "Rejected"}
        </div>
        {application.consensus_score !== undefined && (
          <p className="mt-2 text-2xl font-bold font-display text-foreground tabular-nums">
            {application.consensus_score.toFixed(1)}
            <span className="text-sm text-muted-foreground font-medium">
              {" "}
              / 100
            </span>
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          Consensus across {application.vote_count} reviewer
          {application.vote_count === 1 ? "" : "s"}
        </p>
      </div>

      {application.my_vote_score !== undefined && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Your score
          </p>
          <p className="text-xl font-bold font-display text-foreground tabular-nums mt-0.5">
            {application.my_vote_score}
            <span className="text-xs text-muted-foreground font-medium">
              /100
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers — Section, SidebarCard, KeyValue, Pill
// ─────────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-medium text-foreground">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}
