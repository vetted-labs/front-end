"use client";

import { Award, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPersonAvatar } from "@/lib/avatars";
import { STATUS_COLORS } from "@/config/colors";
import { useCountdown } from "@/lib/hooks/useCountdown";
import type { EndorsementApplication } from "@/types";

export interface EndorsementSnapshotCardProps {
  application: EndorsementApplication;
}

/**
 * Right-pane snapshot for the endorse modal. Keeps "who am I about to stake on"
 * + the bid clock within glance distance while the center column owns the
 * step-specific content.
 */
export function EndorsementSnapshotCard({ application }: EndorsementSnapshotCardProps) {
  const initials = application.candidate_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const guildScore = application.guild_score
    ? parseFloat(application.guild_score.toString()).toFixed(0)
    : null;

  const skills = application.job_skills
    ? Array.isArray(application.job_skills)
      ? application.job_skills
      : application.job_skills.split(",").map((s) => s.trim())
    : [];
  const topSkills = skills.slice(0, 4);
  const extraSkillCount = Math.max(0, skills.length - topSkills.length);

  const { label: countdownLabel, isExpired, isUrgent } = useCountdown(
    application.bidding_deadline,
    { fallbackStart: application.applied_at, expiredLabel: "Bidding closed" },
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
        Candidate
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-[2px] bg-primary/70" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 rounded-lg shrink-0">
              <AvatarImage
                src={
                  application.candidate_profile_picture_url ||
                  getPersonAvatar(application.candidate_name)
                }
                alt={application.candidate_name}
                className="rounded-lg"
              />
              <AvatarFallback className="rounded-lg bg-primary/15 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold text-foreground leading-tight truncate"
                title={application.candidate_name}
              >
                {application.candidate_name}
              </p>
              <p
                className="text-[11px] text-muted-foreground truncate mt-0.5"
                title={application.candidate_headline}
              >
                {application.candidate_headline}
              </p>
            </div>
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex items-baseline gap-2 min-w-0">
              <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                Role
              </dt>
              <dd
                className="text-foreground truncate flex-1 min-w-0"
                title={`${application.job_title} · ${application.company_name}`}
              >
                {application.job_title} · {application.company_name}
              </dd>
            </div>
            {application.experience_level && (
              <div className="flex items-baseline gap-2 min-w-0">
                <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                  Level
                </dt>
                <dd className="text-foreground flex-1 min-w-0 capitalize">
                  {application.experience_level}
                </dd>
              </div>
            )}
            {topSkills.length > 0 && (
              <div className="flex items-baseline gap-2 min-w-0">
                <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                  Skills
                </dt>
                <dd
                  className="text-foreground flex-1 min-w-0 truncate"
                  title={skills.join(" · ")}
                >
                  {topSkills.join(" · ")}
                  {extraSkillCount > 0 && (
                    <span className="text-muted-foreground/70"> +{extraSkillCount}</span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {guildScore && (
            <div className="flex items-center justify-between rounded-lg bg-muted/20 border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Guild score
                </span>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">
                {guildScore}
                <span className="text-[10px] text-muted-foreground font-normal">/100</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`rounded-xl border p-3 flex items-center gap-2.5 ${
          isExpired
            ? `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle}`
            : isUrgent
              ? `${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`
              : "border-border bg-muted/20"
        }`}
      >
        <Clock
          className={`w-3.5 h-3.5 shrink-0 ${
            isExpired
              ? STATUS_COLORS.negative.icon
              : isUrgent
                ? STATUS_COLORS.warning.icon
                : "text-muted-foreground"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Bidding window
          </p>
          <p
            className={`text-xs font-medium tabular-nums ${
              isExpired
                ? STATUS_COLORS.negative.text
                : isUrgent
                  ? STATUS_COLORS.warning.text
                  : "text-foreground"
            }`}
          >
            {countdownLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
