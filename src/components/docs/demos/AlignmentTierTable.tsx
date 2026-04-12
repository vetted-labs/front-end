import { cn } from "@/lib/utils";

interface AlignmentRow {
  tier: string;
  range: string;
  rep: string;
  slash: string;
  color: "positive" | "warning" | "warning-mid" | "negative";
  example: string;
}

const ROWS: AlignmentRow[] = [
  {
    tier: "Aligned",
    range: "≤ 1.0 × IQR",
    rep: "+10",
    slash: "0%",
    color: "positive",
    example: "Your 78, consensus 80 → no penalty, full reward.",
  },
  {
    tier: "Mild deviation",
    range: "1.0 – 1.5 × IQR",
    rep: "−5",
    slash: "5%",
    color: "warning",
    example: "Your 88, consensus 80 → small hit, reduced reward.",
  },
  {
    tier: "Moderate deviation",
    range: "1.5 – 2.0 × IQR",
    rep: "−10",
    slash: "15%",
    color: "warning-mid",
    example: "Your 95, consensus 80 → notable penalty, no reward.",
  },
  {
    tier: "Severe deviation",
    range: "> 2.0 × IQR",
    rep: "−20",
    slash: "25%",
    color: "negative",
    example: "Your 100, consensus 60 → max penalty, reputation loss.",
  },
];

const COLOR_MAP: Record<AlignmentRow["color"], string> = {
  positive: "text-positive border-positive/40 bg-positive/5",
  warning: "text-warning border-warning/40 bg-warning/5",
  "warning-mid": "text-warning border-warning/50 bg-warning/10",
  negative: "text-negative border-negative/40 bg-negative/5",
};

export function AlignmentTierTable() {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="px-4 py-3 font-semibold text-foreground">Tier</th>
            <th className="px-4 py-3 font-semibold text-foreground">Distance from consensus</th>
            <th className="px-4 py-3 font-semibold text-foreground">Reputation</th>
            <th className="px-4 py-3 font-semibold text-foreground">Stake slashed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROWS.map((row) => (
            <tr key={row.tier}>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-block rounded-md border px-2 py-0.5 text-[12.5px] font-semibold",
                    COLOR_MAP[row.color]
                  )}
                >
                  {row.tier}
                </span>
                <p className="mt-1.5 text-[12px] text-muted-foreground">{row.example}</p>
              </td>
              <td className="px-4 py-3 align-top font-mono text-muted-foreground">
                {row.range}
              </td>
              <td className={cn("px-4 py-3 align-top font-mono font-bold", COLOR_MAP[row.color].split(" ")[0])}>
                {row.rep}
              </td>
              <td className={cn("px-4 py-3 align-top font-mono font-bold", COLOR_MAP[row.color].split(" ")[0])}>
                {row.slash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
