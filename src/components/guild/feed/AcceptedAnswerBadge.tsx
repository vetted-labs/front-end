"use client";

import { CheckCircle2 } from "lucide-react";

interface AcceptedAnswerBadgeProps {
  variant: "reply" | "post-card";
}

export function AcceptedAnswerBadge({ variant }: AcceptedAnswerBadgeProps) {
  if (variant === "post-card") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        Solved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
      <CheckCircle2 className="w-4 h-4" />
      Accepted Answer
    </span>
  );
}
