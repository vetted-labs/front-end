"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Star,
  TrendingUp,
  Award,
  Target,
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Briefcase,
  Users,
  Activity,
  Calendar,
  Zap,
  Trophy,
  User,
  BarChart3,
} from "lucide-react";
import { getRoleBadgeColor } from "@/lib/guildHelpers";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { guildsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch } from "@/lib/hooks/useFetch";
import { STATUS_COLORS, STAT_ICON } from "@/config/colors";
import type {
  GuildPersonalStats,
  GuildMyStatsAverages,
  GuildRecentActivity,
  GuildMyStatsData,
} from "@/types";

function getComparisonColor(myValue: number, avgValue: number) {
  if (myValue > avgValue) return STATUS_COLORS.positive.text;
  if (myValue < avgValue) return STATUS_COLORS.negative.text;
  return "text-muted-foreground";
}

function getActivityOutcomeIcon(outcome?: string) {
  switch (outcome) {
    case "positive":
      return <CheckCircle className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />;
    case "negative":
      return <ThumbsDown className={`w-4 h-4 ${STATUS_COLORS.negative.icon}`} />;
    default:
      return <Clock className={`w-4 h-4 ${STATUS_COLORS.info.icon}`} />;
  }
}

export default function GuildMyStatsPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const auth = useAuthContext();
  const candidateId = auth.userId;

  const { data, isLoading, error } = useFetch<GuildMyStatsData>(
    async () => {
      const membership = await guildsApi.checkMembership(candidateId!, guildId);
      // checkMembership returns basic data; map to GuildPersonalStats shape
      // Advanced stats (averages, activity) require backend endpoints not yet implemented
      const stats: GuildPersonalStats = {
        memberId: candidateId!,
        fullName: "",
        email: "",
        role: (membership.role as GuildPersonalStats["role"]) || "candidate",
        reputation: 0,
        guildReputation: 0,
        joinedAt: membership.joinedAt || "",
        reviewsGiven: 0,
        reviewsReceived: 0,
        approvalRate: 0,
        rejectionRate: 0,
        averageConfidenceLevel: 0,
        endorsementsGiven: 0,
        endorsementsReceived: 0,
        applicationsReviewed: 0,
        candidatesApproved: 0,
        candidatesRejected: 0,
        jobsAppliedTo: 0,
        interviewsReceived: 0,
        offersReceived: 0,
        responseTime: "N/A",
        activityScore: 0,
        contributionScore: 0,
      };
      // Try fetching averages and activity, but don't fail if endpoints are unavailable
      let guildAverages: GuildMyStatsAverages = { averageReputation: 0, averageReviews: 0, averageApprovalRate: 0, averageResponseTime: "N/A" };
      let recentActivity: GuildRecentActivity[] = [];
      try {
        const avg = await guildsApi.getAverages(guildId);
        guildAverages = avg as unknown as GuildMyStatsAverages;
      } catch {
        logger.warn("Failed to load guild stats");
      }
      try {
        const activity = await guildsApi.getMemberActivity(guildId, candidateId!);
        recentActivity = (activity as unknown as GuildRecentActivity[]) || [];
      } catch {
        logger.warn("Failed to load guild stats");
      }
      return { stats, guildAverages, recentActivity };
    },
    {
      skip: !guildId || !candidateId,
      onError: (msg) => toast.error(msg || "Failed to load your guild statistics"),
    }
  );

  // Redirect to login if not authenticated
  if (!candidateId) {
    router.push(`/auth/login?redirect=/guilds/${guildId}/my-stats`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <EmptyState
          icon={BarChart3}
          title="Stats unavailable"
          description="Guild statistics will be available once more activity data is collected."
          action={{ label: "Back to Guild", onClick: () => router.push(`/guilds/${guildId}`) }}
        />
      </div>
    );
  }

  const { stats, guildAverages, recentActivity } = data;
  const isExpert = ["recruit", "craftsman", "master"].includes(stats.role);

  return (
    <div className="min-h-full animate-page-enter">
      {/* Hero Section - Personal Overview */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  My Guild Statistics
                </h1>
                <p className="text-sm font-medium text-muted-foreground mb-4">
                  {stats.fullName}
                </p>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-block px-4 py-2 text-sm font-bold rounded-full ${getRoleBadgeColor(
                      stats.role
                    )}`}
                  >
                    {stats.role.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Star className={`w-5 h-5 ${STATUS_COLORS.warning.icon} fill-current`} />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.guildReputation || stats.reputation}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Guild Reputation
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Member since{" "}
                      {new Date(stats.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Stats Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Overview */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Performance Overview
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {isExpert ? (
                  <>
                    {/* Expert-specific metrics */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-5 h-5 ${STAT_ICON.text}`} />
                          <span className="text-sm text-muted-foreground">
                            Reviews Given
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.reviewsGiven || 0}
                        </span>
                      </div>
                      {guildAverages && (
                        <div className="text-xs text-muted-foreground">
                          Guild avg: {guildAverages.averageReviews}{" "}
                          <span
                            className={getComparisonColor(
                              stats.reviewsGiven || 0,
                              guildAverages.averageReviews
                            )}
                          >
                            {stats.reviewsGiven > guildAverages.averageReviews
                              ? "^ Above"
                              : "v Below"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
                          <span className="text-sm text-muted-foreground">
                            Approval Rate
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.approvalRate || 0}%
                        </span>
                      </div>
                      {guildAverages && (
                        <div className="text-xs text-muted-foreground">
                          Guild avg: {guildAverages.averageApprovalRate}%{" "}
                          <span
                            className={getComparisonColor(
                              stats.approvalRate || 0,
                              guildAverages.averageApprovalRate
                            )}
                          >
                            {stats.approvalRate >
                            guildAverages.averageApprovalRate
                              ? "^ Above"
                              : "v Below"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
                          <span className="text-sm text-muted-foreground">
                            Response Time
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.responseTime || "N/A"}
                        </span>
                      </div>
                      {guildAverages && (
                        <div className="text-xs text-muted-foreground">
                          Guild avg: {guildAverages.averageResponseTime}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Candidates Approved
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.candidatesApproved || 0}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.candidatesRejected || 0} rejected
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Candidate-specific metrics */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Jobs Applied
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.jobsAppliedTo || 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className={`w-5 h-5 ${STATUS_COLORS.info.icon}`} />
                          <span className="text-sm text-muted-foreground">
                            Interviews
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.interviewsReceived || 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
                          <span className="text-sm text-muted-foreground">
                            Offers Received
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.offersReceived || 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
                          <span className="text-sm text-muted-foreground">
                            Reviews Received
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {stats.reviewsReceived || 0}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Endorsements */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Award className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
                Endorsements
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-4 ${STATUS_COLORS.positive.bgSubtle} rounded-lg ${STATUS_COLORS.positive.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
                    <span className={`text-sm ${STATUS_COLORS.positive.text}`}>
                      Received
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${STATUS_COLORS.positive.text}`}>
                    {stats.endorsementsReceived || 0}
                  </p>
                  <p className={`text-xs ${STATUS_COLORS.positive.text} mt-1`}>
                    From guild members
                  </p>
                </div>
                <div className={`p-4 ${STATUS_COLORS.info.bgSubtle} rounded-lg ${STATUS_COLORS.info.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className={`w-5 h-5 ${STATUS_COLORS.info.icon}`} />
                    <span className={`text-sm ${STATUS_COLORS.info.text}`}>
                      Given
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${STATUS_COLORS.info.text}`}>
                    {stats.endorsementsGiven || 0}
                  </p>
                  <p className={`text-xs ${STATUS_COLORS.info.text} mt-1`}>
                    To other members
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-4 border border-border rounded-lg hover:border-primary/50 transition-all"
                    >
                      {getActivityOutcomeIcon(activity.outcome)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.details}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role Progress */}
            {stats.nextRole && (
              <div className="bg-primary/5 rounded-xl p-6 border-2 border-primary/20">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Role Progression
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Progress to {stats.nextRole}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {stats.progressToNextRole || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all"
                        style={{
                          width: `${stats.progressToNextRole || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  {stats.requirementsForNextRole &&
                    stats.requirementsForNextRole.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Requirements:
                        </p>
                        <ul className="space-y-2">
                          {stats.requirementsForNextRole.map((req, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Contribution Score */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
                Contribution Score
              </h3>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-3">
                  <span className="text-3xl font-bold text-primary">
                    {stats.contributionScore || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on reviews, endorsements, and activity
                </p>
              </div>
            </div>

            {/* Activity Score */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Activity Level
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current Activity
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {stats.activityScore || 0}/100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (stats.activityScore || 0) > 70
                        ? STATUS_COLORS.positive.bg
                        : (stats.activityScore || 0) > 40
                        ? STATUS_COLORS.warning.bg
                        : STATUS_COLORS.negative.bg
                    }`}
                    style={{ width: `${stats.activityScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats.activityScore || 0) > 70
                    ? "Highly active member"
                    : (stats.activityScore || 0) > 40
                    ? "Moderately active"
                    : "Consider increasing activity"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/guilds/${guildId}`)}
                  className="w-full px-4 py-2 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded-lg hover:bg-primary/20 transition-all font-medium"
                >
                  View Guild Dashboard
                </button>
                <button
                  onClick={() => router.push("/browse/jobs")}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all font-medium"
                >
                  Browse Jobs
                </button>
                <button
                  onClick={() => router.push("/candidate/profile")}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all font-medium"
                >
                  My Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
