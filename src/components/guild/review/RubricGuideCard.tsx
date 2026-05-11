"use client";

import { STATUS_COLORS } from "@/config/colors";
import type {
  ReviewDomainTopic,
  RubricInterpretationGuideItem,
} from "@/types";

/**
 * Compact rubric reference for the review modal's right pane. Surfaces the
 * "what to look for" guidance + score-band descriptions while the reviewer
 * is scoring on the center column. Keeps the scoring decision visible
 * without crowding the candidate response or the score buttons.
 *
 * Two render modes:
 * - `topic` prop for the Domain step (per-topic scoring bands)
 * - `interpretationGuide` prop for the General step (cross-question bands)
 */
export interface RubricGuideCardProps {
  /** Domain step — show one topic's whatToLookFor + scoring bands. */
  topic?: ReviewDomainTopic;
  /** General step — show the cross-question interpretation guide. */
  interpretationGuide?: RubricInterpretationGuideItem[];
}

export function RubricGuideCard({ topic, interpretationGuide }: RubricGuideCardProps) {
  if (topic) {
    const hasGuidance =
      (topic.whatToLookFor && topic.whatToLookFor.length > 0) || topic.scoring;
    if (!hasGuidance) return null;
    const bands = topic.scoring
      ? [
          { label: "5 pts", value: topic.scoring.five, color: STATUS_COLORS.positive.text },
          { label: "3-4", value: topic.scoring.threeToFour, color: STATUS_COLORS.warning.text },
          { label: "1-2", value: topic.scoring.oneToTwo, color: "text-primary" },
          { label: "0", value: topic.scoring.zero, color: STATUS_COLORS.negative.text },
        ]
      : [];
    return (
      <aside
        aria-label="Scoring guide"
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/[0.04]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            Scoring guide
          </p>
        </div>
        <div className="p-4 space-y-4">
          {topic.whatToLookFor && topic.whatToLookFor.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">What to look for</p>
              <ul className="space-y-1.5">
                {topic.whatToLookFor.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-muted-foreground pl-3 relative leading-relaxed before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/40"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bands.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Score bands</p>
              <div className="space-y-1.5">
                {bands.map((band) => (
                  <div
                    key={band.label}
                    className="text-xs text-muted-foreground rounded-lg bg-muted/30 border border-border p-2.5 leading-relaxed"
                  >
                    <span className={`font-bold ${band.color}`}>{band.label}:</span>{" "}
                    {band.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (interpretationGuide && interpretationGuide.length > 0) {
    return (
      <aside
        aria-label="Interpretation guide"
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/[0.04]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            Interpretation guide
          </p>
        </div>
        <div className="p-4 space-y-2.5">
          {interpretationGuide.map((item) => (
            <div
              key={item.range}
              className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5"
            >
              <p className="text-xs font-bold text-primary">
                {item.range} — {item.label}
              </p>
              {item.notes && item.notes.length > 0 && (
                <ul className="space-y-1">
                  {item.notes.map((note, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-muted-foreground pl-2.5 relative leading-relaxed before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/40"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return null;
}
