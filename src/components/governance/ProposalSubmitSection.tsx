import { Button } from "@/components/ui/button";
import {
  Loader2,
  Wallet,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { ProposalSubmitStep } from "@/types";

function StepIndicator({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-2.5">
      {status === "done" ? (
        <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
      ) : status === "active" ? (
        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      )}
      <span
        className={`text-sm ${
          status === "done"
            ? "text-positive"
            : status === "active"
              ? "text-foreground font-medium"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface ProposalSubmitSectionProps {
  address: string | undefined;
  submitStep: ProposalSubmitStep;
  buttonLabel: string;
  hasGuild: boolean;
  onCancel: () => void;
}

export function ProposalSubmitSection({
  address,
  submitStep,
  buttonLabel,
  hasGuild,
  onCancel,
}: ProposalSubmitSectionProps) {
  const isSubmitting = submitStep !== "idle";

  return (
    <div className="p-6 sm:p-8 bg-primary/5 border-t border-border">
      {!address && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 mb-5">
          <Wallet className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Wallet not connected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your wallet to create a governance proposal.
            </p>
          </div>
        </div>
      )}

      {/* Transaction step indicator */}
      {isSubmitting && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Transaction Progress
          </p>
          <div className="space-y-2.5">
            {hasGuild && (
              <>
                <StepIndicator
                  label="Approve VETD token transfer"
                  status={
                    submitStep === "approving"
                      ? "active"
                      : submitStep === "staking" ||
                          submitStep === "confirming" ||
                          submitStep === "creating"
                        ? "done"
                        : "pending"
                  }
                />
                <StepIndicator
                  label="Stake VETD on-chain"
                  status={
                    submitStep === "staking"
                      ? "active"
                      : submitStep === "confirming" ||
                          submitStep === "creating"
                        ? "done"
                        : "pending"
                  }
                />
                <StepIndicator
                  label="Confirm on blockchain"
                  status={
                    submitStep === "confirming"
                      ? "active"
                      : submitStep === "creating"
                        ? "done"
                        : "pending"
                  }
                />
              </>
            )}
            <StepIndicator
              label="Create governance proposal"
              status={submitStep === "creating" ? "active" : "pending"}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="sm:flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !address}
          className="sm:flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {buttonLabel}
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
    </div>
  );
}
