"use client";

import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { StreakProgressCard } from "@/components/expert/quests/StreakProgressCard";
import type { QuestsResponse } from "@/types";

interface QuestsWidgetProps {
  wallet?: string;
}

/** Compact Quests preview for the expert dashboard (VET-112, reworked VET-115). */
export function QuestsWidget({ wallet }: QuestsWidgetProps) {
  const router = useRouter();
  const { data } = useFetch<QuestsResponse>(
    () => questsApi.getQuests(wallet as string),
    { skip: !wallet },
  );

  // No wallet yet (e.g. brief wagmi reconnect) — render nothing rather than a stuck "Loading…".
  if (!wallet) return null;

  const quests = data?.specific.slice(0, 3) ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-foreground">Quests</span>
      </div>

      {data ? (
        <>
          {/* Two-milestone allocation progress (replaces the daily streak). */}
          <StreakProgressCard streak={data.streak} compact />

          <div className="mt-4 flex flex-col gap-2">
            {quests.map((quest) => {
              const done = quest.myStatus === "completed" || quest.myStatus === "approved";
              return (
                <div
                  key={quest.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {done ? (
                      <Check className="h-4 w-4 shrink-0 text-positive" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-xs text-foreground">{quest.title}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <Button
            variant="default"
            className="mt-4 w-full"
            onClick={() => router.push("/expert/quests")}
          >
            Complete Quests
          </Button>
        </>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading quests…</p>
      )}
    </div>
  );
}
