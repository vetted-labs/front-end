"use client";

import { Linkedin, Github, FileText, ExternalLink, User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPersonAvatar } from "@/lib/avatars";
import { ensureHttps, truncateAddress } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { EndorsementApplication } from "@/types";

export interface CandidateProfileStepProps {
  application: EndorsementApplication;
}

export function CandidateProfileStep({ application }: CandidateProfileStepProps) {
  const initials = application.candidate_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const resumeHref = application.resume_url
    ? `${process.env.NEXT_PUBLIC_API_URL || ""}/api/candidates/${application.candidate_id}/resume`
    : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-1.5">
          Step 2 · Candidate
        </p>
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14 rounded-xl border border-primary/20 shadow-sm">
            <AvatarImage
              src={
                application.candidate_profile_picture_url ||
                getPersonAvatar(application.candidate_name)
              }
              alt={application.candidate_name}
              className="rounded-xl"
            />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-display font-bold text-foreground leading-tight">
              {application.candidate_name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {application.candidate_headline}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {application.experience_level && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/30 border border-border text-foreground capitalize">
                  {application.experience_level}
                </span>
              )}
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${STATUS_COLORS.positive.badge}`}
              >
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted/20 border border-border p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <User className="w-3 h-3" />
          Bio
        </h4>
        {application.candidate_bio ? (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {application.candidate_bio}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No bio provided.</p>
        )}
      </div>

      <div className="rounded-xl bg-muted/20 border border-border p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Materials & links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {resumeHref ? (
            <a
              href={resumeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">CV / Resume</span>
                <span className="block text-sm font-medium text-foreground truncate">
                  View document
                </span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </a>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">CV / Resume</span>
                <span className="block text-sm italic text-muted-foreground">Not provided</span>
              </span>
            </div>
          )}

          {application.linkedin && (
            <a
              href={ensureHttps(application.linkedin)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Linkedin className="w-4 h-4 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">LinkedIn</span>
                <span className="block text-sm font-medium text-foreground truncate">
                  View profile
                </span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </a>
          )}

          {application.github && (
            <a
              href={ensureHttps(application.github)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Github className="w-4 h-4 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">GitHub</span>
                <span className="block text-sm font-medium text-foreground truncate">
                  View profile
                </span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </a>
          )}

          {application.candidate_wallet && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">Wallet</span>
                <span className="block text-sm font-mono text-foreground truncate">
                  {truncateAddress(application.candidate_wallet)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
