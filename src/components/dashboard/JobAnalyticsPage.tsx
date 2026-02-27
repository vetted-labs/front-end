"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function JobAnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push("/dashboard/analytics")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Job Analytics</h1>
          </div>
        </div>

        {/* Blurred content with "Coming Soon" overlay */}
        <div className="relative">
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm px-8 py-6 text-center shadow-lg dark:bg-card/60">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Per-job analytics with detailed conversion metrics are on the way.
              </p>
            </div>
          </div>

          {/* Blurred placeholder content */}
          <div className="blur-[6px] pointer-events-none select-none" aria-hidden="true">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Views", value: "342", icon: Eye },
                { label: "Total Applicants", value: "28", icon: Users },
                { label: "Conversion Rate", value: "8.2%", icon: TrendingUp },
                { label: "Accepted", value: "4", icon: CheckCircle },
              ].map((metric) => (
                <div key={metric.label} className="bg-card p-6 rounded-xl border border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                      <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                    </div>
                    <metric.icon className="w-10 h-10 text-primary/20" />
                  </div>
                </div>
              ))}
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">Application Status</h3>
                <div className="space-y-4">
                  {[
                    { label: "Pending Review", value: 12, bg: "bg-yellow-50 dark:bg-yellow-900/20", icon: Clock },
                    { label: "Under Review", value: 8, bg: "bg-blue-50 dark:bg-blue-900/20", icon: Eye },
                    { label: "Accepted", value: 4, bg: "bg-green-50 dark:bg-green-900/20", icon: CheckCircle },
                    { label: "Rejected", value: 4, bg: "bg-red-50 dark:bg-red-900/20", icon: Users },
                  ].map((s) => (
                    <div key={s.label} className={`flex items-center justify-between p-4 ${s.bg} rounded-lg`}>
                      <div className="flex items-center gap-3">
                        <s.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{s.label}</span>
                      </div>
                      <span className="text-2xl font-bold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">Job Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground text-sm leading-relaxed line-clamp-4">
                      We are looking for a senior software engineer to join our team...
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Department</p>
                    <p className="text-foreground font-medium">Engineering</p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="w-full px-4 py-2 bg-primary/20 text-primary rounded-lg text-center font-medium">
                      Edit Job Posting
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
