import { cn } from "@/lib/utils";

/**
 * Three-lane swimlane diagram for how-it-works.
 *
 * Each lane (Candidate / Expert / Company) has a row of stage cards. Hand-off
 * arrows between lanes show where actors pass work to each other. The
 * visual is bespoke SVG because the stock `DocsFlowDiagram` only does
 * single-row flows.
 *
 * Layout (desktop):
 *
 *   CANDIDATE   [Profile]──[Apply]────────────────────────[Get offer]
 *                            │                                ▲
 *                            ▼                                │
 *   EXPERT                 [Commit]──[Reveal]──[Finalize]──┐
 *                                                          │
 *                                                          ▼
 *   COMPANY   [Post job]──────────────────────[Review shortlist]──[Hire]
 *
 * Below `md` breakpoint, the swimlanes stack vertically with the same
 * hand-off indicators as a stepped list.
 */
export function DocsSwimlane({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "my-10 overflow-hidden rounded-xl border border-border bg-muted/30 p-4 md:p-6",
        className
      )}
    >
      {/* Desktop: horizontal swimlane SVG */}
      <div className="hidden md:block">
        <svg
          viewBox="0 0 880 340"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Three-lane swimlane diagram showing how a candidate application flows through a guild review and ends with a company hire"
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
        >
          {/* Lane labels */}
          <g className="fill-muted-foreground" fontSize="11" fontWeight="600" fontFamily="Satoshi, system-ui, sans-serif" letterSpacing="0.08em">
            <text x="16" y="68" textAnchor="start">CANDIDATE</text>
            <text x="16" y="178" textAnchor="start">EXPERT</text>
            <text x="16" y="288" textAnchor="start">COMPANY</text>
          </g>

          {/* Lane backgrounds */}
          <g className="fill-background">
            <rect x="120" y="30" width="740" height="80" rx="8" className="stroke-border" strokeWidth="1" />
            <rect x="120" y="140" width="740" height="80" rx="8" className="stroke-border" strokeWidth="1" />
            <rect x="120" y="250" width="740" height="80" rx="8" className="stroke-border" strokeWidth="1" />
          </g>

          {/* CANDIDATE LANE cards */}
          <LaneCard x={140} y={50} label="Build profile" sub="Signup" />
          <LaneCard x={270} y={50} label="Apply" sub="Submit answers" accent />
          <LaneCard x={720} y={50} label="Interview" sub="Outcome" />

          {/* EXPERT LANE cards */}
          <LaneCard x={390} y={160} label="Commit" sub="Blind hash" />
          <LaneCard x={520} y={160} label="Reveal" sub="Publish score" accent />
          <LaneCard x={650} y={160} label="Finalize" sub="IQR consensus" />

          {/* COMPANY LANE cards */}
          <LaneCard x={140} y={270} label="Post job" sub="Pick guild" />
          <LaneCard x={650} y={270} label="Shortlist" sub="Review & decide" accent />
          <LaneCard x={780} y={270} label="Hire" sub="Mark outcome" />

          {/* Arrows — candidate → expert hand-off */}
          <Arrow from={[330, 90]} to={[410, 160]} label="Applications queue" />
          {/* Expert → company hand-off */}
          <Arrow from={[690, 200]} to={[690, 270]} label="Ranked shortlist" />
          {/* Company → candidate hand-off (hire outcome) */}
          <Arrow from={[780, 290]} to={[760, 90]} label="Offer" />
          {/* Company → expert (posts job that seeds the pipeline) */}
          <Arrow from={[180, 270]} to={[180, 110]} dashed label="Seed" />
        </svg>
        <figcaption className="mt-4 text-center text-[12.5px] text-muted-foreground">
          Three parallel lanes meet at specific hand-offs. Nothing crosses except at those arrows — candidates never see expert scores, experts never see company interview notes.
        </figcaption>
      </div>

      {/* Mobile: stacked lanes */}
      <div className="space-y-6 md:hidden">
        <StackedLane label="Candidate" steps={["Profile", "Apply", "Offer"]} />
        <StackedLane label="Expert" steps={["Commit", "Reveal", "Finalize"]} accent />
        <StackedLane label="Company" steps={["Post job", "Shortlist", "Hire"]} />
        <p className="text-[12.5px] text-muted-foreground">
          Three parallel lanes meet at hand-offs. Candidates → Experts (application queue), Experts → Companies (ranked shortlist), Company → Candidate (offer).
        </p>
      </div>
    </figure>
  );
}

function LaneCard({
  x,
  y,
  label,
  sub,
  accent,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="110"
        height="44"
        rx="8"
        className={cn(
          accent ? "fill-primary/10 stroke-primary/40" : "fill-card stroke-border"
        )}
        strokeWidth="1.5"
      />
      <text
        x={x + 55}
        y={y + 20}
        textAnchor="middle"
        className={cn(
          "font-semibold",
          accent ? "fill-primary" : "fill-foreground"
        )}
        fontSize="13"
        fontFamily="Satoshi, system-ui, sans-serif"
      >
        {label}
      </text>
      <text
        x={x + 55}
        y={y + 34}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="10"
        fontFamily="Satoshi, system-ui, sans-serif"
      >
        {sub}
      </text>
    </g>
  );
}

function Arrow({
  from,
  to,
  label,
  dashed,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  dashed?: boolean;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker
          id={`arrow-${x1}-${y1}-${x2}-${y2}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth="1.5"
        className="stroke-muted-foreground"
        strokeDasharray={dashed ? "4 4" : undefined}
        markerEnd={`url(#arrow-${x1}-${y1}-${x2}-${y2})`}
      />
      {label && (
        <text
          x={midX}
          y={midY - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
          fontWeight="500"
          fontFamily="Satoshi, system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function StackedLane({
  label,
  steps,
  accent,
}: {
  label: string;
  steps: string[];
  accent?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-[12px] font-semibold",
              accent
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "bg-background text-foreground ring-1 ring-border"
            )}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
