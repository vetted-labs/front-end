"use client";

// ── Constants ──────────────────────────────────────────────────

const VB_W = 640;
const VB_H = 210;
const PAD_L = 50;
const PAD_R = 30;
const PAD_T = 20;
const PAD_B = 40; // room for X labels
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;
const BAR_W = 52;
const BAR_GAP = 10;

// ── Helpers ────────────────────────────────────────────────────

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const residual = v / mag;
  if (residual <= 1) return mag;
  if (residual <= 2) return 2 * mag;
  if (residual <= 5) return 5 * mag;
  return 10 * mag;
}

// ── Component ──────────────────────────────────────────────────

interface Bar {
  range: string;
  count: number;
  opacity: number;
  isMedian?: boolean;
}

interface BarDistributionProps {
  bars: Bar[];
  medianLabel?: string;
}

export function BarDistribution({ bars, medianLabel }: BarDistributionProps) {
  if (bars.length === 0) return null;

  const maxCount = Math.max(...bars.map((b) => b.count));
  const ceiling = niceMax(maxCount);
  const baselineY = PAD_T + PLOT_H;

  // Center bars in the available width
  const totalBarsWidth = bars.length * BAR_W + (bars.length - 1) * BAR_GAP;
  const startX = PAD_L + (PLOT_W - totalBarsWidth) / 2;

  // Grid lines (4 lines + baseline)
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const frac = i / (gridCount - 1);
    return {
      value: Math.round(ceiling * (1 - frac)),
      y: PAD_T + frac * PLOT_H,
    };
  });

  // Find the median bar for the dashed line
  const medianBar = bars.find((b) => b.isMedian);
  const medianIdx = bars.indexOf(medianBar!);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full block"
    >
      <defs>
        {/* Full-opacity gradient for the median bar */}
        <linearGradient id="bar-dist-median" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((gl, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={PAD_L}
            y1={gl.y}
            x2={VB_W - PAD_R}
            y2={gl.y}
            stroke="currentColor"
            className={
              i === gridCount - 1
                ? "text-foreground/[0.06]"
                : "text-foreground/[0.03]"
            }
            strokeWidth="0.5"
          />
        </g>
      ))}

      {/* Bars */}
      {bars.map((bar, i) => {
        const x = startX + i * (BAR_W + BAR_GAP);
        const barH = Math.max(2, (bar.count / ceiling) * PLOT_H);
        const y = baselineY - barH;
        const isMedianBar = bar.isMedian;

        return (
          <g key={bar.range}>
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx="4"
              fill={
                isMedianBar
                  ? "url(#bar-dist-median)"
                  : `hsl(var(--primary) / ${bar.opacity})`
              }
            />

            {/* X-axis label */}
            <text
              x={x + BAR_W / 2}
              y={baselineY + 18}
              textAnchor="middle"
              fontSize="9"
              fill="hsl(var(--muted-foreground))"
              opacity={isMedianBar ? 0.7 : 0.35}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isMedianBar ? "600" : "400"}
            >
              {bar.range}
            </text>
          </g>
        );
      })}

      {/* Median dashed line */}
      {medianBar && medianIdx >= 0 && (
        <>
          {(() => {
            const mx =
              startX + medianIdx * (BAR_W + BAR_GAP) + BAR_W / 2;
            return (
              <>
                <line
                  x1={mx}
                  y1={PAD_T - 6}
                  x2={mx}
                  y2={baselineY}
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                  opacity="0.35"
                />
                {medianLabel && (
                  <>
                    <rect
                      x={mx - 22}
                      y={PAD_T - 16}
                      width="44"
                      height="13"
                      rx="3"
                      fill="hsl(var(--primary))"
                      opacity="0.1"
                    />
                    <text
                      x={mx}
                      y={PAD_T - 7}
                      textAnchor="middle"
                      fontSize="8"
                      fill="hsl(var(--primary))"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      {medianLabel}
                    </text>
                  </>
                )}
              </>
            );
          })()}
        </>
      )}
    </svg>
  );
}
