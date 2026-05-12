"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { SPRINGS, DURATIONS } from "@/lib/motion";
import { STATUS_COLORS } from "@/config/colors";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import { VerticalStepRail } from "@/components/guild/review/VerticalStepRail";
import { StepIndicator } from "@/components/guild/review/StepIndicator";
import type { EndorsementApplication } from "@/types";
import type { TransactionStep, EndorsableApplication } from "@/lib/hooks/useEndorsementTransaction";

import {
  ENDORSE_STEPS,
  ENDORSE_VIEW_STEPS,
  ENDORSE_STEP_JOB,
  ENDORSE_STEP_CANDIDATE,
  ENDORSE_STEP_APPLICATION,
  ENDORSE_STEP_STAKE,
  type EndorseStep,
  type EndorseModalMode,
} from "./constants";
import { EndorsementSnapshotCard } from "./EndorsementSnapshotCard";
import { JobContextStep } from "./JobContextStep";
import { CandidateProfileStep } from "./CandidateProfileStep";
import { ApplicationAnswersStep } from "./ApplicationAnswersStep";
import { StakeStep } from "./StakeStep";
import { EndorseProcessingView } from "./EndorseProcessingView";
import { EndorseSuccessStep } from "./EndorseSuccessStep";
import { EndorseNavigation } from "./EndorseNavigation";

export interface EndorseCandidateModalProps {
  application: EndorsementApplication | null;
  isOpen: boolean;
  onClose: () => void;
  /** "endorse" shows the stake step; "view" hides it (for already-endorsed). */
  mode: EndorseModalMode;
  /** Required for endorse mode; optional for view mode. */
  userBalance?: string;
  userStake?: string;
  minimumBid?: string;
  onPlaceEndorsement?: (app: EndorsableApplication, bidAmount: string) => Promise<void>;
  /** Current transaction lifecycle state. */
  txStep?: TransactionStep;
  txError?: string | null;
  approvalTxHash?: `0x${string}`;
  bidTxHash?: `0x${string}`;
  /** Pre-existing bid amount when viewing an already-placed endorsement. */
  existingBid?: string;
  /** Initial step to open on. Defaults to step 1. */
  initialStep?: EndorseStep;
}

export function EndorseCandidateModal({
  application,
  isOpen,
  onClose,
  mode,
  userBalance = "0",
  userStake = "0",
  minimumBid = "0",
  onPlaceEndorsement,
  txStep = "idle",
  txError,
  approvalTxHash,
  bidTxHash,
  existingBid,
  initialStep = ENDORSE_STEP_JOB,
}: EndorseCandidateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<EndorseStep>(initialStep);
  const [submittedBidAmount, setSubmittedBidAmount] = useState<string>("");

  useMountEffect(() => setMounted(true));

  // Resync currentStep to initialStep on each open transition. The parent
  // marketplace switches initialStep based on the entry point (quick-endorse
  // jumps to 4; details click starts at 1; story-lab forces 4) so we need
  // to honor that on every fresh open.
  // eslint-disable-next-line no-restricted-syntax -- runtime sync to parent-driven open transition
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset wizard to parent-specified entry step on open
      setCurrentStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Lock body scroll while open. Same pattern as the shared Modal primitive.
  // eslint-disable-next-line no-restricted-syntax -- DOM side-effect tied to isOpen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Close on Escape — modal-level keyboard handling. We attach to document
  // rather than the modal div because the modal isn't auto-focused on open
  // and Escape would otherwise be swallowed by the page.
  // eslint-disable-next-line no-restricted-syntax -- document-level keyboard subscription
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close mid-transaction — same guard as the close button.
        if (txStep === "signing" || txStep === "approving" || txStep === "bidding") return;
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, txStep, onClose]);

  const isTransacting =
    txStep === "signing" || txStep === "approving" || txStep === "bidding";
  const isSuccess = txStep === "success";
  const navLocked = isTransacting;

  const handlePlaceEndorsement = useCallback(
    async (app: EndorsementApplication, bidAmount: string) => {
      if (!onPlaceEndorsement) return;
      setSubmittedBidAmount(bidAmount);
      await onPlaceEndorsement(app, bidAmount);
    },
    [onPlaceEndorsement],
  );

  const handleClose = useCallback(() => {
    if (navLocked) return;
    onClose();
  }, [navLocked, onClose]);

  const handleNext = useCallback(() => {
    const maxStep = mode === "view" ? ENDORSE_STEP_APPLICATION : ENDORSE_STEP_STAKE;
    setCurrentStep((s) => (s < maxStep ? ((s + 1) as EndorseStep) : s));
  }, [mode]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => (s > ENDORSE_STEP_JOB ? ((s - 1) as EndorseStep) : s));
  }, []);

  const handleStepClick = useCallback(
    (target: number) => {
      if (navLocked) return;
      const maxStep = mode === "view" ? ENDORSE_STEP_APPLICATION : ENDORSE_STEP_STAKE;
      if (target >= ENDORSE_STEP_JOB && target <= maxStep) {
        setCurrentStep(target as EndorseStep);
      }
    },
    [mode, navLocked],
  );

  if (!mounted || !application) return null;

  const steps = mode === "view" ? ENDORSE_VIEW_STEPS : ENDORSE_STEPS;
  const renderStep = currentStep;
  const showFullTakeover = isSuccess || isTransacting;

  const headerSubtitle =
    mode === "view"
      ? "Review your existing endorsement"
      : isSuccess
        ? "Endorsement confirmed"
        : isTransacting
          ? "Transaction in progress…"
          : "Step-through review before staking VETD";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={handleClose}>
          <motion.div
            className="fixed inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATIONS.fast }}
          />

          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 lg:p-8">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Endorse candidate"
              className="relative w-full max-w-6xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] lg:max-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={SPRINGS.heavy}
              onClick={(e) => e.stopPropagation()}
              {...dataTourTarget(TOUR_TARGETS.endorseModal)}
            >
              {/* Decorative gradient */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />

              {/* Header */}
              <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                    {mode === "view" ? "Your endorsement" : "Endorse candidate"}
                  </p>
                  <h2 className="text-lg font-display font-bold text-foreground leading-tight">
                    {application.candidate_name}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {application.job_title}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{headerSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={navLocked}
                  aria-label="Close endorse modal"
                  className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="relative flex-1 overflow-hidden min-h-0">
                {showFullTakeover ? (
                  // Success / processing — full-width takeover
                  <div className="h-full overflow-y-auto px-6 py-6">
                    {isSuccess ? (
                      <EndorseSuccessStep
                        candidateName={application.candidate_name}
                        jobTitle={application.job_title}
                        bidAmount={submittedBidAmount || existingBid || ""}
                        approvalTxHash={approvalTxHash}
                        bidTxHash={bidTxHash}
                      />
                    ) : (
                      <EndorseProcessingView
                        txStep={txStep as "signing" | "approving" | "bidding"}
                        bidAmount={submittedBidAmount}
                        approvalTxHash={approvalTxHash}
                        bidTxHash={bidTxHash}
                      />
                    )}
                  </div>
                ) : (
                  // Standard 3-column step layout (3-col only at xl+)
                  <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_320px] h-full">
                    {/* LEFT — rail */}
                    <aside className="hidden xl:block border-r border-border bg-muted/[0.02] overflow-hidden min-h-0">
                      <VerticalStepRail
                        currentStep={renderStep}
                        steps={steps}
                        sectionLabel={mode === "view" ? "View" : "Endorse"}
                        showCommitReveal={false}
                        onStepClick={handleStepClick}
                      />
                    </aside>

                    {/* CENTER */}
                    <section className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 xl:border-r xl:border-border min-h-0">
                      <div className="xl:hidden mb-4">
                        <StepIndicator
                          currentStep={renderStep}
                          steps={steps}
                          onStepClick={handleStepClick}
                        />
                      </div>

                      {/* Error banner — surfaces tx errors while on stake step */}
                      {txStep === "error" && txError && currentStep === ENDORSE_STEP_STAKE && (
                        <div
                          className={`mb-4 rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} p-4 flex items-start gap-3`}
                        >
                          <AlertCircle
                            className={`w-5 h-5 ${STATUS_COLORS.negative.icon} shrink-0 mt-0.5`}
                          />
                          <div>
                            <p className={`text-sm font-medium ${STATUS_COLORS.negative.text}`}>
                              Transaction failed
                            </p>
                            <p
                              className={`text-xs ${STATUS_COLORS.negative.text} opacity-80 mt-0.5`}
                            >
                              {txError}
                            </p>
                          </div>
                        </div>
                      )}

                      {currentStep === ENDORSE_STEP_JOB && (
                        <JobContextStep application={application} />
                      )}
                      {currentStep === ENDORSE_STEP_CANDIDATE && (
                        <CandidateProfileStep application={application} />
                      )}
                      {currentStep === ENDORSE_STEP_APPLICATION && (
                        <ApplicationAnswersStep application={application} />
                      )}
                      {currentStep === ENDORSE_STEP_STAKE && mode === "endorse" && (
                        <StakeStep
                          application={application}
                          userBalance={userBalance}
                          userStake={userStake}
                          minimumBid={minimumBid}
                          onPlaceEndorsement={handlePlaceEndorsement}
                          existingBid={application.current_bid ?? existingBid}
                        />
                      )}
                      {currentStep === ENDORSE_STEP_STAKE && mode === "view" && (
                        <StakeStep
                          application={application}
                          userBalance={userBalance}
                          userStake={userStake}
                          minimumBid={minimumBid}
                          onPlaceEndorsement={handlePlaceEndorsement}
                          readOnly
                          existingBid={existingBid ?? application.current_bid}
                        />
                      )}
                    </section>

                    {/* RIGHT — snapshot */}
                    <aside className="hidden xl:block overflow-y-auto px-5 py-5 bg-muted/[0.02]">
                      <EndorsementSnapshotCard application={application} />
                    </aside>
                  </div>
                )}
              </div>

              {/* Footer */}
              {isSuccess ? (
                <div className="flex gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-card shrink-0">
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : isTransacting ? (
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-card shrink-0">
                  <p className="text-xs text-center text-muted-foreground">
                    Please complete the transaction in your wallet. Closing this window won&apos;t
                    cancel the request.
                  </p>
                </div>
              ) : (
                <EndorseNavigation
                  currentStep={currentStep}
                  mode={mode}
                  locked={navLocked}
                  onBack={handleBack}
                  onNext={handleNext}
                  onClose={handleClose}
                />
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
