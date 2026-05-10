"use client";

import { CURRENCIES } from "@/config/constants";
import { ChipGroup } from "../Chips";
import type { JobFormData } from "@/hooks/useJobWizard";

interface StepLocationCompProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  updateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => void;
}

const WORK_MODEL_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
] as const;

/** Step 2 — Work model, location, and compensation range. */
export function StepLocationComp({
  formData,
  fieldErrors,
  updateField,
}: StepLocationCompProps) {
  return (
    <div>
      <div className="mb-2 text-[11px] tracking-[0.2em] uppercase text-primary font-semibold">
        Step 02
      </div>
      <h2 className="text-[28px] font-bold tracking-[-0.025em] text-foreground mb-1.5">
        Where and how much
      </h2>
      <p className="text-muted-foreground text-[14.5px] leading-[1.55] mb-8 max-w-xl">
        Set the work model, where talent can sit, and the compensation range.
        Salary range is shown to candidates exactly as you write it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-6">
        <FieldLabel label="Work model" required>
          <ChipGroup
            value={formData.locationType}
            options={WORK_MODEL_OPTIONS}
            onChange={(v) => updateField("locationType", v)}
            ariaLabel="Work model"
            invalid={!!fieldErrors.locationType}
          />
          <FieldHelp error={fieldErrors.locationType} />
        </FieldLabel>

        <FieldLabel label="Location" required>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="e.g. Berlin · Remote-friendly"
            aria-invalid={!!fieldErrors.location}
            className={inputClass(fieldErrors.location)}
          />
          <FieldHelp error={fieldErrors.location}>
            City, region, or remote-friendly territories.
          </FieldHelp>
        </FieldLabel>

        <FieldLabel
          label="Compensation range"
          required
          className="md:col-span-2"
        >
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm pointer-events-none">
                {currencySymbol(formData.salaryCurrency)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={formData.salaryMin ?? ""}
                onChange={(e) =>
                  updateField(
                    "salaryMin",
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value)
                  )
                }
                placeholder="140,000"
                aria-invalid={!!fieldErrors.salaryMin}
                className={`${inputClass(fieldErrors.salaryMin)} pl-8`}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm pointer-events-none">
                {currencySymbol(formData.salaryCurrency)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={formData.salaryMax ?? ""}
                onChange={(e) =>
                  updateField(
                    "salaryMax",
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value)
                  )
                }
                placeholder="185,000"
                aria-invalid={!!fieldErrors.salaryMax}
                className={`${inputClass(fieldErrors.salaryMax)} pl-8`}
              />
            </div>
            <select
              value={formData.salaryCurrency}
              onChange={(e) => updateField("salaryCurrency", e.target.value)}
              className={inputClass(fieldErrors.salaryCurrency) + " pr-8"}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>
          <FieldHelp error={fieldErrors.salaryMin || fieldErrors.salaryMax}>
            Candidates see the range at the top of the listing. Tight ranges
            (&lt; 25%) get more applicants.
          </FieldHelp>
        </FieldLabel>
      </div>
    </div>
  );
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
    return (
      <span className="text-xs text-destructive leading-[1.5]">{error}</span>
    );
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
    "bg-muted border rounded-lg px-4 py-3.5 text-sm text-foreground outline-none transition-colors w-full",
    "focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
    error
      ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/10"
      : "border-border",
  ].join(" ");
}
