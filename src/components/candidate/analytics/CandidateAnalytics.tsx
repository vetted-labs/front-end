"use client";

import { useState, useMemo } from "react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import {
  TimeFilter,
  type TimePeriod,
} from "@/components/analytics/TimeFilter";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CandidateOverviewTab } from "./CandidateOverviewTab";
import { CandidateApplicationsTab } from "./CandidateApplicationsTab";
import { CandidateVisibilityTab } from "./CandidateVisibilityTab";

export function CandidateAnalytics() {
  const { ready } = useRequireAuth("candidate");
  const [period, setPeriod] = useState<TimePeriod>("30D");

  const { data: appsData } = useFetch(
    () => analyticsApi.getCandidateApplicationStats(),
    { skip: !ready }
  );

  const appCount = Array.isArray(appsData) ? (appsData as unknown[]).length : null;

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days =
      period === "30D" ? 30 : period === "90D" ? 90 : period === "YTD" ? 180 : 365;
    start.setDate(end.getDate() - days);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [period]);

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              My Analytics
            </h1>
            <p className="text-muted-foreground">
              Applications, vetting scores, and visibility
            </p>
          </div>
        </div>

        {/* Time Filter */}
        <div className="mb-6">
          <TimeFilter
            value={period}
            onChange={setPeriod}
            dateRange={dateRange}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5">
              Applications
              {appCount !== null && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {appCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CandidateOverviewTab period={period} />
          </TabsContent>

          <TabsContent value="applications">
            <CandidateApplicationsTab />
          </TabsContent>

          <TabsContent value="visibility">
            <CandidateVisibilityTab period={period} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
