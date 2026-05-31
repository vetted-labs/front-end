"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { EndorsementMarketplace } from "@/components/EndorsementMarketplace";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { MarketplaceGuildSwitcher } from "@/components/endorsements/MarketplaceGuildSwitcher";
import { ALL_GUILDS_ID } from "@/components/endorsements/allGuilds";
import { expertApi } from "@/lib/api";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useFetch } from "@/lib/hooks/useFetch";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { withStoryLabGuildRecords } from "@/components/expert/story-lab/storyLabFixtures";
import { getGuildIdentity } from "@/lib/guildIdentity";
import type { GuildRecord } from "@/types";

export default function EndorsementsPage() {
  const searchParams = useSearchParams();
  const applicationIdParam = searchParams.get("applicationId");
  const guildIdParam = searchParams.get("guildId");
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const { address } = useExpertAccount();
  const { guilds: realGuildRecords } = useGuilds();
  const { data: expertProfile } = useFetch(
    () => expertApi.getProfile(address!),
    { skip: !address },
  );

  const expertGuildRecords = useMemo<GuildRecord[]>(() => {
    const expertGuilds = expertProfile?.guilds ?? [];
    if (expertGuilds.length === 0) return realGuildRecords;

    return expertGuilds.map((guild) => {
      const guildWithChain = guild as typeof guild & { blockchainGuildId?: string };
      const publicRecord = realGuildRecords.find((record) => record.id === guild.id);
      return {
        id: guild.id,
        name: guild.name,
        blockchainGuildId: guildWithChain.blockchainGuildId ?? publicRecord?.blockchainGuildId,
      };
    });
  }, [expertProfile, realGuildRecords]);

  const guildRecords = isStoryLabPreview
    ? withStoryLabGuildRecords(expertGuildRecords)
    : expertGuildRecords;

  // `null` = no manual selection yet; ALL_GUILDS_ID = cross-guild view.
  const [manualGuildId, setManualGuildId] = useState<string | null>(null);

  const isAllGuilds = manualGuildId === ALL_GUILDS_ID;

  const selectedGuild = useMemo(() => {
    if (guildRecords.length === 0) return null;

    // Manual selection takes priority
    if (manualGuildId && manualGuildId !== ALL_GUILDS_ID) {
      const match = guildRecords.find(g => g.id === manualGuildId);
      if (match) return match;
    }

    // URL param
    if (guildIdParam) {
      const match = guildRecords.find(g => g.id === guildIdParam);
      if (match) return match;
    }

    // Default to Engineering when present, otherwise the first guild this expert belongs to.
    const eng = guildRecords.find(g => g.name === "Engineering" || g.name === "Engineering Guild");
    return eng || guildRecords[0];
  }, [guildRecords, guildIdParam, manualGuildId]);

  const guildIdentity = selectedGuild ? getGuildIdentity(selectedGuild.name) : null;

  // Third breadcrumb crumb: "All guilds" in cross-guild mode, else the guild short name.
  const scopeCrumb = isAllGuilds ? "All guilds" : guildIdentity?.shortName ?? null;
  // The big title is just the scope name (guild name or "All guilds").
  const scopeTitle = isAllGuilds
    ? "All guilds"
    : guildIdentity?.shortName ?? "Endorsement";

  // Selector value: the sentinel in all-guilds mode, otherwise the resolved guild id.
  const selectorValue = isAllGuilds ? ALL_GUILDS_ID : selectedGuild?.id;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Hero — guild is the visual anchor */}
        <div className="mb-8">
          {/* Breadcrumb trail */}
          <div className="mb-4 flex items-center gap-2 text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground/80">
            <VettedIcon name="endorsement" className="h-3.5 w-3.5 text-primary/70" />
            <span>Dashboard</span>
            <span className="text-muted-foreground/40">/</span>
            <span>Endorsement</span>
            {scopeCrumb && (
              <>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-foreground/85">{scopeCrumb}</span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              {/* Guild hero tile */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 -m-1 rounded-2xl bg-primary/20 blur-xl opacity-60 pointer-events-none" aria-hidden />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 ring-1 ring-primary/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                  <VettedIcon
                    name={isAllGuilds ? "guilds" : guildIdentity?.iconName ?? "endorsement"}
                    className="h-8 w-8 text-primary"
                  />
                </div>
              </div>

              <div className="min-w-0 flex items-center">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight leading-[1.05]">
                  <span className="text-primary">{scopeTitle}</span>
                </h1>
              </div>
            </div>

            {/* Guild scope selector — replaces the former "View Rewards" button */}
            <div className="flex flex-col items-start gap-1.5 sm:items-end flex-shrink-0">
              <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground/80">
                Endorse candidates in
              </span>
              <MarketplaceGuildSwitcher
                guilds={guildRecords}
                value={selectorValue}
                onChange={setManualGuildId}
              />
            </div>
          </div>
        </div>

        <EndorsementMarketplace
          key={isAllGuilds ? "all-guilds" : selectedGuild?.id ?? "loading"}
          guildId={selectedGuild?.id ?? ""}
          guildName={selectedGuild?.name ?? ""}
          blockchainGuildId={selectedGuild?.blockchainGuildId as `0x${string}` | undefined}
          initialApplicationId={applicationIdParam || undefined}
          allGuilds={isAllGuilds}
          memberGuildCount={guildRecords.length}
        />
      </div>
    </div>
  );
}
