"use client";

import { Users, Sparkles, Eye, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "primary" | "positive" | "info" | "warning";
  hint?: string;
}

const TONE_STYLES: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-positive/10", text: "text-positive" },
  info: { bg: "bg-info-blue/10", text: "text-info-blue" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
};

function KpiTile({ icon: Icon, label, value, tone, hint }: KpiTileProps) {
  const toneClass = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4">
      <span
        className={cn(
          "w-10 h-10 rounded-lg grid place-items-center flex-shrink-0",
          toneClass.bg,
          toneClass.text
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight mt-0.5">
          {value}
        </p>
        {hint && (
          <p className="text-[10.5px] text-muted-foreground/70 mt-0.5 truncate">{hint}</p>
        )}
      </div>
    </div>
  );
}

interface CandidateKpiRowProps {
  total: number;
  newThisWeek: number;
  reviewing: number;
  accepted: number;
}

export function CandidateKpiRow({
  total,
  newThisWeek,
  reviewing,
  accepted,
}: CandidateKpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiTile icon={Users} label="Total candidates" value={total} tone="primary" />
      <KpiTile
        icon={Sparkles}
        label="New this week"
        value={newThisWeek}
        tone="info"
        hint="last 7 days"
      />
      <KpiTile icon={Eye} label="In review" value={reviewing} tone="warning" />
      <KpiTile icon={CheckCircle2} label="Hired" value={accepted} tone="positive" />
    </div>
  );
}
