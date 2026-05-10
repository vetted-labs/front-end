"use client";

import { useMemo, useState } from "react";
import { Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/lib/hooks/useFetch";
import { guildsApi } from "@/lib/api";
import type { Guild } from "@/types";
import { GuildPickerModal } from "../GuildPickerModal";
import type { StepProps } from "../wizard-types";

export function StepGuild({ formData, fieldErrors, updateField }: StepProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // We fetch the same guild list here so the assigned-state card can show
  // the guild's description / expert count without reopening the modal.
  // useFetch dedupes via React's render cycle and the modal also fetches
  // when opened — this is a small duplicate request, acceptable for now.
  const { data: guildsData } = useFetch<Guild[]>(() => guildsApi.getAll());
  // Stabilize empty-array identity so the assignedGuild memo doesn't churn.
  const guilds = useMemo(() => guildsData ?? [], [guildsData]);

  const assignedGuild = useMemo(
    () => guilds.find((g) => g.name === formData.guild),
    [guilds, formData.guild]
  );

  const guildError = fieldErrors.guild;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-[0.2em] uppercase text-primary font-semibold mb-2">
          Step 04
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Pick the guild that owns review
        </h2>
        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mt-2 max-w-2xl">
          A single guild reviews every applicant for this listing. Their experts stake
          reputation on candidates they vote through — you don&apos;t pick individuals.
        </p>
      </div>

      {!formData.guild ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center mx-auto mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Pick the guild that owns review for this listing
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Browse all guilds, filter by category, and assign one. You can change
            this later before publishing.
          </p>
          <Button type="button" onClick={() => setIsPickerOpen(true)}>
            Choose guild
          </Button>
          {guildError && (
            <p className="mt-4 text-sm text-destructive">{guildError}</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-1">
                Assigned guild
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {assignedGuild?.name ?? formData.guild}
              </h3>
              {assignedGuild?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
                  {assignedGuild.description}
                </p>
              )}
              {assignedGuild && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-full px-2.5 py-1 tabular-nums">
                  <Users className="w-3 h-3" />
                  <strong className="text-foreground font-semibold">
                    {assignedGuild.expertCount ?? assignedGuild.memberCount ?? 0}
                  </strong>{" "}
                  experts in this guild
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              Change guild
            </button>
          </div>
          {guildError && (
            <p className="mt-4 text-sm text-destructive">{guildError}</p>
          )}
        </div>
      )}

      <GuildPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedGuild={formData.guild || undefined}
        onSelect={(name) => updateField("guild", name)}
      />
    </div>
  );
}
