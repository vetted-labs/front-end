"use client";

import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShieldAlert, FileX2 } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { candidateApi, guildAppealApi } from "@/lib/api";
import { AppealSubmissionForm } from "@/components/guild/AppealSubmissionForm";
import { AppealStatusBanner } from "@/components/guild/AppealStatusBanner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { GuildApplicationSummary, GuildApplicationAppeal } from "@/types";

export default function GuildAppealPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const { auth, ready } = useRequireAuth("candidate");

  // Fetch candidate's guild applications to find the rejected one for this guild
  const {
    data: applications,
    isLoading: appsLoading,
    error: appsError,
  } = useFetch<GuildApplicationSummary[]>(
    () => candidateApi.getGuildApplications(),
    { skip: !ready }
  );

  // Find the rejected application for this guild
  const rejectedApp = applications?.find(
    (app) =>
      (app.guildId === guildId || app.guild?.id === guildId) &&
      app.status === "rejected"
  ) ?? null;

  // Fetch existing appeal for this application (if any)
  const {
    data: existingAppeal,
    isLoading: appealLoading,
    error: appealError,
    refetch: refetchAppeal,
  } = useFetch<GuildApplicationAppeal | null>(
    () => guildAppealApi.getAppealByApplication(rejectedApp!.id),
    { skip: !rejectedApp }
  );

  // Check appeal eligibility
  const {
    data: eligibility,
    isLoading: eligibilityLoading,
  } = useFetch<{ eligible: boolean; reason?: string; minimumStake: number }>(
    () => guildAppealApi.checkAppealEligibility(rejectedApp!.id, auth.userId!),
    { skip: !rejectedApp || !auth.userId || !!existingAppeal }
  );

  // Loading state
  if (!ready || appsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // API error
  if (appsError || appealError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Alert variant="error">
          {appsError || appealError || "Failed to load appeal data."}
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/candidate/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // No rejected application found for this guild
  if (!rejectedApp) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <EmptyState
          icon={FileX2}
          title="No rejected application found"
          description="You don't have a rejected guild application for this guild, or your application may still be under review."
          action={{
            label: "Back to Dashboard",
            onClick: () => router.push("/candidate/dashboard"),
          }}
        />
      </div>
    );
  }

  const guildName = rejectedApp.guildName || rejectedApp.guild?.name || "Guild";
  const candidateName = rejectedApp.candidateName || rejectedApp.fullName || "Candidate";
  const isLoadingAppeal = appealLoading || eligibilityLoading;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold">Appeal Rejection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Appeal your rejected application to <span className="font-medium text-foreground">{guildName}</span>
        </p>
      </div>

      {/* Rejection context card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-sm font-medium">Application Rejected</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your application to join {guildName} was reviewed and rejected.
              {rejectedApp.reviewCount !== undefined && rejectedApp.reviewCount > 0 && (
                <> Reviewed by {rejectedApp.reviewCount} expert{rejectedApp.reviewCount !== 1 ? "s" : ""}.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Appeal content */}
      {isLoadingAppeal ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : existingAppeal ? (
        /* Appeal already filed — show status */
        <AppealStatusBanner appeal={existingAppeal} />
      ) : eligibility && !eligibility.eligible ? (
        /* Not eligible to appeal */
        <Alert variant="warning">
          {eligibility.reason || "You are not eligible to file an appeal for this application."}
        </Alert>
      ) : (
        /* No appeal yet — show the submission form */
        <AppealSubmissionForm
          applicationId={rejectedApp.id}
          applicationType="candidate"
          applicationName={candidateName}
          guildName={guildName}
          guildId={guildId}
          wallet={auth.walletAddress || ""}
          minimumStake={eligibility?.minimumStake}
          onSuccess={refetchAppeal}
        />
      )}
    </div>
  );
}
