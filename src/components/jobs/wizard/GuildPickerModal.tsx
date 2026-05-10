"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { useFetch } from "@/lib/hooks/useFetch";
import { guildsApi } from "@/lib/api";
import { getGuildIdentity } from "@/lib/guildIdentity";
import type { Guild } from "@/types";
import { cn } from "@/lib/utils";

type GuildCategory = "technical" | "go-to-market" | "operations";

interface GuildCategoryDef {
  id: GuildCategory | "all";
  label: string;
}

const CATEGORY_FILTERS: GuildCategoryDef[] = [
  { id: "all", label: "All" },
  { id: "technical", label: "Technical" },
  { id: "go-to-market", label: "Go-to-market" },
  { id: "operations", label: "Operations" },
];

/**
 * Map a guild name (or its `category` field if backend supplies one) to one
 * of the three top-level filter buckets shown in the picker.
 *
 * Engineering / Product / Design   -> Technical
 * Marketing / Sales / Growth       -> Go-to-market
 * Operations / Finance / People    -> Operations
 */
function categoryFor(guild: Guild): GuildCategory {
  const name = guild.name.toLowerCase();
  if (
    name.includes("engineer") ||
    name.includes("product") ||
    name.includes("design") ||
    name.includes("data") ||
    name.includes("ml") ||
    name.includes("ai")
  ) {
    return "technical";
  }
  if (
    name.includes("market") ||
    name.includes("sales") ||
    name.includes("growth") ||
    name.includes("success")
  ) {
    return "go-to-market";
  }
  return "operations";
}

interface GuildPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGuild?: string;
  onSelect: (guildName: string) => void;
}

export function GuildPickerModal({
  isOpen,
  onClose,
  selectedGuild,
  onSelect,
}: GuildPickerModalProps) {
  const { data: guildsData, isLoading, error } = useFetch<Guild[]>(
    () => guildsApi.getAll(),
    { skip: !isOpen }
  );
  // Memoize so the empty-array fallback identity is stable between renders —
  // otherwise dependent useMemo/useCallback hooks recompute every render.
  const guilds = useMemo(() => guildsData ?? [], [guildsData]);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<GuildCategory | "all">("all");
  const [pendingGuild, setPendingGuild] = useState<string | undefined>(selectedGuild);

  const visibleGuilds = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guilds.filter((g) => {
      if (activeCategory !== "all" && categoryFor(g) !== activeCategory) return false;
      if (!term) return true;
      return (
        g.name.toLowerCase().includes(term) ||
        (g.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [guilds, search, activeCategory]);

  const selectedGuildRecord = useMemo(
    () => guilds.find((g) => g.name === pendingGuild),
    [guilds, pendingGuild]
  );

  const handleConfirm = () => {
    if (!pendingGuild) return;
    onSelect(pendingGuild);
    onClose();
  };

  const handleCancel = () => {
    setPendingGuild(selectedGuild);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="xl">
      <div className="-m-4 sm:-m-6 flex flex-col">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[10.5px] tracking-[0.2em] uppercase text-primary font-semibold">
                Step 04 · Guild assignment
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                Which guild should review this role?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
                One guild owns review for the listing. Their experts will stake reputation
                on every candidate they vote through — you don&apos;t pick individuals,
                votes are commit-reveal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="w-9 h-9 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent grid place-items-center flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guilds…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORY_FILTERS.map((c) => {
                const isActive = activeCategory === c.id;
                const count =
                  c.id === "all"
                    ? guilds.length
                    : guilds.filter((g) => categoryFor(g) === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      isActive
                        ? "bg-accent text-foreground border-border"
                        : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {c.label}
                    {c.id === "all" && guilds.length > 0 ? ` · ${count}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="px-6 sm:px-8 py-6 max-h-[540px] overflow-y-auto">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[92px] rounded-xl border border-border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : visibleGuilds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No guilds match your search.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleGuilds.map((g) => {
                const isSelected = g.name === pendingGuild;
                const identity = getGuildIdentity(g.name);
                const tone = cn(identity.classes.text, identity.classes.bg);
                const expertCount = g.expertCount ?? g.memberCount ?? 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setPendingGuild(g.name)}
                    className={cn(
                      "group relative text-left rounded-2xl border p-4 pr-12 grid grid-cols-[44px_1fr_auto] gap-3.5 transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      isSelected
                        ? "border-primary bg-card shadow-[0_0_0_1px_hsl(var(--primary)),0_8px_24px_-12px_hsl(var(--primary)/0.4)]"
                        : "border-border bg-muted/40 hover:border-border/80 hover:bg-muted hover:-translate-y-px"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-3 right-3 w-[22px] h-[22px] rounded-full grid place-items-center transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground scale-100 opacity-100"
                          : "bg-transparent border border-border/60 scale-90 opacity-0 group-hover:opacity-60 group-hover:scale-100"
                      )}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span
                      className={cn(
                        "w-11 h-11 rounded-xl grid place-items-center transition-colors",
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : tone
                      )}
                    >
                      <VettedIcon name={identity.iconName} className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[15px] font-bold tracking-tight mb-1 transition-colors",
                          isSelected ? "text-foreground" : "text-foreground"
                        )}
                      >
                        {g.name}
                      </span>
                      <span className="block text-xs text-muted-foreground leading-snug line-clamp-2">
                        {g.description}
                      </span>
                    </span>
                    <span className="flex flex-col gap-1.5 self-start text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 tabular-nums border transition-colors",
                          isSelected
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-card border-border text-muted-foreground"
                        )}
                      >
                        <strong
                          className={cn(
                            "font-bold",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {expertCount}
                        </strong>{" "}
                        experts
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-border bg-card flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedGuildRecord ? (
              <>
                Selected:{" "}
                <strong className="text-foreground font-semibold">
                  {selectedGuildRecord.name}
                </strong>
                {" · "}
                {selectedGuildRecord.expertCount ??
                  selectedGuildRecord.memberCount ??
                  0}{" "}
                experts in this guild
              </>
            ) : (
              <span>Pick a guild to assign review</span>
            )}
          </div>
          <div className="flex gap-2.5 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!pendingGuild}
            >
              Assign guild
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
