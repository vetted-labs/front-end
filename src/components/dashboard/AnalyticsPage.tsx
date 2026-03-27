"use client";

import {
  Users,
  Briefcase,
  Eye,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

export default function AnalyticsPage() {
  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
          <p className="text-muted-foreground">Track your hiring performance and metrics</p>
        </div>

        {/* Blurred content with "Coming Soon" overlay */}
        <div className="relative">
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-border bg-card px-8 py-6 text-center shadow-sm">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground mb-2">Coming Soon</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Advanced analytics and hiring insights are being built. Stay tuned!
              </p>
            </div>
          </div>

          {/* Blurred placeholder content */}
          <div className="blur-[6px] pointer-events-none select-none" aria-hidden="true">
            {/* Key Metrics */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { icon: Users, label: "Applications", value: "124" },
                { icon: CheckCircle, label: "Hires", value: "8" },
                { icon: Briefcase, label: "Active Jobs", value: "5" },
                { icon: Clock, label: "Avg. Days", value: "14" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3"
                >
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <span className="text-sm font-medium text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Placeholder chart */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Applications Over Time</h3>
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="p-5 space-y-4">
                  {["Jan", "Feb", "Mar", "Apr"].map((month) => (
                    <div key={month}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground font-medium">{month}</span>
                        <span className="text-sm text-muted-foreground">32 applications</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placeholder status breakdown */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Applications by Status</h3>
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { label: "Pending", value: 48, color: `${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.border}`, icon: Clock, iconColor: STATUS_COLORS.warning.icon },
                    { label: "Reviewing", value: 36, color: `${STATUS_COLORS.info.bgSubtle} ${STATUS_COLORS.info.border}`, icon: Eye, iconColor: STATUS_COLORS.info.icon },
                    { label: "Accepted", value: 18, color: `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}`, icon: CheckCircle, iconColor: STATUS_COLORS.positive.icon },
                    { label: "Rejected", value: 22, color: `${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.border}`, icon: Users, iconColor: STATUS_COLORS.negative.icon },
                  ].map((status) => (
                    <div key={status.label} className={`flex items-center justify-between p-4 ${status.color} border rounded-xl`}>
                      <div className="flex items-center gap-3">
                        <status.icon className={`w-5 h-5 ${status.iconColor}`} />
                        <span className="font-medium text-foreground">{status.label}</span>
                      </div>
                      <span className="text-2xl font-bold text-foreground">{status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Placeholder jobs list */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">My Posted Jobs</h3>
              </div>
              <div className="divide-y divide-border/30">
                {["Senior Engineer", "Product Manager", "Designer"].map((title) => (
                  <div key={title} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">24 applicants · 156 views</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS.positive.badge}`}>active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
