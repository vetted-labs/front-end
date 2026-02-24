"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Clock,
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  Users,
  Plus,
  Shield,
  Swords,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loadingstate";
import { Alert } from "@/components/ui/alert";
import { expertApi } from "@/lib/api";

interface GuildApplication {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "approved";
  role?: string;
  joinedAt?: string;
  reviewCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
}

interface PendingExpert {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  status: string;
  appliedToGuild: {
    id: string;
    name: string;
    description: string;
  } | null;
  guildApplications?: GuildApplication[];
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
}

export default function ApplicationPendingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [expert, setExpert] = useState<PendingExpert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isConnected && address) {
      fetchPendingStatus();
    } else {
      router.push("/");
    }
  }, [mounted, isConnected, address]);

  const fetchPendingStatus = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getProfile(address);

      if (result.status === "approved") {
        router.push("/expert/dashboard");
        return;
      }

      setExpert(result);
    } catch (err: any) {
      if (err.status === 404) {
        router.push("/expert/apply");
        return;
      }
      setError(err.message || "Failed to fetch application status");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading application status..." />;
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load application status"}</Alert>
      </div>
    );
  }

  // Build guild list: use guildApplications from API if available, otherwise fall back to single appliedToGuild
  const guildApplications: GuildApplication[] =
    expert.guildApplications && expert.guildApplications.length > 0
      ? expert.guildApplications
      : expert.appliedToGuild
        ? [
            {
              id: expert.appliedToGuild.id,
              name: expert.appliedToGuild.name,
              description: expert.appliedToGuild.description,
              status: "pending" as const,
              reviewCount: expert.reviewCount,
              approvalCount: expert.approvalCount,
              rejectionCount: expert.rejectionCount,
            },
          ]
        : [];

  const pendingApps = guildApplications.filter((g) => g.status === "pending");
  const approvedApps = guildApplications.filter((g) => g.status === "approved");

  return (
    <div className="min-h-full">
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
                      <div className="hidden sm:flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {guild.approvalCount ?? expert.approvalCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          {guild.rejectionCount ?? expert.rejectionCount}
                        </span>
                      </div>
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
              <p className="text-muted-foreground text-sm">No guild applications found.</p>
            )}
          </div>

          {/* Review Stats - only show if there are pending apps */}
          {pendingApps.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-lg border border-border bg-muted/30">
                <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{expert.reviewCount}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>

              <div className="text-center p-4 rounded-lg border border-border bg-muted/30">
                <CheckCircle className="w-7 h-7 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{expert.approvalCount}</p>
                <p className="text-sm text-muted-foreground">Approvals</p>
              </div>

              <div className="text-center p-4 rounded-lg border border-border bg-muted/30">
                <XCircle className="w-7 h-7 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{expert.rejectionCount}</p>
                <p className="text-sm text-muted-foreground">Rejections</p>
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
                  Your application needs <strong className="text-foreground">1+ approval</strong> from a guild member to be
                  automatically accepted. Once approved, you&apos;ll get instant access to the expert
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
                  {expert.approvalCount} approval(s).
                </p>
              </div>
            </div>

            <div className="flex items-start text-left p-4 rounded-lg border border-border bg-muted/30 opacity-60">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-0.5">Approval &amp; Dashboard Access</p>
                <p className="text-sm text-muted-foreground">
                  Once you receive 1+ approval, you&apos;ll automatically be accepted as a &quot;Recruit&quot;
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
              onClick={() => router.push("/expert/apply")}
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
