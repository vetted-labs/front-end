"use client";
import { useState } from "react";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { EndorsementMarketplace } from "@/components/EndorsementMarketplace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Guild list with correct IDs from database
const GUILDS = [
  { id: "95b2834f-d426-45da-bf8e-f72736363897", name: "Data & Analytics" },
  { id: "484305be-3acc-4135-acac-c0e572d5553f", name: "Design & UX" },
  { id: "e5854418-f2ba-4150-b3fa-4f14013d4e65", name: "Engineering & Technology" },
  { id: "ea2b7374-9268-43ec-ada4-9231d63493c6", name: "Finance & Accounting" },
  { id: "4ee56f90-4243-4861-a933-392d3254afc2", name: "Legal & Compliance" },
  { id: "2d5bac64-dffc-4d83-82d3-6dbaba46739b", name: "Marketing & Growth" },
  { id: "7f87b692-ce62-4016-a25a-d5636e6ba7a6", name: "Operations & Strategy" },
  { id: "306973a6-3776-412b-b464-d55548f613cf", name: "People & HR" },
  { id: "9f13bb4a-2760-4699-baf2-51a92cc17ba2", name: "Product Management" },
  { id: "09e92ec4-c2e1-428e-b77d-c91dff4d869e", name: "Sales & Business Development" },
];

export default function EndorsementsPage() {
  // Default to Engineering & Technology (has 3 applications in reviewing status)
  const [selectedGuild, setSelectedGuild] = useState(
    GUILDS.find(g => g.name === "Engineering & Technology") || GUILDS[0]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2">Endorsement Marketplace</h1>
            <p className="text-muted-foreground">
              Endorse candidates you believe will succeed. Top 3 endorsers earn rewards when candidate is hired.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Guild:</label>
            <Select
              value={selectedGuild.id}
              onValueChange={(value) => {
                const guild = GUILDS.find((g) => g.id === value);
                if (guild) setSelectedGuild(guild);
              }}
            >
              <SelectTrigger className="w-[300px]">
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
          </div>
        </div>

        <EndorsementMarketplace
          guildId={selectedGuild.id}
          guildName={selectedGuild.name}
        />
      </div>
    </div>
  );
}
