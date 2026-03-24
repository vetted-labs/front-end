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
      const { applicationId, candidateId, jobId, currentStatus, newStatus, note } = params;

      // Client-side validation (backend also validates)
      if (!canTransition(currentStatus, newStatus)) {
        const msg = `Cannot transition from "${currentStatus}" to "${newStatus}"`;
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

            // Fire-and-forget hire outcome when status is "accepted"
            if (newStatus === "accepted") {
              endorsementAccountabilityApi
                .recordHireOutcome({ applicationId, candidateId, jobId, outcome: "hired" })
                .catch(() => {
                  toast.warning(
                    "Candidate accepted but hire outcome recording failed. Expert rewards may need manual processing."
                  );
                });
            }
          },
          onError: (msg) => {
            options?.onError?.(msg);
          },
        }
      );

      return result;
    },
    [execute]
  );

  return { updateStatus, isLoading, error };
}
