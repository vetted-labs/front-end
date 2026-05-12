"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { AlertCircle, AlertTriangle, Award, Clock, Wallet, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useFormPersistence, useDraftAutosave } from "@/lib/hooks/useFormPersistence";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import { logger } from "@/lib/logger";
import type { EndorsementApplication } from "@/types";

export interface StakeStepProps {
  application: EndorsementApplication;
  userBalance: string;
  userStake: string;
  minimumBid: string;
  onPlaceEndorsement: (application: EndorsementApplication, bidAmount: string) => Promise<void>;
  /** When true the user can only review — no input, no submit. */
  readOnly?: boolean;
  /** Existing bid amount if the expert has already endorsed. */
  existingBid?: string;
}

export function StakeStep({
  application,
  userBalance,
  userStake,
  minimumBid,
  onPlaceEndorsement,
  readOnly = false,
  existingBid,
}: StakeStepProps) {
  const { address } = useAccount();
  const [bidAmount, setBidAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { isExpired: biddingExpired } = useCountdown(application.bidding_deadline, {
    fallbackStart: application.applied_at,
    expiredLabel: "Bidding closed",
  });

  const { save: saveDraft } = useFormPersistence<{ bidAmount: string }>({
    namespace: "endorsement-bid",
    identity: address,
    variant: application.application_id,
    version: 1,
    onRestore: (draft) => {
      if (typeof draft.bidAmount === "string") setBidAmount(draft.bidAmount);
    },
  });
  useDraftAutosave(saveDraft, { bidAmount });

  const handleQuickAmount = (multiplier: number, type: "min" | "balance") => {
    if (type === "min") {
      setBidAmount((parseFloat(minimumBid) * (1 + multiplier)).toFixed(2));
    } else {
      setBidAmount((parseFloat(userBalance) * multiplier).toFixed(2));
    }
  };

  const validateBid = (): boolean => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setErrorMessage("Please enter a valid bid amount");
      return false;
    }
    if (parseFloat(bidAmount) < parseFloat(minimumBid)) {
      setErrorMessage(`Minimum bid is ${minimumBid} VETD`);
      return false;
    }
    if (parseFloat(userBalance) < parseFloat(bidAmount)) {
      setErrorMessage(
        `Insufficient balance. You have ${parseFloat(userBalance).toFixed(2)} VETD`,
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBid()) return;
    try {
      setErrorMessage("");
      await onPlaceEndorsement(application, bidAmount);
    } catch (error: unknown) {
      logger.error("Failed to place endorsement", error, { silent: true });
      const { getTransactionErrorMessage } = await import("@/lib/blockchain");
      setErrorMessage(getTransactionErrorMessage(error, "Failed to place endorsement"));
    }
  };

  const alreadyEndorsed = !!existingBid;
  const inputDisabled = readOnly || alreadyEndorsed || biddingExpired;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-1.5">
          Step 4 · Stake
        </p>
        <h3 className="text-xl font-display font-bold text-foreground leading-tight">
          {readOnly
            ? "Your endorsement"
            : biddingExpired
              ? "Bidding has closed"
              : alreadyEndorsed
                ? "You've already endorsed"
                : "Place your endorsement"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {readOnly
            ? `You staked on this candidate. Bid mechanics are revealed when bidding ends.`
            : biddingExpired
              ? "New endorsements can no longer be placed on this application."
              : alreadyEndorsed
                ? "Bid increases aren't currently supported. Your stake is locked until the cycle closes."
                : "Stake VETD to back this candidate. Top-3 endorsers earn rewards when the candidate is hired."}
        </p>
      </div>

      {biddingExpired && !readOnly ? (
        <div
          className={`rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} p-5 flex items-start gap-3`}
        >
          <div
            className={`w-10 h-10 rounded-xl ${STATUS_COLORS.negative.bgSubtle} flex items-center justify-center shrink-0`}
          >
            <Clock className={`w-5 h-5 ${STATUS_COLORS.negative.icon}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${STATUS_COLORS.negative.text}`}>
              Bidding window ended
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The 24-hour bidding period for this application has elapsed.
            </p>
          </div>
        </div>
      ) : null}

      {(alreadyEndorsed || readOnly) && existingBid ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Your stake
              </p>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {parseFloat(existingBid).toFixed(2)}{" "}
                <span className="text-sm text-muted-foreground font-normal">VETD</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rankings are revealed when the bidding period ends.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!inputDisabled && (
        <>
          <div
            className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle} p-4 flex items-start gap-3`}
            {...dataTourTarget(TOUR_TARGETS.endorseSlashWarning)}
          >
            <AlertTriangle className={`w-4 h-4 ${STATUS_COLORS.warning.icon} mt-0.5 shrink-0`} />
            <div>
              <p className={`text-sm font-medium ${STATUS_COLORS.warning.text}`}>
                Stake at risk
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                If this candidate isn&apos;t hired, 10% of your bid is slashed. Non-selected
                endorsers receive a refund minus a 1.5% platform fee.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-medium tabular-nums">
                {parseFloat(userBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                VETD
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary/70">Staked:</span>
              <span className="font-medium text-primary tabular-nums">
                {parseFloat(userStake).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                VETD
              </span>
            </div>
          </div>

          <div
            className="rounded-xl bg-muted/20 border border-border p-4 space-y-2 transition-colors focus-within:border-primary/30"
            {...dataTourTarget(TOUR_TARGETS.endorseAmountInput)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Your bid</span>
              <button
                type="button"
                onClick={() => setBidAmount(parseFloat(userBalance).toFixed(2))}
                className="text-xs font-bold text-primary/70 hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all tracking-wider uppercase"
              >
                Max
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder={`Min: ${minimumBid}`}
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setErrorMessage("");
                }}
                min={minimumBid}
                step="0.1"
                className="flex-1 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/30 outline-none tabular-nums min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 border border-border shrink-0">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">V</span>
                </div>
                <span className="text-sm font-medium">VETD</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60">Min. {minimumBid} VETD</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Min +10%", action: () => handleQuickAmount(0.1, "min") },
              { label: "Min +50%", action: () => handleQuickAmount(0.5, "min") },
              { label: "25% Bal", action: () => handleQuickAmount(0.25, "balance") },
              { label: "50% Bal", action: () => handleQuickAmount(0.5, "balance") },
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={btn.action}
                className="h-10 text-xs font-medium rounded-lg border border-border bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 active:scale-95 transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {bidAmount && parseFloat(bidAmount) > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground flex-1">
                <span className="font-medium text-foreground/80">Blind bidding</span> — rankings
                are hidden during the bidding period and revealed when it ends.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              className={`rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} p-4 flex items-start gap-3`}
            >
              <AlertCircle
                className={`w-5 h-5 ${STATUS_COLORS.negative.icon} shrink-0 mt-0.5`}
              />
              <div>
                <p className={`text-sm font-medium ${STATUS_COLORS.negative.text}`}>Error</p>
                <p className={`text-xs ${STATUS_COLORS.negative.text} opacity-80 mt-0.5`}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!bidAmount || parseFloat(bidAmount) <= 0}
            className="w-full h-[3.25rem] flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-primary text-primary-foreground shadow-xl hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            {...dataTourTarget(TOUR_TARGETS.endorseSubmitButton)}
          >
            <Zap className="w-4 h-4" />
            Place endorsement
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

