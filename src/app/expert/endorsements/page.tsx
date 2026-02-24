"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EndorsementMarketplace } from "@/components/EndorsementMarketplace";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ShieldCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuilds } from "@/lib/hooks/useGuilds";

export default function EndorsementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationIdParam = searchParams.get("applicationId");
  const guildIdParam = searchParams.get("guildId");
  const { guilds: guildRecords } = useGuilds();

  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string } | null>(null);

  // Auto-select guild once data loads or URL params change
  useEffect(() => {
    if (guildRecords.length === 0) return;

    if (guildIdParam) {
      const match = guildRecords.find(g => g.id === guildIdParam);
      if (match) { setSelectedGuild(match); return; }
    }

    // Default to Engineering Guild, or first guild
    if (!selectedGuild) {
      const eng = guildRecords.find(g => g.name === "Engineering Guild");
      setSelectedGuild(eng || guildRecords[0]);
    }
  }, [guildRecords, guildIdParam, selectedGuild]);

  return (
    <div className="min-h-full">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                <Sparkles className="h-3.5 w-3.5" />
                Live Market
              </div>
              <h1 className="text-3xl font-bold md:text-4xl font-display">
                Endorsement Marketplace
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Endorse candidates you believe will succeed. Top 3 endorsers earn rewards when the candidate is hired.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/expert/endorsements/rewards")}
                className="mt-2"
              >
                <Award className="w-4 h-4 mr-2" />
                View Rewards
              </Button>
            </div>

            <div className="w-full lg:max-w-sm">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_20px_60px_-30px_rgba(255,106,0,0.35)] backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-orange-400" />
                    Select Guild
                  </div>
                  <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-400">
                    Verified
                  </Badge>
                </div>
                <Select
                  value={selectedGuild?.id ?? ""}
                  onValueChange={(value) => {
                    const guild = guildRecords.find((g) => g.id === value);
                    if (guild) setSelectedGuild(guild);
                  }}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-border/60 bg-background/70 text-base shadow-sm transition hover:border-orange-500/40">
                    <SelectValue placeholder="Select a guild" />
                  </SelectTrigger>
                  <SelectContent>
                    {guildRecords.map((guild) => (
                      <SelectItem key={guild.id} value={guild.id}>
                        {guild.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-3 text-xs text-muted-foreground">
                  Choose a guild to see live candidates and endorsement liquidity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {selectedGuild && (
          <EndorsementMarketplace
            guildId={selectedGuild.id}
            guildName={selectedGuild.name}
            initialApplicationId={applicationIdParam || undefined}
          />
        )}
      </div>
    </div>
  );
}
