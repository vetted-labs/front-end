"use client";

import { Play, X, Youtube } from "lucide-react";
import type { EmbedProvider } from "@/types";
import { cn } from "@/lib/utils";

const YT_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?[^\s]*v=[\w-]+|youtu\.be\/[\w-]+)/i;
const LOOM_PATTERN = /^https?:\/\/(www\.)?loom\.com\/share\/[\w-]+/i;

function detect(url: string): EmbedProvider | null {
  if (!url) return null;
  if (YT_PATTERN.test(url)) return "youtube";
  if (LOOM_PATTERN.test(url)) return "loom";
  return null;
}

interface EmbedFieldProps {
  value?: { provider: EmbedProvider; url: string };
  onChange: (v: { provider: EmbedProvider; url: string } | undefined) => void;
}

export function EmbedField({ value, onChange }: EmbedFieldProps) {
  const url = value?.url ?? "";
  const provider = detect(url);
  const error =
    url.length > 0 && provider === null
      ? "Paste a YouTube watch URL or a loom.com/share URL."
      : null;

  const handleChange = (next: string) => {
    if (!next) {
      onChange(undefined);
      return;
    }
    const p = detect(next);
    if (p) {
      onChange({ provider: p, url: next });
    } else {
      // Keep partial URL visible; mark provider as 'youtube' as a placeholder
      // so the controlled input value stays in sync. The validation error
      // prevents persisting an invalid embed.
      onChange({ provider: "youtube", url: next });
    }
  };

  const clear = () => onChange(undefined);

  return (
    <div className="flex flex-col gap-3.5">
      <div
        className={cn(
          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-muted",
          error ? "border-destructive/40" : "border-border"
        )}
      >
        <ProviderChip provider={provider} />
        <input
          type="url"
          value={url}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=… or https://www.loom.com/share/…"
          className="flex-1 bg-transparent border-0 outline-0 text-[12.5px] font-mono text-foreground placeholder:text-muted-foreground min-w-0"
        />
        {provider && !error && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Verified
          </span>
        )}
        {url && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear embed"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Preview rectangle (does not actually embed in v1) */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-gradient-to-br from-card to-muted grid place-items-center">
        <div className="w-16 h-16 rounded-full bg-black/40 border border-border grid place-items-center backdrop-blur-md">
          <Play className="w-6 h-6 text-foreground translate-x-0.5" />
        </div>
        <div className="absolute left-4 bottom-3 text-xs text-muted-foreground">
          {provider && !error
            ? `Will embed ${provider === "youtube" ? "YouTube" : "Loom"} on listing`
            : "Will embed on listing"}
        </div>
      </div>
    </div>
  );
}

function ProviderChip({ provider }: { provider: EmbedProvider | null }) {
  if (provider === "youtube") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-[11.5px] font-semibold text-foreground tracking-wide">
        <Youtube className="w-3.5 h-3.5 text-[#ff0033]" />
        YouTube
      </span>
    );
  }
  if (provider === "loom") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-card border border-border text-[11.5px] font-semibold text-foreground tracking-wide">
        Loom
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-card border border-border text-[11.5px] font-semibold text-muted-foreground tracking-wide">
      Detect…
    </span>
  );
}
