"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Clock,
  ArrowLeft,
  Mail,
  CheckCircle,
  Users,
  Plus,
  Shield,
  Swords,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { expertApi, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import type { ExpertProfile, PendingGuildInfo } from "@/types";

function getTimeRemaining(deadline?: string) {
  if (!deadline) return null;
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Voting ended", color: "text-red-400" };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) {
    const color = days > 3 ? "text-green-400" : "text-amber-400";
    return { label: hours > 0 ? `${days}d ${hours}h remaining` : `${days}d remaining`, color };
  }
  if (hours > 0) return { label: `${hours}h remaining`, color: "text-red-400" };
  const minutes = Math.floor(diff / (1000 * 60));
  return { label: `${minutes}m remaining`, color: "text-red-400" };
}

/**
 * Build the guild applications list from the profile data.
 * The API may return either `guildApplications` (array) or a single
 * `appliedToGuild` (legacy). We normalize both into one list.
 */
function buildGuildApplications(expert: ExpertProfile): PendingGuildInfo[] {
  if (expert.guildApplications && expert.guildApplications.length > 0) {
    return expert.guildApplications;
  }

  if (expert.appliedToGuild) {
    return [
      {
        id: expert.appliedToGuild.id,
        name: expert.appliedToGuild.name,
        description: expert.appliedToGuild.description,
        status: "pending" as const,
        reviewCount: expert.reviewCount,
        approvalCount: expert.approvalCount,
        rejectionCount: expert.rejectionCount,
      },
    ];
  }

  return [];
}

export default function ApplicationPendingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const fetchProfile = useCallback(async () => {
    if (!address) throw new Error("No wallet address");

    try {
      const result = await expertApi.getProfile(address);

      // If already approved, redirect to dashboard
      if (result.status === "approved") {
        localStorage.setItem("expertStatus", "approved");
        router.push("/expert/dashboard");
        return null;
      }

      return result;
    } catch (err) {
      // 404 means the expert hasn't applied yet
      if (err instanceof ApiError && err.status === 404) {
        router.push("/expert/apply");
        return null;
      }
      throw err;
    }
  }, [address, router]);

  const { data: expert, isLoading, error } = useFetch(fetchProfile, {
    skip: !isConnected || !address,
    onError: (errorMessage) => {
      toast.error(errorMessage);
    },
  });

  // Wait for wallet connection (skip redirect — expert layout handles auth guards)
  if (!isConnected || !address || isLoading) {
    return null;
  }

  if (error || !expert) {
    const isInsufficientMembers = error?.includes("minimum") || error?.includes("enough members") || error?.includes("5 members");
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        {isInsufficientMembers ? (
          <div className="max-w-md text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Not Enough Guild Members</h2>
            <p className="text-sm text-muted-foreground">
              This guild needs at least 5 members to process applications. Your application will be reviewed once more experts join.
            </p>
          </div>
        ) : (
          <Alert variant="error">{error || "Failed to load application status"}</Alert>
        )}
      </div>
    );
  }

  const guildApplications = buildGuildApplications(expert);
  const pendingApps = guildApplications.filter((g) => g.status === "pending");

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 md:p-12 mb-6">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/15 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
            Application Under Review
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Your guild application{pendingApps.length > 1 ? "s are" : " is"} being reviewed by guild members
          </p>

          {/* Guild Applications List */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Your Guild Applications</h2>

            {guildApplications.map((guild) => (
              <div
                key={guild.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Swords className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{guild.name}</p>
                    {guild.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{guild.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {guild.status === "pending" ? (
                    <>
                      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">{guild.reviewCount ?? expert.reviewCount ?? 0}</span>
                        <span>reviewed</span>
                      </div>
                      {(() => {
                        const time = getTimeRemaining(guild.votingDeadline);
                        return time ? (
                          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${time.color}`}>
                            <Timer className="w-3 h-3 flex-shrink-0" />
                            {time.label}
                          </span>
                        ) : null;
                      })()}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                      <CheckCircle className="w-3 h-3" />
                      {guild.role || "Member"}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {guildApplications.length === 0 && (
              <EmptyState icon={Swords} title="No guild applications found" />
            )}
          </div>

          {/* Review Stats - only show if there are pending apps */}
          {pendingApps.length > 0 && (
            <div className="mb-8">
              <div className="text-center p-4 rounded-lg border border-border bg-muted/30">
                <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{expert.reviewCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          )}

          {/* Auto-Approval Info */}
          <div className="rounded-lg p-5 mb-8 border border-border bg-muted/30">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-1">Auto-Approval System</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your application needs <strong className="text-foreground">5 reviews</strong> from guild members to be
                  evaluated. Once the consensus threshold is met, you&apos;ll get instant access to the expert
                  dashboard and join the guild as a &quot;Recruit&quot;.
                </p>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start text-left p-4 rounded-lg border border-border bg-muted/30">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-0.5">Application Received</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve successfully received your application and wallet information.
                </p>
              </div>
            </div>

            <div className="flex items-start text-left p-4 rounded-lg border border-primary/30 bg-primary/5">
              <Clock className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-0.5">Under Guild Review</p>
                <p className="text-sm text-muted-foreground">
                  Guild members are reviewing your credentials. You currently have{" "}
                  {expert.reviewCount ?? 0} review(s).
                </p>
                {(() => {
                  const deadlines = pendingApps
                    .map((app) => app.votingDeadline)
                    .filter((d): d is string => !!d);
                  if (deadlines.length === 0) return null;
                  const earliest = deadlines.sort()[0];
                  const time = getTimeRemaining(earliest);
                  if (!time) return null;
                  return (
                    <p className={`text-sm font-medium mt-1.5 flex items-center gap-1.5 ${time.color}`}>
                      <Timer className="w-3.5 h-3.5" />
                      Review period: {time.label}
                    </p>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-start text-left p-4 rounded-lg border border-border bg-muted/30 opacity-60">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-0.5">Approval &amp; Dashboard Access</p>
                <p className="text-sm text-muted-foreground">
                  Once you receive 3 approvals, you&apos;ll automatically be accepted as a &quot;Recruit&quot;
                  member and gain access to the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Browse Guilds CTA */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Explore More Guilds
          </h2>
          <p className="text-muted-foreground mb-4">
            Browse available guilds and apply to join more communities
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.push("/guilds")}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm"
            >
              <Swords className="w-4 h-4 mr-2" />
              Browse Guilds
            </button>
            <button
              onClick={() => router.push("/expert/apply?apply=new")}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Apply to Another Guild
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
