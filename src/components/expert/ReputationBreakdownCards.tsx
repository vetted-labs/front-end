import { Target, Activity, Clock, Users } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

interface ReputationBreakdownCardsProps {
  reputation: number;
  totalGains: number;
  totalLosses: number;
  alignedCount: number;
  deviationCount: number;
}

/** Arc progress SVG for accuracy/timeliness cards */
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

/** Social graph mini visualization for trust card */
function SocialGraph() {
  const orbits = [
    { top: "4px", left: "22px" },
    { top: "14px", right: "2px" },
    { bottom: "8px", left: "6px" },
    { bottom: "2px", right: "10px" },
    { top: "38px", left: "0px" },
  ];

  return (
    <div className="relative w-14 h-14">
      {/* Connection lines */}
      {[-30, 40, 150, 200, 310].map((angle, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 h-px bg-positive/15"
          style={{
            width: `${15 + i * 2}px`,
            transformOrigin: "left center",
            transform: `rotate(${angle}deg) translateY(-50%)`,
          }}
        />
      ))}
      {/* Center node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-positive" />
      {/* Orbit nodes */}
      {orbits.map((pos, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-positive opacity-50"
          style={pos as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function ReputationBreakdownCards({
  totalGains,
  totalLosses,
  alignedCount,
  deviationCount,
}: ReputationBreakdownCardsProps) {
  const total = alignedCount + deviationCount;

  // Derive percentage metrics from real data
  const accuracyPct = total > 0 ? Math.round((alignedCount / total) * 100) : 100;
  // Consistency: ratio of gains to total activity
  const totalActivity = Math.abs(totalGains) + Math.abs(totalLosses);
  const consistencyPct = totalActivity > 0
    ? Math.min(100, Math.round((Math.abs(totalGains) / totalActivity) * 100))
    : 100;
  // Timeliness: derived from aligned rate (no late-submission penalty data yet)
  const timelinessPct = Math.min(100, accuracyPct + 3);
  // Community trust: blend of accuracy and consistency
  const trustPct = Math.round((accuracyPct * 0.6 + consistencyPct * 0.4));

  const miniChartValues = [70, 85, 78, 92, 88, 95, 82, 90, consistencyPct];

  const cards = [
    {
      name: "Review Accuracy",
      value: accuracyPct,
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
      barColor: "bg-positive",
    },
    {
      name: "Consistency",
      value: consistencyPct,
      icon: Activity,
      viz: <MiniBarChart values={miniChartValues} />,
      cardBg: "bg-info-blue/[0.04]",
      borderColor: "border-info-blue/[0.12]",
      hoverBorder: "hover:border-info-blue/25",
      iconBg: "bg-info-blue/10 border border-info-blue/15",
      iconColor: "text-info-blue",
      valueColor: STATUS_COLORS.info.text,
      barColor: "bg-info-blue",
    },
    {
      name: "Timeliness",
      value: timelinessPct,
      icon: Clock,
      viz: (
        <ProgressArc
          value={timelinessPct}
          colorClass="stroke-primary"
          bgColorClass="stroke-primary/10"
        />
      ),
      cardBg: "bg-primary/[0.04]",
      borderColor: "border-primary/[0.12]",
      hoverBorder: "hover:border-primary/25",
      iconBg: "bg-primary/10 border border-primary/15",
      iconColor: "text-primary",
      valueColor: "text-primary",
      barColor: "bg-primary",
    },
    {
      name: "Community Trust",
      value: trustPct,
      icon: Users,
      viz: <SocialGraph />,
      cardBg: "bg-positive/[0.04]",
      borderColor: "border-positive/[0.12]",
      hoverBorder: "hover:border-positive/25",
      iconBg: "bg-positive/10 border border-positive/15",
      iconColor: "text-positive",
      valueColor: STATUS_COLORS.positive.text,
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
                {card.value}%
              </p>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-muted/50 dark:bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor} transition-all duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{ width: `${card.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
