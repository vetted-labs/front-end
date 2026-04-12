import { Target, Activity, BookOpen, Award } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { computeAccuracy, computeConsistency } from "@/lib/reputation-helpers";

interface ReputationBreakdownCardsProps {
  reputation: number;
  totalGains: number;
  totalLosses: number;
  alignedCount: number;
  deviationCount: number;
  reviewCount: number;
  endorsementCount: number;
}

/** Arc progress SVG for accuracy cards */
function ProgressArc({
  value,
  colorClass,
  bgColorClass,
}: {
  value: number;
  colorClass: string;
  bgColorClass: string;
}) {
  const circumference = 2 * Math.PI * 22; // r=22
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg className="w-14 h-14" viewBox="0 0 56 56">
      <circle
        cx="28" cy="28" r="22"
        fill="none" strokeWidth="4"
        className={bgColorClass}
      />
      <circle
        cx="28" cy="28" r="22"
        fill="none" strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
        className={`${colorClass} transition-all duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)]`}
      />
      <text
        x="28" y="31"
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {value}
      </text>
    </svg>
  );
}

/** Mini bar chart for consistency card */
function MiniBarChart({ values }: { values: number[] }) {
  return (
    <div className="flex items-end gap-2 h-10">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm bg-info-blue/30 transition-all duration-[1s] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            height: `${(v / 100) * 40}px`,
            opacity: 0.2 + (v / 100) * 0.5,
          }}
        />
      ))}
    </div>
  );
}

/** Simple count display for activity/record cards */
function CountDisplay({
  count,
  label,
  colorClass,
}: {
  count: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-end justify-center h-14">
      <span className={`text-2xl font-bold leading-none ${colorClass}`}>{count}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export function ReputationBreakdownCards({
  totalGains,
  totalLosses,
  alignedCount,
  deviationCount,
  reviewCount,
  endorsementCount,
}: ReputationBreakdownCardsProps) {
  // Derive percentage metrics from real data
  const accuracyPct = computeAccuracy(alignedCount, deviationCount);
  const consistencyPct = computeConsistency(totalGains, totalLosses);

  // Fill with the current value — no historical consistency data available yet
  const miniChartValues = Array(9).fill(consistencyPct);

  const cards = [
    {
      name: "Review Accuracy",
      value: `${accuracyPct}%`,
      icon: Target,
      viz: (
        <ProgressArc
          value={accuracyPct}
          colorClass="stroke-positive"
          bgColorClass="stroke-positive/10"
        />
      ),
      cardBg: "bg-positive/[0.04]",
      borderColor: "border-positive/[0.12]",
      hoverBorder: "hover:border-positive/25",
      iconBg: "bg-positive/10 border border-positive/15",
      iconColor: "text-positive",
      valueColor: STATUS_COLORS.positive.text,
      barValue: accuracyPct,
      barColor: "bg-positive",
    },
    {
      name: "Consistency",
      value: `${consistencyPct}%`,
      icon: Activity,
      viz: <MiniBarChart values={miniChartValues} />,
      cardBg: "bg-info-blue/[0.04]",
      borderColor: "border-info-blue/[0.12]",
      hoverBorder: "hover:border-info-blue/25",
      iconBg: "bg-info-blue/10 border border-info-blue/15",
      iconColor: "text-info-blue",
      valueColor: STATUS_COLORS.info.text,
      barValue: consistencyPct,
      barColor: "bg-info-blue",
    },
    {
      name: "Review Activity",
      value: String(reviewCount),
      icon: BookOpen,
      viz: (
        <CountDisplay
          count={reviewCount}
          label="reviews"
          colorClass="text-primary"
        />
      ),
      cardBg: "bg-primary/[0.04]",
      borderColor: "border-primary/[0.12]",
      hoverBorder: "hover:border-primary/25",
      iconBg: "bg-primary/10 border border-primary/15",
      iconColor: "text-primary",
      valueColor: "text-primary",
      barValue: Math.min(100, reviewCount),
      barColor: "bg-primary",
    },
    {
      name: "Endorsement Record",
      value: String(endorsementCount),
      icon: Award,
      viz: (
        <CountDisplay
          count={endorsementCount}
          label="endorsed"
          colorClass={STATUS_COLORS.positive.text}
        />
      ),
      cardBg: "bg-positive/[0.04]",
      borderColor: "border-positive/[0.12]",
      hoverBorder: "hover:border-positive/25",
      iconBg: "bg-positive/10 border border-positive/15",
      iconColor: "text-positive",
      valueColor: STATUS_COLORS.positive.text,
      barValue: Math.min(100, endorsementCount * 5),
      barColor: "bg-positive",
    },
  ];

  return (
    <section>
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
        Score Breakdown
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className={`
                relative rounded-xl p-6 overflow-hidden border
                ${card.cardBg}
                ${card.borderColor}
                transition-all duration-300
                hover:-translate-y-1
                ${card.hoverBorder}
              `}
            >
              {/* Header: icon + visualization */}
              <div className="flex items-start justify-between mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className={`w-[22px] h-[22px] ${card.iconColor}`} />
                </div>
                {card.viz}
              </div>

              {/* Label */}
              <p className="text-sm font-medium text-muted-foreground mb-1.5">
                {card.name}
              </p>

              {/* Value */}
              <p className={`font-display text-3xl font-bold leading-none mb-3 ${card.valueColor}`}>
                {card.value}
              </p>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-muted/50 dark:bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor} transition-all duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{ width: `${card.barValue}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
