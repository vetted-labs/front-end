"use client";

import {
  FileText,
  ExternalLink,
  Linkedin,
  Globe,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getPlatformIcon } from "@/lib/social-links";
import type { SocialLink } from "@/types";

interface ReviewProfileStepApplication {
  fullName: string;
  email: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  bio?: string;
  motivation?: string;
  expertiseAreas?: string[];
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  socialLinks?: SocialLink[];
}

export interface ReviewProfileStepProps {
  application: ReviewProfileStepApplication;
  level: string;
}


export function ReviewProfileStep({ application, level }: ReviewProfileStepProps) {
  const displayName = application.fullName;
  const displayTitle = application.currentTitle;
  const displayCompany = application.currentCompany;

  const initials = displayName
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-5">

      {/* Applicant Header Card — accent bar style */}
      <div className="border border-white/[0.06] rounded-2xl bg-card/40 backdrop-blur-md overflow-hidden">
        {/* Orange gradient accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-primary to-primary/30" />

        <div className="p-6 space-y-5">
          {/* Profile header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
              <span className="text-lg font-extrabold text-white tracking-tight">
                {initials}
              </span>
            </div>

            {/* Name + badge + email */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                  {displayName}
                </h3>
                {level && (
                  <span className="px-2.5 py-0.5 bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {level}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{application.email}</p>
            </div>
          </div>

          {/* Info grid */}
          {((displayTitle || displayCompany) || (application.yearsOfExperience != null && application.yearsOfExperience > 0)) && (
            <div className="grid grid-cols-2 gap-3">
              {(displayTitle || displayCompany) && (
                <div className="border border-border/40 rounded-lg bg-muted/20 p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Position
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {`${application.currentTitle ?? ""}${application.currentCompany ? ` at ${application.currentCompany}` : ""}`}
                  </p>
                </div>
              )}
              {application.yearsOfExperience != null && application.yearsOfExperience > 0 && (
                <div className="border border-border/40 rounded-lg bg-muted/20 p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Experience
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {application.yearsOfExperience} years
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Links */}
          {(application.resumeUrl || application.socialLinks?.some((l) => l.url?.trim()) || application.linkedinUrl || application.portfolioUrl) && (
            <div className="flex flex-wrap gap-2.5">
              {application.resumeUrl && (
                <a
                  href={getAssetUrl(application.resumeUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/40 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  Resume / CV
                  <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity" />
                </a>
              )}
              {/* Dynamic social links (with fallback to legacy fields) */}
              {(application.socialLinks && application.socialLinks.length > 0)
                ? application.socialLinks
                    .filter((link) => link.url?.trim())
                    .map((link, idx) => {
                      const Icon = getPlatformIcon(link.platform);
                      return (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/40 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {link.label}
                          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity" />
                        </a>
                      );
                    })
                : (
                  <>
                    {application.linkedinUrl && (
                      <a
                        href={application.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/40 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
                      >
                        <Linkedin className="w-3.5 h-3.5 shrink-0" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                    {application.portfolioUrl && (
                      <a
                        href={application.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/40 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        Portfolio
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                  </>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Bio & Motivation — preserved even when anonymized (content-based evaluation) */}
      <div className="grid gap-4">
        {application.bio && (
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-2">Bio</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {application.bio}
            </p>
          </div>
        )}
        {application.motivation && (
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-2">Motivation</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {application.motivation}
            </p>
          </div>
        )}
      </div>

      {/* Expertise Areas — preserved (skills-based evaluation) */}
      {application.expertiseAreas && application.expertiseAreas.length > 0 && (
        <div>
          <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-3">
            Expertise Areas
          </p>
          <div className="flex flex-wrap gap-2">
            {application.expertiseAreas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-muted/50 text-foreground text-xs font-medium rounded-lg border border-border"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
