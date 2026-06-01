"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Display-only gate for the Specific quests tab when the expert is not yet a
 * member of any guild. Per VET-114, Specific quests unlock once an expert is
 * accepted into a guild (the expertise field is chosen during the application
 * flow); v1 gates purely on guild membership.
 */
export function ExpertiseGate() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <Lock className="mb-3 h-10 w-10 text-muted-foreground opacity-60" />
      <h3 className="text-sm font-bold text-foreground">Specific quests are locked</h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        Specific quests are tailored to your field of expertise. Get accepted into a guild to
        unlock its quests and start earning field-specific rewards.
      </p>
      <Button className="mt-4" variant="default" size="sm" onClick={() => router.push("/expert/guilds")}>
        Explore guilds
      </Button>
    </div>
  );
}
