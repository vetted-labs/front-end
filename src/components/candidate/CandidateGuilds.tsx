"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ArrowRight,
  Eye,
  Star,
} from "lucide-react";
import { candidateApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildIcon, getGuildColor } from "@/lib/guildHelpers";
import { STATUS_COLORS } from "@/config/colors";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { GuildApplicationSummary } from "@/types";
import { ListSkeleton } from "@/components/ui/page-skeleton";

const GUILD_STATUS_ICONS: Record<string, typeof Clock> = {
  pending:  Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const GUILD_STATUS_GLOW: Record<string, string> = {
  pending:  "",
  approved: "",
  rejected: "",
};

/** Map guild-specific statuses to APPLICATION_STATUS_CONFIG keys */
const GUILD_STATUS_KEY: Record<string, string> = {
  approved: "accepted",
};

export default function CandidateGuilds() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const { data: guildApplicationsData, isLoading } = useFetch(
    () => candidateApi.getGuildApplications(),
    { skip: !ready }
  );

  const guildApplications: GuildApplicationSummary[] = Array.isArray(guildApplicationsData) ? guildApplicationsData : [];

  if (!ready || isLoading) return <ListSkeleton />;

  const filtered = filter === "all"
    ? guildApplications
    : guildApplications.filter((a) => a.status === filter);

  const counts = {
    all: guildApplications.length,
    pending: guildApplications.filter((a) => a.status === "pending").length,
    approved: guildApplications.filter((a) => a.status === "approved").length,
    rejected: guildApplications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="min-h-full relative animate-page-enter">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">My Guilds</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {guildApplications.length} application{guildApplications.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/guilds")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Explore Guilds
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter pills */}
        {guildApplications.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(["all", "pending", "approved", "rejected"] as const).map((key) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)} ({counts[key]})
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {guildApplications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No guild applications yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Join a guild to get vetted by expert reviewers and access exclusive job opportunities
            </p>
            <button
              onClick={() => router.push("/guilds")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all text-sm font-medium"
            >
              Browse Guilds
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No {filter} applications</p>
            <button onClick={() => setFilter("all")} className="mt-2 text-sm text-primary hover:underline">
              Show all
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((app) => {
              const guildName = app.guildName || app.guild?.name || "Guild";
              const GuildIcon = getGuildIcon(guildName);
              const gradient = getGuildColor(guildName);
              const configKey = GUILD_STATUS_KEY[app.status] || app.status;
              const statusStyle = APPLICATION_STATUS_CONFIG[configKey] || APPLICATION_STATUS_CONFIG.pending;
              const StatusIcon = GUILD_STATUS_ICONS[app.status] || Clock;
              const glow = GUILD_STATUS_GLOW[app.status] || "";
              const appliedDate = app.submittedAt || app.createdAt;

              return (
                <button
                  key={app.id}
                  onClick={() => {
                    const guildId = app.guildId || app.guild?.id;
                    if (guildId) router.push(`/guilds/${guildId}`);
                  }}
                  className={`group relative text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all ${glow}`}
                >
                  {/* Top gradient banner */}
                  <div className={`h-20 ${gradient} relative`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center border border-muted-foreground/20">
                        <GuildIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{guildName}</h3>
                      </div>
                    </div>
                    {/* Status badge top-right */}
                    <div className={`absolute top-3 right-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusStyle.label}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-4 space-y-3">
                    {/* Job info */}
                    {app.jobTitle && (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{app.jobTitle}</span>
                      </div>
                    )}

                    {/* Review progress (if available) */}
                    {((app.reviewCount ?? 0) > 0 || (app.approvalCount ?? 0) > 0) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          {app.reviewCount || 0} review{(app.reviewCount || 0) !== 1 ? "s" : ""}
                        </span>
                        {(app.approvalCount ?? 0) > 0 && (
                          <span className={`flex items-center gap-2 ${STATUS_COLORS.positive.text}`}>
                            <Star className="w-3 h-3" />
                            {app.approvalCount} approval{app.approvalCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground/60">
                        Applied {appliedDate ? formatTimeAgo(appliedDate) : "recently"}
                      </span>
                      <span className="text-xs text-primary flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Guild <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
