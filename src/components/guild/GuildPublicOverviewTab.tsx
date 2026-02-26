"use client";

import {
  Award,
  Star,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui";
import { getRoleBadgeColor } from "@/lib/guildHelpers";
import { formatSalaryRange } from "@/lib/utils";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import type { GuildActivity } from "@/components/guild/GuildActivityTab";
import type { ExpertMember, Job } from "@/types";

interface GuildPublicOverviewTabProps {
  guild: {
    experts: ExpertMember[];
    expertCount: number;
    recentJobs: Job[];
    recentActivity: GuildActivity[];
  };
  isMember: boolean;
  isPending: boolean;
  onNavigate: (path: string) => void;
  onTabChange: (tab: string) => void;
  onApply: () => void;
}

export function GuildPublicOverviewTab({
  guild,
  isMember,
  isPending,
  onNavigate,
  onTabChange,
  onApply,
}: GuildPublicOverviewTabProps) {
  const showCta = !isMember && !isPending;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Top Experts */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Experts
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {(guild.experts || []).slice(0, 4).map((expert) => (
              <button
                key={expert.id}
                onClick={() => onNavigate(`/experts/${expert.walletAddress}`)}
                className="rounded-xl border border-border/80 bg-card/60 p-4 hover:border-primary/40 hover:shadow-lg transition-all hover:-translate-y-0.5 text-left cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{expert.fullName}</h3>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                        expert.role
                      )}`}
                    >
                      {expert.role.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{expert.reputation}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(expert.expertise ?? []).slice(0, 3).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-muted/60 text-foreground text-xs rounded-md border border-border/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                {(expert.totalReviews ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    {expert.totalReviews} reviews • {expert.successRate}% success rate
                  </div>
                )}
              </button>
            ))}
          </div>
          {(guild.experts || []).length > 4 && (
            <button
              onClick={() => onTabChange("experts")}
              className="mt-4 text-sm text-primary hover:underline"
            >
              View all {guild.experts?.length || guild.expertCount} experts →
            </button>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Recent Positions
          </h2>
          {guild.recentJobs && guild.recentJobs.length > 0 ? (
            <div className="space-y-3">
              {guild.recentJobs.slice(0, 5).map((job) => (
                <button
                  key={job.id}
                  onClick={() => onNavigate(`/browse/jobs/${job.id}`)}
                  className="w-full rounded-xl border border-border/80 bg-card/60 p-4 hover:border-primary/40 hover:shadow-lg transition-all hover:-translate-y-0.5 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-medium rounded">
                          {job.type}
                        </span>
                        {(job.salary.min || job.salary.max) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatSalaryRange(job.salary)}
                          </span>
                        )}
                        {(job.applicants ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {job.applicants} applicants
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent job postings
            </p>
          )}
          <button
            onClick={() => onTabChange("jobs")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            View all jobs →
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Why Join */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Why Join This Guild?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Vetted by Experts</p>
                <p className="text-sm text-muted-foreground">
                  Get reviewed and endorsed by industry professionals
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Exclusive Access</p>
                <p className="text-sm text-muted-foreground">
                  Apply to guild-specific job openings
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Build Reputation</p>
                <p className="text-sm text-muted-foreground">
                  Earn reputation points and stand out to employers
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Community Support</p>
                <p className="text-sm text-muted-foreground">
                  Connect with peers and mentors in your field
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Recent Activity */}
        {guild.recentActivity && guild.recentActivity.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <GuildActivityFeed
              activities={guild.recentActivity}
              compact
              maxItems={8}
              maxHeight="320px"
              onViewAll={() => onTabChange("activity")}
            />
          </div>
        )}

        {/* CTA */}
        {showCta && (
          <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 rounded-2xl border border-primary/30 p-6 shadow-[0_0_30px_rgba(255,122,0,0.12)]">
            <h3 className="text-lg font-bold text-foreground mb-2">Ready to Join?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Submit your application and get vetted by our expert community
            </p>
            <Button onClick={onApply} className="w-full">
              Apply Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
