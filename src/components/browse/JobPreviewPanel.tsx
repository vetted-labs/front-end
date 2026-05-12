"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Bookmark,
  Briefcase,
  Calendar,
  CheckCircle2,
  ExternalLink as ExternalLinkIcon,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { Button } from "@/components/ui/button";
import { jobsApi, getAssetUrl } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildIconName } from "@/lib/guildHelpers";
import { getGuildBadgeColors, STATUS_COLORS } from "@/config/colors";
import {
  cn,
  formatSalaryRange,
  formatTimeAgo,
  stripMarkdown,
} from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface JobPreviewPanelProps {
  jobId: string | null;
  hasApplied: boolean;
  showApplyState: boolean;
}

export function JobPreviewPanel({
  jobId,
  hasApplied,
  showApplyState,
}: JobPreviewPanelProps) {
  const router = useRouter();

  const { data: job, isLoading, error } = useFetch(
    () => jobsApi.getById(jobId!),
    {
      skip: !jobId,
      onError: (err) => {
        logger.error("Failed to load job preview", err, { silent: true });
        toast.error("Failed to load job");
      },
    },
  );

  if (!jobId) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Select a job to preview it here.
      </div>
    );
  }

  if (isLoading && !job) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-destructive mb-3">
          {error ?? "Job not found."}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/browse/jobs")}
        >
          Back to jobs
        </Button>
      </div>
    );
  }

  const heroUrl = job.heroImageUrl ? getAssetUrl(job.heroImageUrl) : null;
  const logoUrl = job.companyLogo
    ? getAssetUrl(job.companyLogo)
    : getCompanyAvatar(job.companyName);
  const guildIconName = getGuildIconName(job.guild ?? "");
  const guildColors = job.guild ? getGuildBadgeColors(job.guild) : null;
  const guildLabel = job.guild?.replace(/ Guild$/i, "") ?? null;
  const questions = job.applicationQuestions ?? [];
  const skills = job.skills ?? [];
  const gallery = job.galleryUrls ?? [];

  const descriptionExcerpt = job.description
    ? stripMarkdown(job.description)
        .split(/\n+/)
        .filter((p) => p.trim().length > 0)
        .slice(0, 3)
        .join("\n\n")
    : "";

  const detailHref = `/browse/jobs/${job.id}`;
  const applyHref = detailHref;

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Hero strip */}
      <div className="relative h-32 sm:h-36 overflow-hidden">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/[0.06] to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
      </div>

      <div className="px-5 sm:px-6 -mt-9 relative pb-5">
        {/* Logo + title */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-white border border-border p-1.5 flex-shrink-0 shadow-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- backend-served upload */}
            <img
              src={logoUrl}
              alt={job.companyName ? `${job.companyName} logo` : "Company logo"}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              {job.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {[job.companyName, job.department].filter(Boolean).join(" · ")}
              {job.companyName && (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Posted {formatTimeAgo(job.createdAt)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Meta pill row */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Pill icon={<MapPin className="w-3 h-3" />}>
            {job.location || "—"}
            {job.locationType ? ` · ${job.locationType}` : ""}
          </Pill>
          <Pill icon={<Briefcase className="w-3 h-3" />}>{job.type}</Pill>
          <SalaryPill salary={formatSalaryRange(job.salary)} />
          {job.experienceLevel && (
            <Pill icon={<GraduationCap className="w-3 h-3" />} capitalize>
              {job.experienceLevel}
            </Pill>
          )}
          {guildColors && guildLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border",
                guildColors.bg,
                guildColors.text,
                guildColors.border,
              )}
            >
              <VettedIcon name={guildIconName} className="w-3 h-3" />
              {guildLabel} Guild
            </span>
          )}
          {questions.length > 0 && (
            <Pill icon={<HelpCircle className="w-3 h-3" />}>
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </Pill>
          )}
        </div>

        {/* About */}
        {descriptionExcerpt && (
          <Section title="About this role">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
              {descriptionExcerpt}
            </p>
          </Section>
        )}

        {/* Top skills */}
        {skills.length > 0 && (
          <Section
            title="Top skills"
            icon={<Sparkles className="w-3 h-3" />}
          >
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 8).map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="px-2.5 py-1 text-xs text-muted-foreground">
                  +{skills.length - 8} more
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Application question summary */}
        {questions.length > 0 && (
          <Section
            title="Application form"
            icon={<HelpCircle className="w-3 h-3" />}
            meta={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
          >
            <ul className="space-y-1.5">
              {questions.slice(0, 3).map((q, i) => (
                <li
                  key={q.id || i}
                  className="text-sm text-muted-foreground leading-snug flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span className="line-clamp-1">
                    {i + 1}. {q.label}
                  </span>
                </li>
              ))}
              {questions.length > 3 && (
                <li className="text-xs text-muted-foreground/70 pl-4">
                  +{questions.length - 3} more in the full role page
                </li>
              )}
            </ul>
          </Section>
        )}

        {/* Gallery thumbnails */}
        {gallery.length > 0 && (
          <Section
            title="Gallery"
            icon={<ImageIcon className="w-3 h-3" />}
            meta={gallery.length > 3 ? `+${gallery.length - 3}` : undefined}
          >
            <div className="grid grid-cols-3 gap-2">
              {gallery.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                  <img
                    src={url}
                    alt={`Gallery ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="mt-6 pt-5 border-t border-border space-y-3">
          {showApplyState && hasApplied ? (
            <div
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold cursor-not-allowed",
                STATUS_COLORS.positive.bgSubtle,
                STATUS_COLORS.positive.text,
                STATUS_COLORS.positive.border,
                "border",
              )}
              aria-disabled
            >
              <CheckCircle2 className="w-4 h-4" />
              Applied
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={applyHref}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Apply
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted/40 transition-colors"
                onClick={() => toast("Saved roles coming soon")}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          )}

          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View full role
            <ExternalLinkIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── tiny inline helpers — Pill / Section / SalaryPill ───────────────── */

function Pill({
  icon,
  capitalize,
  children,
}: {
  icon?: React.ReactNode;
  capitalize?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border text-[11px] font-medium text-foreground",
        capitalize && "capitalize",
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}

function SalaryPill({ salary }: { salary: string }) {
  if (!salary || salary === "Salary not specified") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary tracking-tight">
      <Banknote className="w-3 h-3" />
      {salary}
      <span className="font-medium text-muted-foreground/60">/ year</span>
    </span>
  );
}

function Section({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h4>
        {meta && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
