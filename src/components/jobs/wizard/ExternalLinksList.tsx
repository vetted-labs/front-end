"use client";

import { useState } from "react";
import { GripVertical, Plus, X, Link2 } from "lucide-react";
import type { ExternalLink } from "@/types";
import { MAX_EXTERNAL_LINKS } from "@/types";
import { cn } from "@/lib/utils";

function isValidUrl(input: string): boolean {
  if (!input) return false;
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function faviconFor(url: string): string | null {
  if (!isValidUrl(url)) return null;
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
  } catch {
    return null;
  }
}

interface ExternalLinksListProps {
  value: ExternalLink[];
  onChange: (links: ExternalLink[]) => void;
}

export function ExternalLinksList({ value, onChange }: ExternalLinksListProps) {
  // Track per-row blur-validation errors. We don't show errors on every keystroke
  // because users typically paste / type a URL piecemeal.
  const [errors, setErrors] = useState<Record<number, string | undefined>>({});

  const update = (idx: number, patch: Partial<ExternalLink>) => {
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const add = () => {
    if (value.length >= MAX_EXTERNAL_LINKS) return;
    onChange([...value, { title: "", url: "" }]);
  };

  const handleBlurUrl = (idx: number) => {
    const link = value[idx];
    if (!link) return;
    if (link.url && !isValidUrl(link.url)) {
      setErrors((p) => ({ ...p, [idx]: "Enter a valid http(s) URL." }));
    } else {
      setErrors((p) => ({ ...p, [idx]: undefined }));
    }
  };

  const remaining = MAX_EXTERNAL_LINKS - value.length;

  return (
    <div className="flex flex-col gap-2.5">
      {value.map((link, i) => {
        const fav = faviconFor(link.url);
        const err = errors[i];
        return (
          <div key={i}>
            <div
              className={cn(
                "grid grid-cols-[24px_1fr_2fr_32px] items-stretch gap-2.5 p-2.5 rounded-xl border bg-muted",
                err ? "border-destructive/40" : "border-border"
              )}
            >
              <div
                className="grid place-items-center text-muted-foreground cursor-grab"
                aria-label="Drag to reorder (coming soon)"
                // TODO(reorder): wire up @dnd-kit/sortable when available
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <LinkCell label="Title">
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  maxLength={120}
                  placeholder="e.g. Engineering blog"
                  className="flex-1 bg-transparent border-0 outline-0 text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                />
              </LinkCell>
              <LinkCell
                label={
                  fav ? (
                    // eslint-disable-next-line @next/next/no-img-element -- favicon proxy URL, no need for next/image optimization
                    <img
                      src={fav}
                      alt=""
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                    />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                  )
                }
              >
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  onBlur={() => handleBlurUrl(i)}
                  placeholder="https://example.com"
                  className="flex-1 bg-transparent border-0 outline-0 text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                />
              </LinkCell>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove link ${i + 1}`}
                className="rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 grid place-items-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {err && <p className="mt-1 text-xs text-destructive pl-9">{err}</p>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        disabled={value.length >= MAX_EXTERNAL_LINKS}
        className={cn(
          "mt-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed text-sm",
          "transition-colors",
          value.length >= MAX_EXTERNAL_LINKS
            ? "border-border/60 text-muted-foreground/60 cursor-not-allowed"
            : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        )}
      >
        <span className="w-[18px] h-[18px] rounded-md bg-card border border-border grid place-items-center">
          <Plus className="w-3 h-3" />
        </span>
        Add link
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground/80">
            — up to {remaining} more
          </span>
        )}
      </button>
    </div>
  );
}

function LinkCell({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-card border border-border rounded-md min-w-0">
      {typeof label === "string" ? (
        <span className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
          {label}
        </span>
      ) : (
        label
      )}
      {children}
    </div>
  );
}
