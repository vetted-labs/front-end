import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { useMemo } from 'react';
import { formatSalaryRange } from "@/lib/utils";
import { useCountdown } from "@/lib/hooks/useCountdown";
import type { EndorsementApplication } from "@/types";

interface ApplicationCardProps {
  application: EndorsementApplication;
  onViewDetails: (application: EndorsementApplication) => void;
  onQuickEndorse?: (application: EndorsementApplication) => void;
}

type ScoreTier = 'high' | 'mid' | 'low';

function getScoreTier(score: number): ScoreTier {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

const TIER_COLORS: Record<ScoreTier, { accent: string; glow: string; text: string; border: string; avatarBg: string }> = {
  high: {
    accent: 'from-green-500 to-green-500/30',
    glow: 'shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    text: 'text-green-500',
    border: 'border-green-500/20',
    avatarBg: 'bg-gradient-to-br from-green-500/15 to-green-500/5 border-green-500/20',
  },
  mid: {
    accent: 'from-amber-500 to-amber-500/30',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
    avatarBg: 'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/20',
  },
  low: {
    accent: 'from-rose-500 to-rose-500/30',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    text: 'text-rose-500',
    border: 'border-rose-500/20',
    avatarBg: 'bg-gradient-to-br from-rose-500/15 to-rose-500/5 border-rose-500/20',
  },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 19;

function ScoreRing({ score, tier }: { score: number; tier: ScoreTier }) {
  const offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;
  const strokeColor = {
    high: 'stroke-green-500',
    mid: 'stroke-amber-500',
    low: 'stroke-rose-500',
  }[tier];

  return (
    <div className="relative flex shrink-0 items-center justify-center w-[50px] h-[50px]">
      <div className={`absolute inset-[-4px] rounded-full opacity-0 blur-lg transition-opacity group-hover:opacity-100 ${
        tier === 'high' ? 'bg-green-500/15' : tier === 'mid' ? 'bg-amber-500/15' : 'bg-rose-500/15'
      }`} />
      <svg className="w-[50px] h-[50px] -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/[0.06]" />
        <circle
          cx="22" cy="22" r="19"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={strokeColor}
        />
      </svg>
      <span className={`absolute font-semibold text-sm ${TIER_COLORS[tier].text}`}>
        {score}
      </span>
    </div>
  );
}

export function ApplicationCard({ application, onViewDetails, onQuickEndorse }: ApplicationCardProps) {
  const { label: countdownLabel, isExpired, isUrgent, remaining } = useCountdown(
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
  const tier: ScoreTier = guildScore ? getScoreTier(guildScore) : 'mid';
  const tierColors = TIER_COLORS[tier];

  // Countdown color: urgent < 2h, mid < 6h, plenty >= 6h
  const countdownTier = isExpired
    ? 'expired'
    : isUrgent
    ? 'urgent'
    : remaining < 6 * 60 * 60 * 1000
    ? 'mid'
    : 'plenty';

  const countdownStyles = {
    expired: 'bg-muted/50 text-muted-foreground border-border/60',
    urgent: 'bg-rose-500/8 text-rose-500 border-rose-500/15',
    mid: 'bg-amber-500/8 text-amber-500 border-amber-500/15',
    plenty: 'bg-green-500/8 text-green-500 border-green-500/15',
  }[countdownTier];

  const salaryDisplay = (application.salary_min || application.salary_max)
    ? formatSalaryRange({ min: application.salary_min, max: application.salary_max, currency: application.salary_currency })
    : null;

  const jobMetaParts = [
    application.company_name,
    application.location,
    salaryDisplay,
  ].filter(Boolean);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-md transition-all duration-300 hover:translate-y-[-2px] hover:border-white/[0.12] hover:bg-card/60 hover:shadow-lg hover:shadow-black/20 h-full">
      {/* Accent Bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${tierColors.accent}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header: Avatar + Info + Score Ring */}
        <div className="mb-4 flex items-start gap-3.5">
          <Avatar className={`w-[46px] h-[46px] rounded-xl border ${tierColors.avatarBg}`}>
            {application.candidate_profile_picture_url && (
              <AvatarImage
                src={application.candidate_profile_picture_url}
                alt={application.candidate_name}
                className="rounded-xl"
              />
            )}
            <AvatarFallback className={`rounded-xl text-[15px] font-semibold ${tierColors.avatarBg}`}>
              {candidateInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] leading-tight text-foreground">
              {application.candidate_name}
            </h3>
            <p className="text-[12.5px] text-muted-foreground truncate mb-2">
              {application.candidate_headline}
            </p>
            {application.experience_level && (
              <Badge variant="outline" className="text-[10.5px] font-medium px-2.5 py-0 h-5 bg-white/[0.04] border-white/[0.08] text-muted-foreground capitalize">
                {application.experience_level}
              </Badge>
            )}
          </div>

          {guildScore !== null && (
            <ScoreRing score={guildScore} tier={tier} />
          )}
        </div>

        {/* Skills */}
        {skillsArray.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skillsArray.slice(0, 3).map((skill: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:bg-white/[0.05] group-hover:border-white/[0.10]"
              >
                {skill}
              </span>
            ))}
            {skillsArray.length > 3 && (
              <span className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground/60">
                +{skillsArray.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="mb-3.5 h-px bg-border/60" />

        {/* Job Section */}
        <div className="mb-3.5">
          <p className="font-medium text-[13px] text-foreground truncate">
            {application.job_title}
          </p>
          <p className="text-[11.5px] text-muted-foreground/60 truncate">
            {jobMetaParts.join(' · ')}
          </p>
        </div>

        {/* Footer: Applied time + Countdown */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">
            Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${countdownStyles}`}>
            <Clock className="w-3 h-3" />
            {countdownLabel}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="h-9 rounded-[10px] border border-white/[0.10] text-muted-foreground text-[13px] font-medium hover:bg-white/[0.04] hover:border-white/[0.18] hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(application);
            }}
          >
            Details
          </Button>
          <Button
            className="h-9 rounded-[10px] bg-gradient-to-br from-primary via-primary to-amber-700 text-[13px] font-semibold text-[hsl(var(--gradient-button-text))] hover:from-amber-400 hover:via-primary hover:to-primary"
            disabled={isExpired || !onQuickEndorse}
            onClick={(e) => {
              e.stopPropagation();
              onQuickEndorse?.(application);
            }}
          >
            Endorse
          </Button>
        </div>
      </div>
    </div>
  );
}
