"use client";

import { useState } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { TimeFilter, type TimePeriod } from "@/components/analytics/TimeFilter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExpertOverviewTab } from "./ExpertOverviewTab";
import { ExpertReviewsTab } from "./ExpertReviewsTab";
import { ExpertEndorsementsTab } from "./ExpertEndorsementsTab";

export function ExpertAnalytics() {
  const { isConnected } = useExpertAccount();
  const [period, setPeriod] = useState<TimePeriod>("30D");

  if (!isConnected) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Expert Analytics
            </h1>
            <p className="text-muted-foreground">
              Review performance, reputation, and $VETD earnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              On-chain synced
            </span>
          </div>
        </div>

        {/* Time Filter */}
        <div className="mb-6">
          <TimeFilter
            value={period}
            onChange={setPeriod}
            dateRange="Mar 1 — Mar 30, 2026"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="endorsements" className="gap-1.5">
              Endorsements
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                3
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ExpertOverviewTab />
          </TabsContent>

          <TabsContent value="reviews">
            <ExpertReviewsTab />
          </TabsContent>

          <TabsContent value="endorsements">
            <ExpertEndorsementsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
