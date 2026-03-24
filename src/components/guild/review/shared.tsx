"use client";

export function renderPromptLines(prompt?: string) {
  if (!prompt) return null;
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {lines.map((line, idx) => (
        <p key={idx} className={idx === 0 ? "" : "pl-4"}>
          {idx === 0 ? line : `• ${line}`}
        </p>
      ))}
    </div>
  );
}

export function ScoreButtons({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max + 1 }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onChange(idx)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            value === idx
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
