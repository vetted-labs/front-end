"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, XCircle, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { expertApi } from "@/lib/api";
import {
  generateBytes32Salt,
  computeOnChainCommitHash,
  mapScoreToChain,
  isUserRejection,
  getTransactionErrorMessage,
} from "@/lib/blockchain";
import { useVettingManager } from "@/lib/hooks/useVettedContracts";
import { ReviewProfileStep } from "@/components/guild/review/ReviewProfileStep";
import { GeneralReviewStep } from "@/components/guild/review/GeneralReviewStep";
import { DomainReviewStep } from "@/components/guild/review/DomainReviewStep";
import { StepIndicator } from "@/components/guild/review/StepIndicator";
import { ReviewSuccessStep } from "@/components/guild/review/ReviewSuccessStep";
import { ReviewSubmitSection } from "@/components/guild/review/ReviewSubmitSection";
import { ReviewNavigation } from "@/components/guild/review/ReviewNavigation";
import { CommitRevealExplainer } from "@/components/expert/CommitRevealExplainer";
import { TransactionStatus } from "@/components/ui/transaction-status";
import type { TransactionPhase } from "@/components/ui/transaction-status";
import { GENERAL_RESPONSE_KEY_MAP, FALLBACK_GENERAL_QUESTIONS } from "@/components/guild/review/constants";
import type {
  GeneralReviewTemplate,
  GeneralReviewQuestion,
  LevelReviewTemplate,
  ReviewDomainTopic,
  RubricQuestionEntry,
  RubricRedFlag,
  RubricInterpretationGuideItem,
  ReviewGuildApplicationModalProps,
} from "@/types";

// Re-export shared review primitives used by sub-step components
export { ScoreButtons, renderPromptLines } from "@/components/guild/review/shared";

export function ReviewGuildApplicationModal({
  isOpen,
  onClose,
  application,
  guildId,
  onSubmitReview,
  isReviewing,
  proposalContext,
  commitRevealPhase,
  blockchainSessionId,
  blockchainSessionCreated,
  onReviewSuccess,
  reviewType: reviewTypeProp,
}: ReviewGuildApplicationModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [generalScores, setGeneralScores] = useState<Record<string, Record<string, number>>>({});
  const [generalJustifications, setGeneralJustifications] = useState<Record<string, string>>({});
  const [topicScores, setTopicScores] = useState<Record<string, number>>({});
  const [topicJustifications, setTopicJustifications] = useState<Record<string, string>>({});
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>({});
  const [generalTemplate, setGeneralTemplate] = useState<GeneralReviewTemplate | null>(null);
  const [levelTemplate, setLevelTemplate] = useState<LevelReviewTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<{ message?: string } | null>(null);
  const [commitTxHash, setCommitTxHash] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [isCommitting, setIsCommitting] = useState(false);

  const isCommitPhase = commitRevealPhase === "commit";
  const { address } = useAccount();

  const sessionIdBytes32 = blockchainSessionId as `0x${string}` | undefined;
  const { commitVote } = useVettingManager(
    isCommitPhase && blockchainSessionCreated ? sessionIdBytes32 : undefined
  );

  // eslint-disable-next-line no-restricted-syntax -- body overflow side-effect tied to open state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // eslint-disable-next-line no-restricted-syntax -- reset all form state when a new application is opened
  useEffect(() => {
    if (!application) return;
    setCurrentStep(1);
    setFeedback("");
    setGeneralScores({});
    setGeneralJustifications({});
    setTopicScores({});
    setTopicJustifications({});
    setRedFlags({});
    setGeneralTemplate(null);
    setLevelTemplate(null);
    setTemplateError(null);
    setValidationError(null);
    setApiResponse(null);
    setStakeAmount(0);
  }, [application?.id, isOpen]);

  // eslint-disable-next-line no-restricted-syntax -- sync stake from parent prop
  useEffect(() => {
    if (proposalContext?.requiredStake != null) {
      setStakeAmount(proposalContext.requiredStake);
    }
  }, [proposalContext?.requiredStake]);

  const responses = application?.applicationResponses || {};
  const generalResponses = responses.general || {};
  const domainResponses = responses.domain || {};
  const level = responses.level || application?.expertiseLevel || "";
  const topicAnswers: Record<string, string> = domainResponses.topics || {};

  // eslint-disable-next-line no-restricted-syntax -- fetch templates when application/guild changes
  useEffect(() => {
    if (!application || !isOpen || !guildId) return;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setTemplateError(null);

      try {
        const generalData = await expertApi.getGuildApplicationTemplate(guildId, "general");
        setGeneralTemplate(generalData as GeneralReviewTemplate);

        if (level) {
          const levelData = await expertApi.getGuildApplicationTemplate(guildId, "level", level);
          setLevelTemplate(levelData as LevelReviewTemplate);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load review templates";
        setTemplateError(message);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [application?.id, guildId, isOpen, level]);

  const generalQuestions: GeneralReviewQuestion[] = generalTemplate?.questions?.length
    ? generalTemplate.questions
    : FALLBACK_GENERAL_QUESTIONS;
  const generalRubric = generalTemplate?.rubric;
  const generalRubricQuestions: Record<string, RubricQuestionEntry> = generalRubric?.questions || {};
  const generalRedFlags: RubricRedFlag[] = Array.isArray(generalRubric?.redFlags) ? generalRubric.redFlags : [];
  const interpretationGuide: RubricInterpretationGuideItem[] = Array.isArray(generalRubric?.interpretationGuide)
    ? generalRubric.interpretationGuide
    : [];

  const topicList: ReviewDomainTopic[] = levelTemplate?.topics?.length
    ? levelTemplate.topics
    : Object.keys(topicAnswers).map((topicId) => ({ id: topicId, title: topicId }));

  const getGeneralResponseValue = (questionId: string, partId?: string) => {
    const responseKey = GENERAL_RESPONSE_KEY_MAP[questionId];
    if (!responseKey) return "";
    const responseValue = generalResponses[responseKey];
    if (typeof responseValue === "string") return responseValue;
    if (partId && responseValue && typeof responseValue === "object") return responseValue[partId] || "";
    return "";
  };

  const generalTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const rubricEntries = Object.entries(generalRubricQuestions);

    if (rubricEntries.length === 0) {
      Object.keys(generalScores).forEach((questionId) => {
        const scores = Object.values(generalScores[questionId] || {});
        totals[questionId] = scores.reduce((acc, val) => acc + (val || 0), 0);
      });
      return totals;
    }

    rubricEntries.forEach(([questionId, questionRubric]) => {
      const criteria = questionRubric?.criteria || [];
      const sum = criteria.reduce(
        (acc: number, c) => acc + (generalScores[questionId]?.[c.id] || 0),
        0
      );
      totals[questionId] = sum;
    });
    return totals;
  }, [generalRubricQuestions, generalScores]);

  const generalTotal = Object.values(generalTotals).reduce((a, b) => a + b, 0);
  const generalMax =
    generalRubric?.totalPoints ||
    Object.values(generalRubricQuestions).reduce((sum: number, question) => {
      if (question?.maxPoints) return sum + question.maxPoints;
      const criteria = question?.criteria || [];
      return sum + criteria.reduce((acc: number, c) => acc + (c.maxPoints || c.max || 0), 0);
    }, 0);

  const topicTotal = topicList.reduce((acc: number, topic) => acc + (topicScores[topic.id] || 0), 0);
  const topicMax = levelTemplate?.totalPoints || topicList.length * 5;

  const redFlagDeductions = Object.keys(redFlags)
    .filter((key) => redFlags[key])
    .reduce((sum, key) => {
      const flag = generalRedFlags.find((f) => f.id === key);
      const points = typeof flag?.points === "number" ? Math.abs(flag.points) : 0;
      return sum + points;
    }, 0);

  const overallScore = Math.max(0, generalTotal + topicTotal - redFlagDeductions);

  if (!application || !isOpen) return null;

  const validateStep2 = () => {
    const scoredIds = generalQuestions
      .filter((q) => q.scored !== false && q.id !== "guild_improvement")
      .map((q) => q.id);
    const missing = scoredIds.filter(
      (id: string) => generalRubricQuestions[id] && !generalJustifications[id]?.trim()
    );
    if (missing.length > 0) {
      setValidationError("Please add a justification for every scored general question.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const validateStep3 = () => {
    const missing = topicList
      .map((t) => t.id)
      .filter((id: string) => !topicJustifications[id]?.trim());
    if (missing.length > 0) {
      setValidationError("Please add a justification for every scored domain topic.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
    contentRef.current?.scrollTo(0, 0);
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    contentRef.current?.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!generalTemplate || !levelTemplate) {
      setValidationError("Review templates are still loading. Please try again in a moment.");
      return;
    }
    if (!validateStep3()) return;
    if (proposalContext && stakeAmount < proposalContext.requiredStake) {
      setValidationError(`Minimum stake is ${proposalContext.requiredStake} VETD.`);
      return;
    }
    setValidationError(null);

    const domainScoresPayload = { topics: topicScores, total: topicTotal, max: topicMax };
    const domainJustificationsPayload = topicJustifications;
    const computedOverallMax = (generalMax || 0) + (topicMax || 0);

    const buildCriteriaScores = () => ({
      general: { ...generalScores, totals: generalTotals, total: generalTotal, max: generalMax },
      domain: domainScoresPayload,
      overallMax: computedOverallMax,
      overallScore,
      redFlagDeductions,
    });

    const buildCriteriaJustifications = () => ({
      general: generalJustifications,
      domain: domainJustificationsPayload,
    });

    if (isCommitPhase && application?.id) {
      setIsCommitting(true);
      try {
        const normalizedScore = computedOverallMax > 0
          ? Math.round((overallScore / computedOverallMax) * 100)
          : 0;
        const nonce = crypto.randomUUID();

        let onChainSalt: string | undefined;
        let onChainCommitHash: string | undefined;
        let onChainScore: number | undefined;
        let onChainTxHash: string | undefined;

        if (blockchainSessionId && blockchainSessionCreated && address) {
          onChainSalt = generateBytes32Salt();
          onChainScore = mapScoreToChain(normalizedScore);
          onChainCommitHash = computeOnChainCommitHash(
            sessionIdBytes32!,
            address as `0x${string}`,
            onChainScore,
            onChainSalt as `0x${string}`
          );

          try {
            onChainTxHash = await commitVote(onChainCommitHash as `0x${string}`);
            setCommitTxHash(onChainTxHash || null);
          } catch (err: unknown) {
            if (isUserRejection(err)) { setIsCommitting(false); return; }
            toast.error(getTransactionErrorMessage(err, "On-chain commit failed"));
            setIsCommitting(false);
            return;
          }
        }

        const hashResult = await expertApi.expertCommitReveal.generateHash(normalizedScore, nonce);
        await expertApi.expertCommitReveal.submitCommitment(application.id, {
          commitHash: hashResult.hash,
          normalizedScore,
          nonce,
          feedback: feedback || undefined,
          criteriaScores: buildCriteriaScores(),
          criteriaJustifications: buildCriteriaJustifications(),
          overallScore,
          redFlagDeductions,
          onChainCommitHash: onChainCommitHash || undefined,
          onChainSalt: onChainSalt || undefined,
          onChainScore: onChainScore ?? undefined,
          onChainTxHash: onChainTxHash || undefined,
        });

        setApiResponse({ message: "Vote submitted! Scores will be revealed automatically when all reviewers have voted." });
        setCurrentStep(4);
        contentRef.current?.scrollTo(0, 0);
        onReviewSuccess?.();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit commitment";
        toast.error(message);
      } finally {
        setIsCommitting(false);
      }
      return;
    }

    try {
      const response = await onSubmitReview({
        feedback: feedback || undefined,
        criteriaScores: buildCriteriaScores(),
        criteriaJustifications: buildCriteriaJustifications(),
        overallScore,
        redFlagDeductions,
        ...(proposalContext ? { stakeAmount } : {}),
      });
      setApiResponse(response || null);
      setCurrentStep(4);
      contentRef.current?.scrollTo(0, 0);
    } catch {
      // Error is handled by the parent via toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-sm dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06] dark:shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {proposalContext ? "Review Proposal" : reviewTypeProp === "candidate" ? "Review Candidate Application" : "Review Expert Application"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div ref={contentRef} className="relative flex-1 overflow-y-auto px-6 py-5">
            <StepIndicator currentStep={currentStep} />

            {templateError && <Alert variant="error">{templateError}</Alert>}
            {loadingTemplates && (
              <div className="flex items-center gap-3 p-3.5 mb-4 rounded-xl bg-amber-500/[0.06] border border-amber-400/15">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <p className="text-sm text-primary/80">Loading review template and rubric...</p>
              </div>
            )}

            {currentStep === 1 && (
              <ReviewProfileStep application={application} level={level} anonymized />
            )}
            {currentStep === 2 && (
              <GeneralReviewStep
                loadingTemplates={loadingTemplates}
                generalTemplate={generalTemplate}
                generalRubricQuestions={generalRubricQuestions}
                generalQuestions={generalQuestions}
                generalTotals={generalTotals}
                generalScores={generalScores}
                generalJustifications={generalJustifications}
                interpretationGuide={interpretationGuide}
                generalTotal={generalTotal}
                generalMax={generalMax}
                getGeneralResponseValue={getGeneralResponseValue}
                onGeneralScoresChange={setGeneralScores}
                onGeneralJustificationsChange={setGeneralJustifications}
              />
            )}
            {currentStep === 3 && (
              <>
                <DomainReviewStep
                  loadingTemplates={loadingTemplates}
                  levelTemplate={levelTemplate}
                  topicList={topicList}
                  topicAnswers={topicAnswers}
                  topicScores={topicScores}
                  topicJustifications={topicJustifications}
                  redFlags={redFlags}
                  generalRedFlags={generalRedFlags}
                  redFlagDeductions={redFlagDeductions}
                  generalTotal={generalTotal}
                  generalMax={generalMax}
                  topicTotal={topicTotal}
                  topicMax={topicMax}
                  overallScore={overallScore}
                  feedback={feedback}
                  onTopicScoresChange={setTopicScores}
                  onTopicJustificationsChange={setTopicJustifications}
                  onRedFlagsChange={setRedFlags}
                  onFeedbackChange={setFeedback}
                />
                {isCommitPhase && (
                  <div className="mt-4 space-y-3">
                    <CommitRevealExplainer />
                    <TransactionStatus
                      phase={
                        (isCommitting
                          ? commitTxHash ? "confirmed" : "awaiting-signature"
                          : commitTxHash ? "confirmed" : "idle") as TransactionPhase
                      }
                      txHash={commitTxHash ?? undefined}
                      chainExplorerUrl="https://sepolia.etherscan.io"
                    />
                  </div>
                )}
                <ReviewSubmitSection
                  proposalContext={proposalContext}
                  stakeAmount={stakeAmount}
                  onStakeAmountChange={setStakeAmount}
                />
              </>
            )}
            {currentStep === 4 && (
              <ReviewSuccessStep
                isCommitPhase={isCommitPhase}
                apiResponse={apiResponse}
                generalTotal={generalTotal}
                generalMax={generalMax}
                topicTotal={topicTotal}
                topicMax={topicMax}
                redFlagDeductions={redFlagDeductions}
                overallScore={overallScore}
                commitTxHash={commitTxHash}
              />
            )}

            {validationError && (
              <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{validationError}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <ReviewNavigation
            currentStep={currentStep}
            isReviewing={isReviewing}
            isCommitting={isCommitting}
            isCommitPhase={isCommitPhase}
            onClose={onClose}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
