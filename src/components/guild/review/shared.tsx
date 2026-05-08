"use client";

import { STATUS_COLORS } from "@/config/colors";

export function renderPromptLines(prompt?: string) {
  if (!prompt) return null;
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {lines.map((line, idx) => (
        <p key={idx} className={idx === 0 ? "" : "pl-4"}>
          {idx === 0 ? line : `• ${line}`}
        </p>
      ))}
    </div>
  );
}

/**
 * Clamp a score value to a non-negative integer not exceeding the provided max.
 * Caller can override max but not below 0.
 */
export function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const safeMax = Math.max(0, Math.floor(max));
  const safeValue = Math.floor(value);
  if (safeValue < 0) return 0;
  if (safeValue > safeMax) return safeMax;
  return safeValue;
}

export interface ScoreButtonsProps {
  value: number;
  max: number;
  onChange: (val: number) => void;
  /**
   * Hard upper bound for the rendered buttons. Defaults to `max`. Can override
   * `max` from the caller, but the runtime clamp also enforces `>= 0`.
   */
  hardMax?: number;
}

export function ScoreButtons({ value, max, onChange, hardMax }: ScoreButtonsProps) {
  // Hard-cap and runtime-clamp: caller can override max but never below 0.
  const cappedMax = clampScore(hardMax ?? max, hardMax ?? max);
  const safeMax = Math.max(0, cappedMax);
  const safeValue = clampScore(value, safeMax);
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: safeMax + 1 }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onChange(clampScore(idx, safeMax))}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            safeValue === idx
              ? "bg-primary text-primary-foreground shadow-sm border border-primary/50"
              : "bg-muted/50 text-muted-foreground border border-border hover:border-primary/40 hover:text-primary hover:bg-muted"
          }`}
        >
          {idx}
        </button>
      ))}
    </div>
  );
}

/**
 * Required-field asterisk with a tooltip. Used on field labels in the review steps.
 */
export function RequiredMark({ label = "Required to submit" }: { label?: string }) {
  return (
    <span
      className={`${STATUS_COLORS.negative.text} ml-0.5 cursor-help`}
      title={label}
      aria-label={label}
    >
      *
    </span>
  );
}

/**
 * Optional-field marker, rendered next to label text.
 */
export function OptionalMark() {
  return (
    <span className="text-muted-foreground/70 text-[11px] font-normal ml-1">
      (optional)
    </span>
  );
}

// ─── Justification length constants ─────────────────────────────────────────

export const JUSTIFICATION_MIN_CHARS = 30;
export const JUSTIFICATION_MAX_CHARS = 2000;

/**
 * Compute label/colour for the live counter under a justification textarea.
 * - Below min:    muted (still warming up)
 * - Within range: positive (success colour)
 * - Over max:     negative (will be rejected)
 */
export function justificationCounterTone(
  length: number,
  options?: { required?: boolean; min?: number; max?: number }
): "muted" | "success" | "error" {
  const min = options?.min ?? JUSTIFICATION_MIN_CHARS;
  const max = options?.max ?? JUSTIFICATION_MAX_CHARS;
  if (length > max) return "error";
  if (options?.required && length < min) return "muted";
  if (length === 0) return "muted";
  return "success";
}

export function justificationCounterClass(tone: "muted" | "success" | "error"): string {
  if (tone === "error") return STATUS_COLORS.negative.text;
  if (tone === "success") return STATUS_COLORS.positive.text;
  return "text-muted-foreground";
}

/**
 * Build a stable DOM id for a field anchor so validation errors can scroll to it.
 */
export function fieldAnchorId(scope: "general" | "domain" | "overall", id: string): string {
  return `review-field-${scope}-${id}`;
}

/**
 * Smooth-scroll the first error anchor into view + focus a focusable child.
 */
export function focusFirstError(anchorId: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Try to focus the nearest focusable input/textarea/button inside the anchor.
  const focusable = el.querySelector<HTMLElement>(
    'textarea, input, button, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable && typeof focusable.focus === "function") {
    // Defer so scrolling has begun before focus shifts.
    window.setTimeout(() => focusable.focus({ preventScroll: true }), 80);
  }
}
