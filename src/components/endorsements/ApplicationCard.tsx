import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Eye, Users } from 'lucide-react';
import { useMemo } from 'react';
import { formatSalaryRange } from "@/lib/utils";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { getMatchScoreColors, getUrgencyColors } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import type { EndorsementApplication } from "@/types";

interface ApplicationCardProps {
  application: EndorsementApplication;
  onViewDetails: (application: EndorsementApplication) => void;
  onQuickEndorse?: (application: EndorsementApplication) => void;
}

const MATCH_RING_CIRCUMFERENCE = 2 * Math.PI * 27;

function MatchScoreAvatar({
  initials,
  profilePicture,
  candidateName,
  score,
}: {
  initials: string;
  profilePicture?: string | null;
  candidateName: string;
  score: number | null;
}) {
  const matchColors = getMatchScoreColors(score ?? 50);
  const offset = score !== null ? MATCH_RING_CIRCUMFERENCE - (score / 100) * MATCH_RING_CIRCUMFERENCE : MATCH_RING_CIRCUMFERENCE;

  const strokeColorClass = score !== null && score >= 70
    ? "stroke-positive"
    : score !== null && score >= 40
    ? "stroke-warning"
    : "stroke-negative";

  return (
    <div className="relative shrink-0">
      <Avatar className="w-[52px] h-[52px] rounded-full z-[2] relative">
        <AvatarImage src={profilePicture || getPersonAvatar(candidateName)} alt={candidateName} className="rounded-full" />
        <AvatarFallback className={`rounded-full text-base font-bold ${matchColors.bgSubtle} text-foreground`}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Match ring */}
      {score !== null && (
        <div className="absolute inset-[-4px] rounded-full z-[1]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="27" fill="none" strokeWidth="3" className="stroke-white/[0.06]" />
            <circle
              cx="30" cy="30" r="27"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={MATCH_RING_CIRCUMFERENCE}
              strokeDashoffset={offset}
              className={`${strokeColorClass} transition-[stroke-dashoffset] duration-600 ease-out`}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function MatchScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  const colorClass = score >= 70
    ? "text-positive bg-positive/15 border-positive/30"
    : score >= 40
    ? "text-warning bg-warning/15 border-warning/30"
    : "text-negative bg-negative/15 border-negative/30";

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
      {score}% match
    </span>
  );
}

export function ApplicationCard({ application, onViewDetails, onQuickEndorse }: ApplicationCardProps) {
  const { label: countdownLabel, isExpired, remaining } = useCountdown(
    application.bidding_deadline,
    { fallbackStart: application.applied_at, expiredLabel: "Bidding closed" },
  );

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const skillsArray = useMemo(() => {
    if (!application.job_skills) return [];
    try {
      if (Array.isArray(application.job_skills)) return application.job_skills;
      return application.job_skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }, [application.job_skills]);

  const rawGuildScore = application.guild_score ? parseFloat(application.guild_score.toString()) : null;
  const guildScore = rawGuildScore && rawGuildScore > 0 ? Math.round(rawGuildScore) : null;

  // Countdown urgency
  const hoursLeft = isExpired ? 0 : Math.floor(remaining / (1000 * 60 * 60));
  const isBlindBidding = !isExpired && hoursLeft > 24;
  const countdownStyles = isExpired
    ? 'bg-muted/50 text-muted-foreground border-border'
    : getUrgencyColors(hoursLeft);

  const salaryDisplay = (application.salary_min || application.salary_max)
    ? formatSalaryRange({ min: application.salary_min, max: application.salary_max, currency: application.salary_currency })
    : null;

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-xl border h-full ${
      isExpired
        ? 'border-border/50 bg-card dark:bg-muted/5'
        : 'border-border bg-card dark:bg-muted/20 transition-all duration-300 hover:translate-y-[-4px] hover:border-primary/20 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(249,115,22,0.08),0_0_32px_-8px_rgba(249,115,22,0.06)]'
    }`}>
      {/* Closed badge */}
      {isExpired && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            Closed
          </span>
        </div>
      )}

      {/* Top section: Avatar with match ring + candidate info */}
      <div className="flex items-start gap-4 px-5 pt-5">
        <MatchScoreAvatar
          score={guildScore}
          initials={candidateInitials}
          profilePicture={application.candidate_profile_picture_url}
          candidateName={application.candidate_name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm leading-snug text-foreground">
              {application.candidate_name}
            </h3>
            <MatchScoreBadge score={guildScore} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {application.candidate_headline}
          </p>
          {/* Skills */}
          {skillsArray.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {skillsArray.slice(0, 3).map((skill: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-px text-xs font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
              {skillsArray.length > 3 && (
                <span className="px-1.5 py-px text-xs text-muted-foreground/50">
                  +{skillsArray.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job section */}
      <div className="px-5 py-3.5 border-t border-border mt-3.5">
        <p className="font-medium text-sm text-foreground truncate">
          {application.job_title}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {application.company_name}
          {application.location ? ` · ${application.location}` : ''}
        </p>
        {salaryDisplay && (
          <p className="font-mono text-xs text-muted-foreground/50 mt-1">
            {salaryDisplay}
          </p>
        )}
      </div>

      {/* Deadline bar */}
      <div className="px-5 py-2.5 bg-card flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 font-mono text-xs font-medium ${
          isBlindBidding ? 'text-warning' : isExpired ? 'text-muted-foreground' : hoursLeft < 6 ? 'text-primary' : 'text-muted-foreground'
        }`}>
          {isBlindBidding ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] bg-warning/10 border border-warning/20 px-1.5 py-px rounded text-warning">
                BLIND BIDDING
              </span>
              {countdownLabel}
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              {countdownLabel}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-3 text-xs text-muted-foreground/40">
          {(application.endorsement_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              {application.endorsement_count}
            </span>
          )}
          Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
        </span>
      </div>

      {/* Action buttons */}
      <div className="px-5 py-3.5 flex gap-3 mt-auto">
        <Button
          variant="ghost"
          className="flex-1 h-10 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted/30 hover:border-border hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(application);
          }}
        >
          View Details
        </Button>
        {isExpired ? (
          <div className="flex-1 h-10 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50 font-medium">
            <Clock className="w-3 h-3" />
            Bidding Closed
          </div>
        ) : (
          <Button
            className="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-[0_2px_12px_-3px_hsl(var(--primary)/0.3)] hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all"
            disabled={!onQuickEndorse}
            onClick={(e) => {
              e.stopPropagation();
              onQuickEndorse?.(application);
            }}
          >
            Endorse
          </Button>
        )}
      </div>
    </div>
  );
}
