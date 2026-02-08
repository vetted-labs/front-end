"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ExpertNavbar } from "@/components/ExpertNavbar";
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

// Guild list with correct IDs from database
const GUILDS = [
  { id: "484305be-3acc-4135-acac-c0e572d5553f", name: "Design Guild" },
  { id: "e5854418-f2ba-4150-b3fa-4f14013d4e65", name: "Engineering Guild" },
  { id: "ea2b7374-9268-43ec-ada4-9231d63493c6", name: "Finance, Legal & Compliance Guild" },
  { id: "2d5bac64-dffc-4d83-82d3-6dbaba46739b", name: "Marketing & Growth Guild" },
  { id: "7f87b692-ce62-4016-a25a-d5636e6ba7a6", name: "Operations & Strategy Guild" },
  { id: "306973a6-3776-412b-b464-d55548f613cf", name: "People, HR & Recruitment Guild" },
  { id: "9f13bb4a-2760-4699-baf2-51a92cc17ba2", name: "Product Guild" },
  { id: "09e92ec4-c2e1-428e-b77d-c91dff4d869e", name: "Sales & Success Guild" },
];

export default function EndorsementsPage() {
  const searchParams = useSearchParams();
  const applicationIdParam = searchParams.get("applicationId");
  const guildIdParam = searchParams.get("guildId");

  // Auto-select guild from URL param, or default to Engineering & Technology
  const initialGuild = (guildIdParam && GUILDS.find(g => g.id === guildIdParam))
    || GUILDS.find(g => g.name === "Engineering Guild")
    || GUILDS[0];

  const [selectedGuild, setSelectedGuild] = useState(initialGuild);

  // Update guild selection if URL params change
  useEffect(() => {
    if (guildIdParam) {
      const guild = GUILDS.find(g => g.id === guildIdParam);
      if (guild) setSelectedGuild(guild);
    }
  }, [guildIdParam]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

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
                onClick={() => window.location.href = "/expert/endorsements/rewards"}
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
                  value={selectedGuild.id}
                  onValueChange={(value) => {
                    const guild = GUILDS.find((g) => g.id === value);
                    if (guild) setSelectedGuild(guild);
                  }}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-border/60 bg-background/70 text-base shadow-sm transition hover:border-orange-500/40">
                    <SelectValue placeholder="Select a guild" />
                  </SelectTrigger>
                  <SelectContent>
                    {GUILDS.map((guild) => (
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

        <EndorsementMarketplace
          guildId={selectedGuild.id}
          guildName={selectedGuild.name}
          initialApplicationId={applicationIdParam || undefined}
        />
      </div>
    </div>
  );
}
