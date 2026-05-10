"use client";

import { SKILLS } from "@/config/constants";
import { ChipGroup, ChipMultiSelect } from "../Chips";
import type { JobFormData } from "@/hooks/useJobWizard";

interface StepRoleProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  updateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => void;
}

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
] as const;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "Full-time", label: "Full-time" },
  { value: "Contract", label: "Contract" },
  { value: "Part-time", label: "Part-time" },
  { value: "Freelance", label: "Freelance" },
] as const;

const MAX_TOP_SKILLS = 8;

/**
 * Step 1 — The role. Collects title, department, experience level,
 * employment type, and top skills.
 */
export function StepRole({ formData, fieldErrors, updateField }: StepRoleProps) {
  const skills = formData.skills ?? [];

  return (
    <div>
      <div className="mb-2 text-[11px] tracking-[0.2em] uppercase text-primary font-semibold">
        Step 01
      </div>
      <h2 className="text-[28px] font-bold tracking-[-0.025em] text-foreground mb-1.5">
        The role
      </h2>
      <p className="text-muted-foreground text-[14.5px] leading-[1.55] mb-8 max-w-xl">
        Start with the basics. Title and skills decide which experts in the
        guild will see this listing — be precise.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-6">
        {/* Title (full width) */}
        <FieldLabel label="Job title" required className="md:col-span-2">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            aria-invalid={!!fieldErrors.title}
            className={inputClass(fieldErrors.title)}
          />
          <FieldHelp error={fieldErrors.title}>
            Use the title candidates will recognise. Avoid internal level codes
            (L4, P3) — they hurt search.
          </FieldHelp>
        </FieldLabel>

        {/* Department */}
        <FieldLabel label="Department / team">
          <input
            type="text"
            value={formData.department ?? ""}
            onChange={(e) => updateField("department", e.target.value)}
            placeholder="e.g. Product Engineering"
            className={inputClass()}
          />
          <FieldHelp>
            Optional. Shown on the public listing under the title.
          </FieldHelp>
        </FieldLabel>

        {/* Experience level — chips */}
        <FieldLabel label="Experience level" required>
          <ChipGroup
            value={formData.experienceLevel}
            options={EXPERIENCE_LEVEL_OPTIONS}
            onChange={(v) => updateField("experienceLevel", v)}
            ariaLabel="Experience level"
            invalid={!!fieldErrors.experienceLevel}
          />
          <FieldHelp error={fieldErrors.experienceLevel} />
        </FieldLabel>

        {/* Employment type — full width chips */}
        <FieldLabel label="Employment type" required className="md:col-span-2">
          <ChipGroup
            value={formData.jobType}
            options={EMPLOYMENT_TYPE_OPTIONS}
            onChange={(v) => updateField("jobType", v)}
            ariaLabel="Employment type"
            invalid={!!fieldErrors.jobType}
          />
          <FieldHelp error={fieldErrors.jobType} />
        </FieldLabel>

        {/* Top skills — full width */}
        <FieldLabel label="Top skills" required className="md:col-span-2">
          <ChipMultiSelect
            values={skills}
            suggestions={SKILLS}
            max={MAX_TOP_SKILLS}
            onChange={(v) => updateField("skills", v)}
            placeholder="Type to search — Node, Python, AWS, …"
            invalid={!!fieldErrors.skills}
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground/80 mt-1.5 leading-[1.5]">
            <span>
              {skills.length} of {MAX_TOP_SKILLS} selected · pulls from the
              platform skill registry
            </span>
            <span className="font-semibold text-muted-foreground">
              Press Enter to add
            </span>
          </div>
          <FieldHelp error={fieldErrors.skills} />
        </FieldLabel>
      </div>
    </div>
  );
}

// ── Local presentational helpers ─────────────────────────────────────────

function FieldLabel({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground/80 font-semibold">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </span>
      {children}
    </div>
  );
}

function FieldHelp({
  error,
  children,
}: {
  error?: string;
  children?: React.ReactNode;
}) {
  if (error) {
    return <span className="text-xs text-destructive leading-[1.5]">{error}</span>;
  }
  if (!children) return null;
  return (
    <span className="text-xs text-muted-foreground/80 leading-[1.5]">
      {children}
    </span>
  );
}

function inputClass(error?: string) {
  return [
    "bg-muted border rounded-lg px-4 py-3.5 text-sm text-foreground outline-none transition-colors",
    "focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
    error
      ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/10"
      : "border-border",
  ].join(" ");
}
