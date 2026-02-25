"use client";

import {
  Briefcase,
  Clock,
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
  return (
    <div className="space-y-5">
      {/* Applicant Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.08),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {application.fullName}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{application.email}</p>
            </div>
            {level && (
              <span className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-primary border border-primary/30 text-xs font-bold rounded-full uppercase tracking-wider">
                {level}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(application.currentTitle || application.currentCompany) && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Position</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {application.currentTitle}{application.currentCompany ? ` at ${application.currentCompany}` : ""}
                  </p>
                </div>
              </div>
            )}
            {application.yearsOfExperience != null && application.yearsOfExperience > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Experience</p>
                  <p className="text-sm font-medium text-foreground">{application.yearsOfExperience} years</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2.5">
        {application.resumeUrl && (
          <a
            href={getAssetUrl(application.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-primary border border-primary/25 rounded-xl text-sm font-medium hover:border-primary/50 hover:shadow-sm transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            Resume / CV
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
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
                    className="group inline-flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm font-medium hover:border-border hover:text-foreground hover:bg-muted transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
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
                  className="group inline-flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm font-medium hover:border-border hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                  <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                </a>
              )}
              {application.portfolioUrl && (
                <a
                  href={application.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm font-medium hover:border-border hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  <Globe className="w-4 h-4" />
                  Portfolio
                  <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                </a>
              )}
            </>
          )}
      </div>

      {/* Bio & Motivation */}
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

      {/* Expertise Areas */}
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
