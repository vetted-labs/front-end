"use client";

import { Check, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { Guild } from "@/types";
import type { JobFormData } from "@/hooks/useJobWizard";

interface StepReviewProps {
  formData: JobFormData;
  guilds: Guild[];
  validateStep: (step: number) => Record<string, string>;
  isSubmitting: boolean;
  onEdit: (step: number) => void;
  onPublish: () => void;
}

/** Step 7 — Two-column review with live preview and a publish sidebar. */
export function StepReview({
  formData,
  guilds,
  validateStep,
  isSubmitting,
  onEdit,
  onPublish,
}: StepReviewProps) {
  const guild = guilds.find((g) => g.id === formData.guild);
  const guildName = guild?.name ?? formData.guild ?? "—";
  const guildExpertCount = guild?.expertCount ?? 0;

  const skills = formData.skills?.filter(Boolean) ?? [];
  const requirements = formData.requirements?.filter(Boolean) ?? [];
  const questions = formData.applicationQuestions ?? [];

  // Drive the checklist + publish gate from the same per-step validators
  // the wizard uses. Each entry maps to a step the user can jump back to.
  const checklist = [
    {
      label: "Role & skills set",
      ok: Object.keys(validateStep(1)).length === 0,
      step: 1,
    },
    {
      label: "Salary range valid",
      ok: Object.keys(validateStep(2)).length === 0,
      step: 2,
    },
    {
      label: "Description complete",
      ok: Object.keys(validateStep(3)).length === 0,
      step: 3,
      sub: `${formData.description.length.toLocaleString()} chars`,
    },
    {
      label: "Guild assigned",
      ok: Object.keys(validateStep(4)).length === 0,
      step: 4,
    },
    {
      label: "Application form ready",
      ok: true,
      step: 5,
      sub: `${questions.length} question${questions.length === 1 ? "" : "s"}`,
    },
    {
      label: "No validation errors",
      ok: [1, 2, 3, 4].every((s) => Object.keys(validateStep(s)).length === 0),
      step: 7,
    },
  ];

  const canPublish = checklist.every((c) => c.ok);

  return (
    <div>
      <div className="mb-2 text-[11px] tracking-[0.2em] uppercase text-primary font-semibold">
        Step 07
      </div>
      <h2 className="text-[28px] font-bold tracking-[-0.025em] text-foreground mb-1.5">
        Review &amp; publish
      </h2>
      <p className="text-muted-foreground text-[14.5px] leading-[1.55] mb-8 max-w-xl">
        This is what candidates and reviewing experts will see. Click any
        section to jump back and edit it. When you publish, the listing goes
        live and the assigned guild begins reviewing.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Candidate-facing job page preview */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <Section onEdit={() => onEdit(1)} editLabel="Edit role">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-5 h-5 rounded-md grid place-items-center bg-muted text-foreground text-[11px] font-bold font-display">
                {(guild?.name?.[0] ?? "C").toUpperCase()}
              </div>
              <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground/80 font-semibold">
                {guildName} · {formData.location || "Location TBD"}
              </span>
            </div>
            <h3 className="text-[28px] font-bold tracking-[-0.025em] text-foreground leading-[1.15] mb-4 max-w-xl">
              {formData.title || "Untitled role"}
            </h3>
            {(formData.salaryMin !== undefined ||
              formData.salaryMax !== undefined) && (
              <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border mb-2">
                <span className="text-base font-bold text-foreground tracking-tight">
                  {formatSalary(
                    formData.salaryMin,
                    formData.salaryMax,
                    formData.salaryCurrency
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground/80 tracking-wider">
                  {formData.salaryCurrency} · base
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center mb-5 mt-2">
              {[
                formData.jobType,
                formData.locationType ? capitalize(formData.locationType) : null,
                formData.experienceLevel
                  ? capitalize(formData.experienceLevel)
                  : null,
                formData.department,
              ]
                .filter(Boolean)
                .map((item, i, arr) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[13px] text-muted-foreground px-3.5 first:pl-0 last:pr-0",
                      i < arr.length - 1 && "border-r border-border"
                    )}
                  >
                    <strong className="text-foreground font-semibold">
                      {item}
                    </strong>
                  </span>
                ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {guild && (
                <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/40 text-primary text-[11.5px] font-semibold">
                  {guild.name}
                  {guildExpertCount > 0
                    ? ` · ${guildExpertCount} reviewer${guildExpertCount === 1 ? "" : "s"}`
                    : ""}
                </span>
              )}
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-full bg-muted border border-border text-[11.5px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </Section>

          {/* Description */}
          <Section onEdit={() => onEdit(3)} editLabel="Edit description">
            <SectionLabel>About the role</SectionLabel>
            {formData.description ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
                <ReactMarkdown>{formData.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                No description yet.
              </p>
            )}
          </Section>

          {/* Requirements */}
          <Section onEdit={() => onEdit(3)} editLabel="Edit requirements">
            <SectionLabel>Requirements</SectionLabel>
            {requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">
                No requirements added.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                {requirements.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-[13.5px] text-muted-foreground leading-[1.5]"
                  >
                    <span className="flex-shrink-0 w-4 h-4 rounded grid place-items-center bg-primary/10 text-primary mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Application form summary */}
          <Section onEdit={() => onEdit(5)} editLabel="Edit questions">
            <SectionLabel>Application</SectionLabel>
            <div className="flex items-baseline gap-3.5 mb-4">
              <div className="text-[32px] font-bold text-foreground tracking-[-0.025em] font-display leading-none">
                {questions.length}
              </div>
              <div>
                <div className="text-[13.5px] text-foreground font-semibold">
                  custom question{questions.length === 1 ? "" : "s"}
                </div>
                <div className="text-[12.5px] text-muted-foreground/80">
                  CV required · cover letter optional
                </div>
              </div>
            </div>
            {questions.slice(0, 2).map((q) => (
              <div
                key={q.id}
                className="border-l-2 border-primary pl-3.5 mb-3 py-1"
              >
                <div className="text-[13.5px] text-foreground font-medium mb-1">
                  {q.label}
                </div>
                <div className="text-[11.5px] text-muted-foreground/80 tracking-wide">
                  {humanQuestionType(q.type)}
                  {q.required ? " · required" : " · optional"}
                </div>
              </div>
            ))}
            {questions.length > 2 && (
              <div className="text-[12.5px] text-muted-foreground/80 pt-1.5">
                + {questions.length - 2} more question
                {questions.length - 2 === 1 ? "" : "s"}
              </div>
            )}
          </Section>

          {/* Attachments */}
          <Section onEdit={() => onEdit(6)} editLabel="Edit attachments">
            <SectionLabel>Attachments &amp; links</SectionLabel>
            <AttachmentSummary
              hasHero={!!formData.heroImage}
              gallery={formData.gallery?.length ?? 0}
              links={formData.externalLinks?.length ?? 0}
              hasEmbed={!!formData.embed?.url}
            />
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 self-start">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-semibold mb-3.5">
              Looks good
            </div>
            <div className="flex flex-col gap-2.5">
              {checklist.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onEdit(item.step)}
                  className="flex items-center gap-2.5 text-[13px] text-left hover:text-foreground transition-colors"
                >
                  <span
                    className={cn(
                      "w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] font-extrabold flex-shrink-0",
                      item.ok
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground/70"
                    )}
                  >
                    {item.ok ? "✓" : "·"}
                  </span>
                  <span
                    className={item.ok ? "text-foreground" : "text-muted-foreground"}
                  >
                    {item.label}
                  </span>
                  {item.sub && (
                    <span className="ml-auto text-[11.5px] text-muted-foreground/70">
                      {item.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-semibold mb-3.5">
              Posting summary
            </div>
            <div className="flex flex-col gap-3 text-[12.5px]">
              <SummaryRow
                label="Reviewer guild"
                value={
                  guild
                    ? `${guild.name}${
                        guildExpertCount ? ` · ${guildExpertCount}` : ""
                      }`
                    : "Unassigned"
                }
              />
              <SummaryRow label="Listing duration" value="30 days" />
              <SummaryRow label="Posting fee" value="$0 · pilot" />
              <SummaryRow label="Estimated reach" value="—" />
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/40 rounded-xl p-5">
            <div className="text-sm font-bold text-foreground mb-1.5 tracking-tight">
              Ready to go live
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-[1.55] mb-3.5">
              Once published, the assigned guild is notified and applications
              can be submitted. You can pause or edit at any time.
            </p>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSubmitting || !canPublish}
              className="w-full py-3 rounded-lg bg-primary text-background font-bold text-sm tracking-tight hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Publish job
            </button>
            <div className="mt-2.5 text-[11.5px] text-muted-foreground/80 text-center">
              or save as draft below
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function Section({
  children,
  onEdit,
  editLabel,
}: {
  children: React.ReactNode;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <section className="px-8 py-7 border-b border-border last:border-b-0 relative">
      <button
        type="button"
        onClick={onEdit}
        className="absolute top-5 right-6 text-[11px] tracking-wider text-muted-foreground/80 px-2.5 py-1 rounded-md border border-border bg-muted hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-colors font-medium"
      >
        {editLabel}
      </button>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/80 font-semibold mb-3.5">
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground/80">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}

function AttachmentSummary({
  hasHero,
  gallery,
  links,
  hasEmbed,
}: {
  hasHero: boolean;
  gallery: number;
  links: number;
  hasEmbed: boolean;
}) {
  if (!hasHero && gallery === 0 && links === 0 && !hasEmbed) {
    return (
      <p className="text-sm text-muted-foreground/60 italic">
        No attachments added.
      </p>
    );
  }
  return (
    <div className="flex gap-3 flex-wrap text-[12px] text-muted-foreground">
      {hasHero && (
        <span className="px-3 py-2 rounded-lg bg-muted border border-border">
          Hero image · 1
        </span>
      )}
      {gallery > 0 && (
        <span className="px-3 py-2 rounded-lg bg-muted border border-border">
          Gallery · {gallery}
        </span>
      )}
      {links > 0 && (
        <span className="px-3 py-2 rounded-lg bg-muted border border-border">
          Links · {links}
        </span>
      )}
      {hasEmbed && (
        <span className="px-3 py-2 rounded-lg bg-muted border border-border">
          Embed
        </span>
      )}
    </div>
  );
}

function formatSalary(
  min: number | undefined,
  max: number | undefined,
  currency: string
): string {
  const symbol = currencySymbol(currency);
  if (min !== undefined && max !== undefined) {
    return `${symbol}${min.toLocaleString()} – ${symbol}${max.toLocaleString()}`;
  }
  if (min !== undefined) return `From ${symbol}${min.toLocaleString()}`;
  if (max !== undefined) return `Up to ${symbol}${max.toLocaleString()}`;
  return "Salary on request";
}

function currencySymbol(code: string): string {
  switch (code) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "ETH":
      return "Ξ";
    default:
      return "$";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanQuestionType(type: string): string {
  switch (type) {
    case "short_text":
      return "Short answer";
    case "long_text":
      return "Long answer";
    case "single_choice":
      return "Single select";
    case "multi_choice":
      return "Multi-select";
    case "file_upload":
      return "File upload";
    case "url":
      return "URL";
    default:
      return type;
  }
}
