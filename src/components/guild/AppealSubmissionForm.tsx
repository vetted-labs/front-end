"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Gavel, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { guildAppealApi } from "@/lib/api";
import { useAppealStaking } from "@/lib/hooks/useVettedContracts";

type StakingStep = "idle" | "approving" | "staking" | "filing";
type ModalView = "form" | "success";

interface AppealSubmissionFormProps {
  applicationId: string;
  /** Application type: "proposal" for candidate_proposals, "candidate" for candidate_guild_applications, "expert" for expert applications */
  applicationType?: "expert" | "candidate" | "proposal";
  applicationName: string;
  guildName: string;
  /** Guild UUID for on-chain staking */
  guildId?: string;
  /** Wallet address of the expert filing the appeal */
  wallet: string;
  minimumStake?: number;
  onSuccess?: () => void;
}

export function AppealSubmissionForm({
  applicationId,
  applicationType = "candidate",
  applicationName,
  guildName,
  guildId,
  wallet,
  minimumStake = 50,
  onSuccess,
}: AppealSubmissionFormProps) {
  const [justification, setJustification] = useState("");
  const [stakeAmount, setStakeAmount] = useState(minimumStake);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stakingStep, setStakingStep] = useState<StakingStep>("idle");
  const [modalView, setModalView] = useState<ModalView>("form");
  const [successTxHash, setSuccessTxHash] = useState<string | undefined>();

  const { approveTokens, stakeForAppeal, needsApproval } = useAppealStaking(guildId);

  const isSubmitting = stakingStep !== "idle";

  const buttonLabel = (() => {
    switch (stakingStep) {
      case "approving": return "Approving Token Transfer...";
      case "staking": return "Staking VETD On-Chain...";
      case "filing": return "Filing Appeal...";
      default: return `File Appeal (${stakeAmount} VETD)`;
    }
  })();

  const stepLabel = (() => {
    switch (stakingStep) {
      case "approving": return "Step 1 of 3: Approving tokens";
      case "staking": return "Step 2 of 3: Staking on-chain";
      case "filing": return "Step 3 of 3: Filing appeal";
      default: return "Approve \u2192 Stake \u2192 File";
    }
  })();

  const handleSubmit = async () => {
    if (justification.length < 100) {
      toast.error("Justification must be at least 100 characters");
      return;
    }
    if (stakeAmount < minimumStake) {
      toast.error(`Minimum stake is ${minimumStake} VETD`);
      return;
    }

    let txHash: string | undefined;

    try {
      if (guildId && needsApproval(stakeAmount.toString())) {
        setStakingStep("approving");
        await approveTokens(stakeAmount.toString());
      }

      if (guildId) {
        setStakingStep("staking");
        txHash = await stakeForAppeal(stakeAmount.toString());
      }

      setStakingStep("filing");
      await guildAppealApi.fileAppeal({
        applicationId,
        applicationType,
        wallet,
        appealReason: justification,
        stakeAmount,
        txHash,
      });

      // Show success view instead of closing
      setSuccessTxHash(txHash);
      setModalView("success");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to file appeal";
      if (stakingStep === "approving") {
        toast.error("Token approval was rejected or failed");
      } else if (stakingStep === "staking") {
        toast.error("On-chain staking failed. No appeal was filed.");
      } else {
        toast.error(message);
      }
    } finally {
      setStakingStep("idle");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset to form view after close animation
    setTimeout(() => {
      setModalView("form");
      setSuccessTxHash(undefined);
    }, 200);
  };

  return (
    <>
      {/* Trigger Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Gavel className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Believe this rejection was incorrect?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                File an appeal by staking VETD tokens and providing a written justification.
                A panel of senior guild members will review the appeal.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Gavel className="w-3.5 h-3.5 mr-1.5" />
                Appeal This Rejection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appeal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && handleCloseModal()}
        title={modalView === "success" ? "Appeal Filed" : "File Appeal"}
        size="lg"
      >
        {/* ── Success View ── */}
        {modalView === "success" && (
          <div className="text-center py-6 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Appeal Filed!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your appeal for <span className="font-medium text-foreground">{applicationName}</span> in <span className="font-medium text-foreground">{guildName}</span> has been submitted.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                {stakeAmount} VETD
              </span>
              <span className="text-sm text-green-600/70 dark:text-green-400/70">staked</span>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>A panel of senior guild members will review your justification.</p>
              <p>You&apos;ll be notified when a decision is reached.</p>
            </div>

            {successTxHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${successTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                View transaction on Etherscan
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <Button onClick={handleCloseModal} className="w-full max-w-xs mx-auto" size="lg">
              Done
            </Button>
          </div>
        )}

        {/* ── Form View ── */}
        {modalView === "form" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left column — context + justification */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Appeal Context
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Guild</dt>
                    <dd className="font-medium">{guildName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Candidate</dt>
                    <dd className="font-medium">{applicationName}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain specifically why you believe this rejection was incorrect. Reference the candidate's qualifications, work samples, or specific aspects of their application that the review panel may have misjudged..."
                  className="w-full h-44 px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {justification.length}/100 minimum characters
                </p>
              </div>
            </div>

            {/* Right column — stake + risk + action */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Stake &amp; Risk
                </h4>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Stake Amount (VETD)</label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    min={minimumStake}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                  <p className="text-xs text-muted-foreground">Minimum: {minimumStake} VETD</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-green-500 mb-0.5">If appeal succeeds</p>
                  <ul className="space-y-0.5 pl-3">
                    <li>&bull; Stake returned</li>
                    <li>&bull; Application re-reviewed</li>
                    <li>&bull; Reputation earned</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-500 mb-0.5">If appeal fails</p>
                  <ul className="space-y-0.5 pl-3">
                    <li>&bull; Stake forfeited</li>
                    <li>&bull; Reputation penalty</li>
                    <li>&bull; No further appeals</li>
                  </ul>
                </div>
              </div>

              {/* Step indicator — text-based */}
              {guildId && (
                <p className="text-xs text-muted-foreground font-medium">
                  {stakingStep !== "idle" && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                  {stepLabel}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || justification.length < 100 || stakeAmount < minimumStake}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {buttonLabel}
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4 mr-2" />
                    {buttonLabel}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
