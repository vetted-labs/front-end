"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, XCircle, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { STATUS_COLORS } from "@/config/colors";
import { toast } from "sonner";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { expertApi, reviewsApi, extractApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useVettingManager } from "@/lib/hooks/useVettedContracts";
import { useReviewState } from "@/lib/hooks/useReviewState";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import {
  OnChainStatusBanner,
  type OnChainStatus,
} from "@/components/reviews/OnChainStatusBanner";
import { ReviewProfileStep } from "@/components/guild/review/ReviewProfileStep";
import { GeneralReviewStep } from "@/components/guild/review/GeneralReviewStep";
import { DomainReviewStep } from "@/components/guild/review/DomainReviewStep";
import { StepIndicator } from "@/components/guild/review/StepIndicator";
import { ReviewSuccessStep } from "@/components/guild/review/ReviewSuccessStep";
import { ReviewSubmitSection } from "@/components/guild/review/ReviewSubmitSection";
import { ReviewNavigation } from "@/components/guild/review/ReviewNavigation";
import { CommitRevealExplainer } from "@/components/expert/CommitRevealExplainer";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import { GENERAL_RESPONSE_KEY_MAP, FALLBACK_GENERAL_QUESTIONS } from "@/components/guild/review/constants";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import {
  getStoryLabReviewModalStep,
  STORY_LAB_GENERAL_TEMPLATE,
  STORY_LAB_LEVEL_TEMPLATE,
} from "@/components/expert/story-lab/storyLabFixtures";
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

const STORY_LAB_FALLBACK_COMMIT_TX_HASH = "story-lab-demo-transaction";
const DRAFT_DEBOUNCE_MS = 1500;

function scrollContentToTop(content: HTMLDivElement | null): void {
  if (typeof content?.scrollTo === "function") {
    content.scrollTo(0, 0);
  }
}

/**
 * Shape persisted to the server-side review_drafts table for guild
 * applications. All scoring/justification state is mirrored here so a
 * mid-signing crash can be recovered on remount.
 */
type GuildReviewDraftBody = {
  feedback: string;
  generalScores: Record<string, Record<string, number>>;
  generalJustifications: Record<string, string>;
  topicScores: Record<string, number>;
  topicJustifications: Record<string, string>;
  redFlags: Record<string, boolean>;
  stakeAmount: number;
};

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
  expertWallet,
  mode = "live",
  templateOverrides,
  onPracticeComplete,
  practiceActions,
  forceCompletion = false,
  completionActionLabel,
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
  const [submitState, setSubmitState] = useState<OnChainStatus>({ kind: "ready" });
  const [draftHydrated, setDraftHydrated] = useState(false);

  const { isActive: isStoryLabPreview, activeSubStopId } = useStoryLabContext();
  const storyLabStep = isStoryLabPreview ? getStoryLabReviewModalStep(activeSubStopId) : null;
  const renderStep = storyLabStep ?? currentStep;
  const isPracticeMode = mode === "practice";
  const canClose = !forceCompletion || currentStep === 4;

  // In story mode the synthetic application's getPhaseStatus call fails so
  // commitRevealPhase stays undefined. Force-enable the commit phase whenever
  // the tour is parked on the commit step so the CommitRevealExplainer marker
  // renders (review-commit maps to renderStep 3 inside the modal).
  const isStoryLabCommitPhase = isStoryLabPreview && renderStep === 3;
  const isCommitPhase = !isPracticeMode && (commitRevealPhase === "commit" || isStoryLabCommitPhase);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const sessionIdBytes32 = blockchainSessionId as `0x${string}` | undefined;
  const { commitVote } = useVettingManager(
    isCommitPhase && blockchainSessionCreated ? sessionIdBytes32 : undefined
  );

  const onSepolia = chainId === sepolia.id;
  const walletMatches = !!(
    expertWallet && address && address.toLowerCase() === expertWallet.toLowerCase()
  );
  const sessionReady = !!blockchainSessionId && !!blockchainSessionCreated;

  // ─── Draft hydration on mount: load any prior draft from the server ────
  // This is the crash-recovery hook. We only run it for live, non-practice
  // flows that target a real application id.
  const shouldHydrateDraft = !!application?.id && !isPracticeMode && !isStoryLabPreview;
  useMountEffect(() => {
    if (!shouldHydrateDraft) return;
    let alive = true;
    reviewsApi.guildApplication
      .getDraft(application!.id)
      .then((draft) => {
        if (!alive || !draft) return;
        const body = draft.body as Partial<GuildReviewDraftBody> | undefined;
        if (!body) return;
        if (typeof body.feedback === "string") setFeedback(body.feedback);
        if (body.generalScores) setGeneralScores(body.generalScores);
        if (body.generalJustifications) setGeneralJustifications(body.generalJustifications);
        if (body.topicScores) setTopicScores(body.topicScores);
        if (body.topicJustifications) setTopicJustifications(body.topicJustifications);
        if (body.redFlags) setRedFlags(body.redFlags);
        if (typeof body.stakeAmount === "number") setStakeAmount(body.stakeAmount);
      })
      .catch(() => {
        /* no draft yet — silent */
      })
      .finally(() => {
        if (alive) setDraftHydrated(true);
      });
    return () => {
      alive = false;
    };
  });

  // ─── Crash recovery: if the BE state says "committed", show success ────
  // Skipped in practice/story flows — those use synthetic ids that don't
  // exist on the backend.
  const reviewState = useReviewState(
    "guildApplication",
    application?.id ?? "",
    { skip: !application?.id || isPracticeMode || isStoryLabPreview }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bulk-reset form state when the parent swaps to a new application; this prop->state sync is the effect's purpose
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
    setSubmitState({ kind: "ready" });
    setCommitTxHash(null);
    setDraftHydrated(false);
  }, [application?.id, isOpen]);

  // eslint-disable-next-line no-restricted-syntax -- sync stake from parent prop
  useEffect(() => {
    if (proposalContext?.requiredStake != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror parent prop into local stake state when proposal context changes
      setStakeAmount(proposalContext.requiredStake);
    }
  }, [proposalContext?.requiredStake]);

  // ─── Auto-save draft on any scoring / feedback change ──────────────────
  // Debounced PUT to the BE so a mid-signing crash retains progress.
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line no-restricted-syntax -- debounced auto-save to external system (server-side draft store)
  useEffect(() => {
    if (!shouldHydrateDraft || !draftHydrated || !application?.id) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const body: GuildReviewDraftBody = {
      feedback,
      generalScores,
      generalJustifications,
      topicScores,
      topicJustifications,
      redFlags,
      stakeAmount,
    };
    draftSaveTimerRef.current = setTimeout(() => {
      reviewsApi.guildApplication
        .putDraft(application.id, body as unknown as Record<string, unknown>)
        .catch((err) => {
          logger.warn(
            "Guild review draft save failed (will retry on next edit)",
            err,
            { silent: true }
          );
        });
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [
    shouldHydrateDraft,
    draftHydrated,
    application?.id,
    feedback,
    generalScores,
    generalJustifications,
    topicScores,
    topicJustifications,
    redFlags,
    stakeAmount,
  ]);

  const responses = application?.applicationResponses || {};
  const generalResponses = responses.general || {};
  const domainResponses = responses.domain || {};
  const level = responses.level || application?.expertiseLevel || "";
  const topicAnswers: Record<string, string> = domainResponses.topics || {};

  // eslint-disable-next-line no-restricted-syntax -- fetch templates when application/guild changes
  useEffect(() => {
    if (!application || !isOpen || !guildId) return;

    if (isPracticeMode && templateOverrides) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding local templates for practice mode; this prop->state sync is the effect's purpose
      setGeneralTemplate(templateOverrides.generalTemplate);
      setLevelTemplate(templateOverrides.levelTemplate);
      setTemplateError(null);
      setLoadingTemplates(false);
      return;
    }

    // In story mode the synthetic guild does not exist on the backend, so the
    // real template fetch returns "Template for this guild/stage/level not
    // found". Use the local practice templates instead so the modal renders
    // the same surface without a fake error banner.
    if (isStoryLabPreview) {
      setGeneralTemplate(STORY_LAB_GENERAL_TEMPLATE);
      setLevelTemplate(STORY_LAB_LEVEL_TEMPLATE);
      setTemplateError(null);
      setLoadingTemplates(false);
      return;
    }

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
  }, [application?.id, guildId, isOpen, isPracticeMode, isStoryLabPreview, level, templateOverrides]);

  const generalQuestions: GeneralReviewQuestion[] = generalTemplate?.generalQuestions?.length
    ? generalTemplate.generalQuestions
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
    // Try mapped camelCase key first, then fall back to raw question ID
    const responseKey = GENERAL_RESPONSE_KEY_MAP[questionId];
    const responseValue = generalResponses[responseKey] ?? generalResponses[questionId] ?? "";
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

  // Banner state shown above the on-chain commit submit button.
  const banner: OnChainStatus = useMemo(() => {
    if (reviewState.data?.kind === "committed") {
      return { kind: "confirmed", txHash: reviewState.data.txHash || "0x0" };
    }
    if (isCommitPhase && !sessionReady) return { kind: "preparing_session" };
    return submitState;
  }, [reviewState.data, isCommitPhase, sessionReady, submitState]);

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
    scrollContentToTop(contentRef.current);
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollContentToTop(contentRef.current);
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

    if (isPracticeMode) {
      setApiResponse({
        message: "No real review was submitted. Practice calibration is complete.",
      });
      setCurrentStep(4);
      scrollContentToTop(contentRef.current);
      onPracticeComplete?.();
      return;
    }

    if (isCommitPhase && application?.id) {
      // Resilient Review flow: server derives the salt, we sign on-chain,
      // then the BE verifies the receipt against the recomputed hash.
      if (!sessionReady || !isConnected || !onSepolia || !walletMatches) {
        if (!walletMatches) {
          toast.error(
            "Connected wallet does not match your registered reviewer wallet."
          );
        } else if (!onSepolia) {
          toast.error("Wrong network. Switch to Sepolia testnet.");
        } else if (!sessionReady) {
          toast.error("On-chain session is still being prepared. Try again shortly.");
        } else {
          toast.error("Connect your wallet to submit on-chain.");
        }
        return;
      }
      try {
        const normalizedScore = computedOverallMax > 0
          ? Math.round((overallScore / computedOverallMax) * 100)
          : 0;

        setSubmitState({ kind: "awaiting_signature" });

        // 1. Get expected commit hash from BE (server derives the salt).
        const ch = await reviewsApi.guildApplication.getCommitHash(
          application.id,
          normalizedScore
        );
        const expectedCommitHash = ch.expectedCommitHash;

        // 2. Sign on-chain.
        const txHash = await commitVote(expectedCommitHash as `0x${string}`);
        setCommitTxHash(txHash || null);
        setSubmitState({ kind: "confirming", txHash });

        // 3. Wait for finality (12 blocks).
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 12,
          });
        }

        // 4. Submit to BE for verification + persistence. The BE static-calls
        // the contract to confirm the on-chain commitment matches our recomputed
        // hash, then writes the canonical row in expert_application_reviews.
        // Rich criteria fields are passed through so they land alongside the
        // on-chain commit (the auto-saved draft is ephemeral).
        await reviewsApi.guildApplication.submit(application.id, {
          score: normalizedScore,
          txHash,
          feedback: feedback || undefined,
          criteriaScores: buildCriteriaScores(),
          criteriaJustifications: buildCriteriaJustifications(),
          overallScore,
          redFlagDeductions,
        });

        setSubmitState({ kind: "confirmed", txHash });
        setApiResponse({
          message:
            "Vote submitted! Scores will be revealed automatically when all reviewers have voted.",
        });
        setCurrentStep(4);
        scrollContentToTop(contentRef.current);
        toast.success("Vote committed on-chain");
        onReviewSuccess?.();
      } catch (err: unknown) {
        const reason = extractApiError(err, "On-chain commit failed");
        setSubmitState({ kind: "failed", reason, canRetry: true });
        toast.error(reason);
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
      scrollContentToTop(contentRef.current);
    } catch {
      // Error is handled by the parent via toast
    }
  };

  const isCommitting =
    submitState.kind === "awaiting_signature" || submitState.kind === "confirming";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-border" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isPracticeMode ? "Practice Review" : proposalContext ? "Review Candidate" : reviewTypeProp === "candidate" ? "Review Candidate Application" : "Review Expert Application"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isPracticeMode || isStoryLabPreview
                  ? "Sandbox practice sample / synthetic applicant"
                  : reviewTypeProp === "candidate" ? "Candidate application review" : "Expert membership review"}
              </p>
            </div>
            {canClose && (
              <button
                onClick={onClose}
                aria-label="Close review modal"
                className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                {...(isStoryLabPreview ? dataTourTarget(TOUR_TARGETS.practiceReviewCloseButton) : {})}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <div ref={contentRef} className="relative flex-1 overflow-y-auto px-6 py-5">
            <StepIndicator currentStep={renderStep} />

            {templateError && <Alert variant="error">{templateError}</Alert>}
            {loadingTemplates && (
              <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-warning/[0.06] border border-warning/15">
                <Loader2 className="w-4 h-4 text-warning animate-spin" />
                <p className="text-sm text-primary/80">Loading review template and rubric...</p>
              </div>
            )}

            {renderStep === 1 && (
              <ReviewProfileStep application={application} level={level} />
            )}
            {renderStep === 2 && (
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
            {renderStep === 3 && (
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
                  <div
                    className="mt-4 space-y-3"
                    {...(isStoryLabPreview
                      ? dataTourTarget(TOUR_TARGETS.practiceReviewTxStatus)
                      : {})}
                  >
                    <CommitRevealExplainer />
                    <OnChainStatusBanner
                      status={banner}
                      sessionId={blockchainSessionId}
                      onRetry={() => setSubmitState({ kind: "ready" })}
                    />
                    {!walletMatches && isConnected && expertWallet && (
                      <p className="text-sm text-destructive">
                        Connected wallet does not match your registered reviewer wallet.
                      </p>
                    )}
                    {!onSepolia && isConnected && (
                      <p className="text-sm text-destructive">
                        Wrong network. Switch to Sepolia testnet.
                      </p>
                    )}
                  </div>
                )}
                <ReviewSubmitSection
                  proposalContext={proposalContext}
                  stakeAmount={stakeAmount}
                  onStakeAmountChange={setStakeAmount}
                />
              </>
            )}
            {renderStep === 4 && (
              <ReviewSuccessStep
                isCommitPhase={isCommitPhase}
                apiResponse={apiResponse}
                generalTotal={isStoryLabPreview ? Math.max(generalTotal, Math.round((generalMax || 5) * 0.8)) : generalTotal}
                generalMax={generalMax || (isStoryLabPreview ? 5 : 0)}
                topicTotal={isStoryLabPreview ? Math.max(topicTotal, Math.round((topicMax || 5) * 0.8)) : topicTotal}
                topicMax={topicMax || (isStoryLabPreview ? 5 : 0)}
                redFlagDeductions={redFlagDeductions}
                overallScore={
                  isStoryLabPreview
                    ? Math.max(
                        overallScore,
                        Math.round((generalMax || 5) * 0.8) + Math.round((topicMax || 5) * 0.8)
                      )
                    : overallScore
                }
                commitTxHash={isStoryLabPreview && !commitTxHash ? STORY_LAB_FALLBACK_COMMIT_TX_HASH : commitTxHash}
                isPracticeMode={isPracticeMode}
                practiceActions={practiceActions}
              />
            )}

            {validationError && (
              <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl ${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.border}`}>
                <XCircle className={`w-4 h-4 ${STATUS_COLORS.negative.icon} shrink-0`} />
                <p className={`text-sm ${STATUS_COLORS.negative.text}`}>{validationError}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="border-t border-border px-7 py-5">
            <ReviewNavigation
              currentStep={currentStep}
              isReviewing={isReviewing}
              isCommitting={isCommitting}
              isCommitPhase={isCommitPhase}
              onClose={onClose}
              onNext={handleNext}
              onBack={handleBack}
              onSubmit={handleSubmit}
              canClose={canClose}
              submitLabel={isPracticeMode ? completionActionLabel ?? "Complete Practice Review" : undefined}
              tourMarkerProps={
                isStoryLabPreview && currentStep === 3
                  ? dataTourTarget(TOUR_TARGETS.practiceReviewSubmitButton)
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
