"use client";

import {
  FileText,
  ExternalLink,
  Linkedin,
  Globe,
  Download,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getPlatformIcon } from "@/lib/social-links";
import { getPersonAvatar } from "@/lib/avatars";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
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
  const isSyntheticResume = application.resumeUrl?.startsWith("demo://") ?? false;
  const resumeUrl = isSyntheticResume
    ? null
    : application.resumeUrl
      ? getAssetUrl(application.resumeUrl)
      : null;

  const displayName = application.fullName;
  const displayTitle = application.currentTitle;
  const displayCompany = application.currentCompany;

  const initials = displayName
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-6" {...dataTourTarget(TOUR_TARGETS.practiceReviewProfile)}>

      {/* Applicant Header Card — accent bar style */}
      <div className="border border-border rounded-xl bg-card overflow-hidden" {...dataTourTarget(TOUR_TARGETS.practiceReviewApplicantHeader)}>
        {/* Orange gradient accent bar */}
        <div className="h-[3px] bg-primary" />

        <div className="p-6 space-y-6">
          {/* Profile header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <img
              src={getPersonAvatar(displayName)}
              alt={displayName}
              className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
            />

            {/* Name + badge + email */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {displayName}
                </h3>
                {level && (
                  <span className="px-2.5 py-0.5 bg-primary/15 text-primary border border-primary/30 text-xs font-bold rounded-full uppercase tracking-wider">
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
                <div className="border border-border rounded-lg bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Position
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {`${application.currentTitle ?? ""}${application.currentCompany ? ` at ${application.currentCompany}` : ""}`}
                  </p>
                </div>
              )}
              {application.yearsOfExperience != null && application.yearsOfExperience > 0 && (
                <div className="border border-border rounded-lg bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Experience
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {application.yearsOfExperience} years
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Links */}
          {(application.resumeUrl || application.socialLinks?.some((l) => l.url?.trim()) || application.linkedinUrl || application.portfolioUrl) && (
            <div className="flex flex-wrap gap-3" {...dataTourTarget(TOUR_TARGETS.practiceReviewLinks)}>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-lg bg-muted/20 border border-border px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Download Resume
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
                          className="group inline-flex items-center gap-2 rounded-lg bg-muted/20 border border-border px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
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
                        className="group inline-flex items-center gap-2 rounded-lg bg-muted/20 border border-border px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
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
                        className="group inline-flex items-center gap-2 rounded-lg bg-muted/20 border border-border px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors duration-200"
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

          {/* Inline Resume Viewer */}
          {(resumeUrl || isSyntheticResume) && (
            <div
              className="rounded-xl border border-border bg-muted/10 overflow-hidden"
              aria-label={isSyntheticResume ? "Demo resume sample only" : undefined}
              {...dataTourTarget(TOUR_TARGETS.practiceReviewResume)}
            >
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resume / CV Preview
                </span>
              </div>
              {resumeUrl ? (
                <iframe
                  src={resumeUrl}
                  title="Resume preview"
                  className="w-full h-[500px] bg-white"
                />
              ) : (
                <div className="bg-white text-zinc-900 p-8 h-[500px] overflow-y-auto">
                  <div className="max-w-2xl mx-auto">
                    <div className="border-b border-zinc-200 pb-4 mb-5">
                      <h2 className="text-2xl font-bold tracking-tight">{displayName}</h2>
                      <p className="text-sm text-zinc-600 mt-1">
                        {displayTitle ?? "Senior Full-Stack Engineer"}
                        {displayCompany ? ` · ${displayCompany}` : ""}
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        San Francisco, CA · maya.chen@example.com · linkedin.com/in/mayachen
                      </p>
                    </div>

                    <section className="mb-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Summary</h3>
                      <p className="text-sm text-zinc-800 leading-relaxed">
                        {application.yearsOfExperience ?? 7}+ years building production
                        TypeScript and React systems. Led platform migrations, distributed
                        systems work, and team mentorship across mid-stage startups.
                      </p>
                    </section>

                    <section className="mb-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Experience</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-semibold">Senior Full-Stack Engineer · Northstar Labs</p>
                            <span className="text-xs text-zinc-500">2023 – present</span>
                          </div>
                          <ul className="mt-1 list-disc list-outside ml-5 text-sm text-zinc-800 space-y-1">
                            <li>Owned the migration from REST to a typed GraphQL gateway, cutting p95 latency 38%.</li>
                            <li>Designed an idempotent event pipeline (Kafka → Postgres) handling 4M events/day.</li>
                            <li>Mentored 3 mid-level engineers; ran the architecture review for the realtime team.</li>
                          </ul>
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-semibold">Software Engineer · Brightlane</p>
                            <span className="text-xs text-zinc-500">2020 – 2023</span>
                          </div>
                          <ul className="mt-1 list-disc list-outside ml-5 text-sm text-zinc-800 space-y-1">
                            <li>Shipped the multi-tenant billing rewrite (Stripe Connect), unblocking 20+ enterprise deals.</li>
                            <li>Wrote the company&apos;s first end-to-end test harness (Playwright + a fixture-driven seed).</li>
                          </ul>
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-semibold">Junior Engineer · Aperture Health</p>
                            <span className="text-xs text-zinc-500">2018 – 2020</span>
                          </div>
                          <ul className="mt-1 list-disc list-outside ml-5 text-sm text-zinc-800 space-y-1">
                            <li>Built the patient-facing scheduling UI; HIPAA-compliant audit trail for record access.</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section className="mb-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Skills</h3>
                      <p className="text-sm text-zinc-800">
                        {(application.expertiseAreas && application.expertiseAreas.length > 0
                          ? application.expertiseAreas
                          : ["TypeScript", "React", "Node.js", "Postgres", "AWS", "GraphQL"]
                        ).join(" · ")}
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Education</h3>
                      <p className="text-sm text-zinc-800">B.S. Computer Science · UC Berkeley · 2018</p>
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio & Motivation — preserved even when anonymized (content-based evaluation) */}
      <div className="grid gap-4">
        {application.bio && (
          <div className="rounded-xl border border-border bg-muted/30 p-6">
            <p className="text-xs text-warning/70 uppercase tracking-wider font-semibold mb-2">Bio</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {application.bio}
            </p>
          </div>
        )}
        {application.motivation && (
          <div className="rounded-xl border border-border bg-muted/30 p-6" {...dataTourTarget(TOUR_TARGETS.practiceReviewMotivation)}>
            <p className="text-xs text-warning/70 uppercase tracking-wider font-semibold mb-2">Motivation</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {application.motivation}
            </p>
          </div>
        )}
      </div>

      {/* Expertise Areas — preserved (skills-based evaluation) */}
      {application.expertiseAreas && application.expertiseAreas.length > 0 && (
        <div {...dataTourTarget(TOUR_TARGETS.practiceReviewExpertise)}>
          <p className="text-xs text-warning/70 uppercase tracking-wider font-semibold mb-3">
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
