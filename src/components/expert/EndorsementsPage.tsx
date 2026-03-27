"use client";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EndorsementMarketplace } from "@/components/EndorsementMarketplace";
import { Sparkles, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { STATUS_COLORS } from "@/config/colors";

export default function EndorsementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationIdParam = searchParams.get("applicationId");
  const guildIdParam = searchParams.get("guildId");
  const { guilds: guildRecords } = useGuilds();

  const [manualGuildId, setManualGuildId] = useState<string | null>(null);

  const selectedGuild = useMemo(() => {
    if (guildRecords.length === 0) return null;

    // Manual selection takes priority
    if (manualGuildId) {
      const match = guildRecords.find(g => g.id === manualGuildId);
      if (match) return match;
    }

    // URL param
    if (guildIdParam) {
      const match = guildRecords.find(g => g.id === guildIdParam);
      if (match) return match;
    }

    // Default to Engineering Guild, or first guild
    const eng = guildRecords.find(g => g.name === "Engineering Guild");
    return eng || guildRecords[0];
  }, [guildRecords, guildIdParam, manualGuildId]);

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${STATUS_COLORS.pending.badge}`}>
                <Sparkles className="h-3.5 w-3.5" />
                Live Market
              </div>
              <h1 className="text-3xl font-bold md:text-3xl font-display">
                Endorsement Marketplace
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Endorse candidates you believe will succeed. Top 3 endorsers earn rewards when the candidate is hired.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/expert/earnings")}
            >
              <Award className="w-4 h-4 mr-2" />
              View Rewards
            </Button>
          </div>
        </div>

        {selectedGuild && (
          <EndorsementMarketplace
            key={selectedGuild.id}
            guildId={selectedGuild.id}
            guildName={selectedGuild.name}
            blockchainGuildId={selectedGuild.blockchainGuildId as `0x${string}` | undefined}
            initialApplicationId={applicationIdParam || undefined}
            guilds={guildRecords}
            selectedGuildId={selectedGuild.id}
            onGuildChange={setManualGuildId}
          />
        )}
      </div>
    </div>
  );
}
