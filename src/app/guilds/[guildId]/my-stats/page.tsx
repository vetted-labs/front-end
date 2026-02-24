"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
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
} from "lucide-react";
import { LoadingState, Alert } from "@/components/ui";
import { guildsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";

interface PersonalStats {
  memberId: string;
  fullName: string;
  email: string;
  role: "recruit" | "craftsman" | "master" | "candidate";
  reputation: number;
  guildReputation: number; // Reputation within this specific guild
  joinedAt: string;

  // Review Stats
  reviewsGiven: number;
  reviewsReceived: number;
  approvalRate: number; // % of their approvals that led to successful hires
  rejectionRate: number;
  averageConfidenceLevel: number; // 1-5 scale

  // Endorsement Stats
  endorsementsGiven: number;
  endorsementsReceived: number;

  // Application Stats (for experts)
  applicationsReviewed: number;
  candidatesApproved: number;
  candidatesRejected: number;

  // Job Application Stats (for candidates)
  jobsAppliedTo: number;
  interviewsReceived: number;
  offersReceived: number;

  // Performance Metrics
  responseTime: string; // Average time to review
  activityScore: number; // How active in the guild
  contributionScore: number;

  // Progression
  nextRole?: string;
  progressToNextRole?: number; // 0-100%
  requirementsForNextRole?: string[];
}

interface GuildAverages {
  averageReputation: number;
  averageReviews: number;
  averageApprovalRate: number;
  averageResponseTime: string;
}

interface RecentActivity {
  id: string;
  type: "review_submitted" | "endorsement_given" | "application_submitted" | "job_applied" | "role_upgraded";
  title: string;
  details: string;
  timestamp: string;
  outcome?: "positive" | "neutral" | "negative";
}

export default function MyGuildStatsPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [guildAverages, setGuildAverages] = useState<GuildAverages | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuthContext();

  useEffect(() => {
    fetchMyStats();
  }, [guildId]);

  const fetchMyStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const candidateId = auth.userId;
      if (!candidateId) {
        router.push(`/auth/login?redirect=/guilds/${guildId}/my-stats`);
        return;
      }

      // Fetch personal stats
      const [statsData, averagesData, activityData]: any[] = await Promise.all([
        guildsApi.checkMembership(candidateId, guildId),
        guildsApi.getAverages(guildId),
        guildsApi.getMemberActivity(guildId, candidateId),
      ]);

      setStats(statsData);
      setGuildAverages(averagesData);
      setRecentActivity(activityData.activities || []);
    } catch (err) {
      console.error("[My Stats] Error:", err);
      setError((err as Error).message || "Failed to load your guild statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "master":
        return "bg-gradient-to-r from-amber-400 to-orange-500 text-white";
      case "craftsman":
        return "bg-gradient-to-r from-primary to-accent text-gray-900 dark:text-gray-900";
      case "recruit":
        return "bg-gradient-to-r from-blue-400 to-cyan-500 text-white";
      case "candidate":
        return "bg-gradient-to-r from-green-400 to-emerald-500 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getComparisonColor = (myValue: number, avgValue: number) => {
    if (myValue > avgValue) return "text-green-600";
    if (myValue < avgValue) return "text-red-600";
    return "text-muted-foreground";
  };

  const getActivityOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case "positive":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "negative":
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your guild statistics..." />;
  }

  if (error || !stats) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Alert variant="error">{error || "Could not load statistics"}</Alert>
      </div>
    );
  }

  const isExpert = ["recruit", "craftsman", "master"].includes(stats.role);

  return (
    <div className="min-h-full">
      {/* Hero Section - Personal Overview */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">My Guild Statistics</h1>
                <p className="text-lg text-muted-foreground mb-4">{stats.fullName}</p>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-block px-4 py-2 text-sm font-bold rounded-full ${getRoleBadgeColor(
                      stats.role
                    )}`}
                  >
                    {stats.role.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-current" />
                    <span className="text-2xl font-bold text-foreground">{stats.guildReputation || stats.reputation}</span>
                    <span className="text-sm text-muted-foreground">Guild Reputation</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Member since {new Date(stats.joinedAt).toLocaleDateString()}
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
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-muted-foreground">Reviews Given</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.reviewsGiven || 0}</span>
                      </div>
                      {guildAverages && (
                        <div className="text-xs text-muted-foreground">
                          Guild avg: {guildAverages.averageReviews}{" "}
                          <span className={getComparisonColor(stats.reviewsGiven || 0, guildAverages.averageReviews)}>
                            {stats.reviewsGiven > guildAverages.averageReviews ? "↑ Above" : "↓ Below"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-muted-foreground">Approval Rate</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.approvalRate || 0}%</span>
                      </div>
                      {guildAverages && (
                        <div className="text-xs text-muted-foreground">
                          Guild avg: {guildAverages.averageApprovalRate}%{" "}
                          <span className={getComparisonColor(stats.approvalRate || 0, guildAverages.averageApprovalRate)}>
                            {stats.approvalRate > guildAverages.averageApprovalRate ? "↑ Above" : "↓ Below"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-500" />
                          <span className="text-sm text-muted-foreground">Response Time</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.responseTime || "N/A"}</span>
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
                          <span className="text-sm text-muted-foreground">Candidates Approved</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.candidatesApproved || 0}</span>
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
                          <span className="text-sm text-muted-foreground">Jobs Applied</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.jobsAppliedTo || 0}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-muted-foreground">Interviews</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.interviewsReceived || 0}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-muted-foreground">Offers Received</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.offersReceived || 0}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-amber-500" />
                          <span className="text-sm text-muted-foreground">Reviews Received</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{stats.reviewsReceived || 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Endorsements */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Endorsements
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300">Received</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {stats.endorsementsReceived || 0}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    From guild members
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">Given</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {stats.endorsementsGiven || 0}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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
                        <p className="font-medium text-foreground">{activity.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role Progress */}
            {stats.nextRole && (
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border-2 border-primary/20">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Role Progression
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progress to {stats.nextRole}</span>
                      <span className="text-sm font-bold text-primary">{stats.progressToNextRole || 0}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all"
                        style={{ width: `${stats.progressToNextRole || 0}%` }}
                      />
                    </div>
                  </div>
                  {stats.requirementsForNextRole && stats.requirementsForNextRole.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-foreground mb-2">Requirements:</p>
                      <ul className="space-y-2">
                        {stats.requirementsForNextRole.map((req, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
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
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Contribution Score
              </h3>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-3">
                  <span className="text-3xl font-bold text-primary">{stats.contributionScore || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on reviews, endorsements, and activity
                </p>
              </div>
            </div>

            {/* Activity Score */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Activity Level
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Activity</span>
                  <span className="text-lg font-bold text-foreground">{stats.activityScore || 0}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (stats.activityScore || 0) > 70
                        ? "bg-green-500"
                        : (stats.activityScore || 0) > 40
                        ? "bg-amber-500"
                        : "bg-red-500"
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
              <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
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
