"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { applicationsApi, endorsementAccountabilityApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { canTransition } from "@/lib/statusTransitions";
import type { ApplicationStatus, StatusTransition } from "@/types";

interface StatusUpdateParams {
  applicationId: string;
  candidateId: string;
  jobId: string;
  currentStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  note?: string;
  finalCompensation?: number;
}

export function useApplicationStatusUpdate() {
  const { execute, isLoading, error } = useApi();

  const updateStatus = useCallback(
    async (
      params: StatusUpdateParams,
      options?: {
        onSuccess?: (transition: StatusTransition) => void;
        onError?: (error: string) => void;
      }
    ) => {
      const {
        applicationId,
        candidateId,
        jobId,
        currentStatus,
        newStatus,
        note,
        finalCompensation,
      } = params;

      // Client-side validation (backend also validates)
      if (!canTransition(currentStatus, newStatus)) {
        const msg = `Cannot transition from "${currentStatus}" to "${newStatus}"`;
        toast.error(msg);
        options?.onError?.(msg);
        return null;
      }

      if (newStatus === "accepted" && (!finalCompensation || finalCompensation <= 0)) {
        const msg = "Final compensation is required to record a hired outcome.";
        toast.error(msg);
        options?.onError?.(msg);
        return null;
      }

      const result = await execute(
        () => applicationsApi.updateStatus(applicationId, newStatus, note),
        {
          onSuccess: (data) => {
            const result = data as { transition: import("@/types").StatusTransition };
            options?.onSuccess?.(result.transition);
          },
          onError: (msg) => {
            options?.onError?.(msg);
          },
        }
      );

      if (result && (newStatus === "accepted" || newStatus === "rejected")) {
        try {
          await endorsementAccountabilityApi.recordHireOutcome({
            applicationId,
            candidateId,
            jobId,
            ...(newStatus === "accepted"
              ? { outcome: "hired" as const, finalCompensation }
              : { outcome: "not_hired" as const }),
          });
          // Dispatch events for immediate UI refresh across the app
          window.dispatchEvent(new Event("vetted:notification-refresh"));
          window.dispatchEvent(new Event("vetted:reputation-refresh"));
          window.dispatchEvent(new Event("vetted:endorsement-refresh"));
        } catch {
          toast.warning(
            newStatus === "accepted"
              ? "Candidate accepted but hire outcome recording failed. Expert rewards may need manual processing."
              : "Candidate rejected but not-hired outcome recording failed. Endorsement slashing may need manual processing."
          );
        }
      }

      return result;
    },
    [execute]
  );

  return { updateStatus, isLoading, error };
}
