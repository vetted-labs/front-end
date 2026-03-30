"use client";

import { cn } from "@/lib/utils";
import { useState, useCallback, type CSSProperties } from "react";

type MaskDirection = "fade-bottom" | "fade-top" | "radial-center" | "radial-top" | "fade-diagonal" | "none";

interface PatternBackgroundProps {
  mask?: MaskDirection;
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
}

const maskGradients: Record<MaskDirection, string | undefined> = {
  "fade-bottom": "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
  "fade-top": "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 30%, black 60%, transparent 100%)",
  "radial-center": "radial-gradient(ellipse 80% 90% at 50% 40%, black, rgba(0,0,0,0.2) 60%, transparent 90%)",
  "radial-top": "radial-gradient(ellipse 90% 80% at 50% 20%, black, rgba(0,0,0,0.3) 60%, transparent 85%)",
  "fade-diagonal": "linear-gradient(135deg, black 0%, rgba(0,0,0,0.3) 50%, transparent 80%)",
  none: undefined,
};

const intensityMap = {
  subtle: "opacity-[0.03]",
  medium: "opacity-[0.05]",
  strong: "opacity-[0.07]",
};

export function PatternBackground({
  mask = "fade-bottom",
  className,
  intensity = "medium",
}: PatternBackgroundProps) {
  const gradient = maskGradients[mask];

  const style: CSSProperties = {};
  if (gradient) {
    style.maskImage = gradient;
    style.WebkitMaskImage = gradient;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 vetted-pattern-layer",
        intensityMap[intensity],
        className,
      )}
      style={Object.keys(style).length > 0 ? style : undefined}
    />
  );
}

/** Dev-only floating slider to tweak pattern opacity and size across the entire page */
export function PatternOpacityToggle() {
  const [opacity, setOpacity] = useState(80);
  const [size, setSize] = useState(100);
  const [mode, setMode] = useState<"cover" | "repeat">("cover");
  const [open, setOpen] = useState(false);

  const applyToAll = useCallback((prop: string, value: string) => {
    document.querySelectorAll<HTMLElement>(".vetted-pattern-layer").forEach((el) => {
      el.style.setProperty(prop, value, "important");
    });
  }, []);

  const handleOpacity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setOpacity(val);
    applyToAll("opacity", String(val / 100));
  }, [applyToAll]);

  const handleSize = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSize(val);
    if (mode === "cover") {
      applyToAll("background-size", `${val}%`);
    } else {
      applyToAll("background-size", `${val * 10.8}px ${val * 10.8}px`);
    }
  }, [applyToAll, mode]);

  const handleMode = useCallback((newMode: "cover" | "repeat") => {
    setMode(newMode);
    if (newMode === "cover") {
      applyToAll("background-repeat", "no-repeat");
      applyToAll("background-size", `${size}%`);
    } else {
      applyToAll("background-repeat", "repeat");
      applyToAll("background-size", `${size * 10.8}px ${size * 10.8}px`);
    }
  }, [applyToAll, size]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {open && (
        <div className="mb-2 rounded-lg border border-border bg-card p-3 shadow-lg min-w-[220px]">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Opacity</span>
            <span className="font-mono">{opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={opacity}
            onChange={handleOpacity}
            className="w-full accent-[hsl(var(--primary))]"
          />
          <div className="mt-3 mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Size</span>
            <span className="font-mono">{mode === "cover" ? `${size}%` : `${Math.round(size * 10.8)}px`}</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            step={5}
            value={size}
            onChange={handleSize}
            className="w-full accent-[hsl(var(--primary))]"
          />
          <div className="mt-3 flex gap-1">
            <button
              onClick={() => handleMode("cover")}
              className={`flex-1 rounded px-2 py-1 text-[11px] border transition-colors ${mode === "cover" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              Single
            </button>
            <button
              onClick={() => handleMode("repeat")}
              className={`flex-1 rounded px-2 py-1 text-[11px] border transition-colors ${mode === "repeat" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              Repeat
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:bg-muted hover:text-foreground"
        title="Toggle pattern controls"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
