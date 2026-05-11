"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CloudOff, Loader2, RefreshCw, XCircle, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { STATUS_COLORS } from "@/config/colors";
import { toast } from "sonner";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ApiError, expertApi, reviewsApi, extractApiError } from "@/lib/api";
import type {
  ReviewSubmitPayload as OnChainReviewSubmitPayload,
  BlockchainSessionInfo,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { useVettingManager } from "@/lib/hooks/useVettedContracts";
import { useReviewState } from "@/lib/hooks/useReviewState";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useApi } from "@/lib/hooks/useFetch";
import { getTransactionErrorMessage, isUserRejection } from "@/lib/blockchain";
import { type OnChainStatus } from "@/components/reviews/OnChainStatusBanner";
import { CommitFlowPanel } from "@/components/reviews/CommitFlowPanel";
import { ReviewProfileStep } from "@/components/guild/review/ReviewProfileStep";
import { GeneralReviewStep } from "@/components/guild/review/GeneralReviewStep";
import { DomainReviewStep } from "@/components/guild/review/DomainReviewStep";
import { StepIndicator } from "@/components/guild/review/StepIndicator";
import { VerticalStepRail } from "@/components/guild/review/VerticalStepRail";
import { ReviewSuccessStep } from "@/components/guild/review/ReviewSuccessStep";
import { ReviewSubmitSection } from "@/components/guild/review/ReviewSubmitSection";
import { ReviewNavigation } from "@/components/guild/review/ReviewNavigation";
import { EligibilityNote } from "@/components/guild/review/EligibilityNote";
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

// Confirmations to wait after the on-chain commit before calling the BE.
// 1 confirmation is the demo default — Sepolia reorgs are vanishingly rare
// and the user-perceived latency drops from ~24s to ~12s. Bump this back up
// if you ever route this flow at a chain where deeper finality matters.
const COMMIT_CONFIRMATIONS = 1n;

// Pending-tx persistence for the on-chain commit flow.
// If the user refreshes/HMRs after signing but before the BE submit completes,
// the on-chain commit is orphaned. We persist enough state to resume the flow
// without a new signature on the next mount.
const PENDING_TX_TTL_MS = 30 * 60 * 1000;

// Retry policy for the BE submit step. 5xx + network errors are retried with
// exponential backoff; 4xx (client errors) surface immediately for user action.
const SUBMIT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

// Contract errors that can never succeed on retry — e.g. you cannot un-commit
// once the chain has accepted a vote, and you cannot commit after the deadline.
const NON_RETRYABLE_CONTRACT_ERRORS = new Set<string>([
  "AlreadyCommitted",
  "CommitPeriodEnded",
  "AlreadyRevealed",
  "SessionDoesNotExist",
  "NotPanelMember",
]);

type PendingReviewTx = {
  txHash: `0x${string}`;
  applicationId: string;
  reviewerWallet: string;
  normalizedScore: number;
  criteriaScores: Record<string, unknown>;
  criteriaJustifications: Record<string, unknown>;
  feedback?: string;
  redFlagDeductions: number;
  overallScore: number;
  createdAt: number;
};

function pendingTxStorageKey(applicationId: string, wallet: string): string {
  return `review-pending-${applicationId}-${wallet.toLowerCase()}`;
}

function loadPendingTx(applicationId: string, wallet: string): PendingReviewTx | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(pendingTxStorageKey(applicationId, wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingReviewTx;
    // TTL prevents stale recoveries from previous sessions where the commit
    // is far enough in the past that the reveal phase may already be open.
    if (typeof parsed?.createdAt !== "number" || Date.now() - parsed.createdAt > PENDING_TX_TTL_MS) {
      window.localStorage.removeItem(pendingTxStorageKey(applicationId, wallet));
      return null;
    }
    if (parsed.applicationId !== applicationId) return null;
    if (parsed.reviewerWallet.toLowerCase() !== wallet.toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePendingTx(record: PendingReviewTx): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      pendingTxStorageKey(record.applicationId, record.reviewerWallet),
      JSON.stringify(record),
    );
  } catch {
    /* quota exceeded or storage disabled — non-fatal */
  }
}

function clearPendingTx(applicationId: string, wallet: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(pendingTxStorageKey(applicationId, wallet));
  } catch {
    /* non-fatal */
  }
}

// Detect the named contract error from a viem/wagmi error so we can decide
// whether retry is meaningful (e.g. AlreadyCommitted is terminal).
function getContractErrorName(error: unknown): string | undefined {
  for (const name of NON_RETRYABLE_CONTRACT_ERRORS) {
    if (error instanceof Error && error.message.includes(name)) return name;
    if (
      typeof error === "object" &&
      error !== null &&
      "shortMessage" in error &&
      typeof (error as { shortMessage: unknown }).shortMessage === "string" &&
      ((error as { shortMessage: string }).shortMessage).includes(name)
    ) {
      return name;
    }
  }
  return undefined;
}

// Distinguish retryable BE failures (5xx, network) from terminal ones (4xx).
// 409 ConflictError is treated as success at the call site (idempotent submit).
function isRetryableBackendError(err: unknown): boolean {
  if (err instanceof ApiError) {
    // BE's RPC node can lag the FE's by one block, returning a 400
    // "Awaiting finality (N blocks remaining)" right after the FE's
    // waitForTransactionReceipt resolves. The tx is fine — just retry
    // until the BE's view catches up.
    if (err.status === 400 && /awaiting finality/i.test(err.message)) return true;
    return err.status >= 500;
  }
  // Non-ApiError thrown from apiRequest is typically a network/parse failure.
  return err instanceof Error;
}

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

/**
 * Save-indicator state machine. Surfaces near the modal header so the
 * reviewer always knows whether their work is safely on the server.
 *  - `idle`: never saved (clean slate after restore or pre-edit).
 *  - `saving`: PUT in flight.
 *  - `saved`: most recent PUT succeeded; `at` drives the "Saved · Ns ago" copy.
 *  - `failed`: most recent PUT failed; auto-save will retry on next edit.
 */
type DraftSaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "failed"; reason: string };

const CONFLICT_MAX_CYCLES = 3;

/**
 * Synchronous-style draft flush used by `visibilitychange`, `pagehide`,
 * `beforeunload`, and the modal-close path. We deliberately use `fetch` with
 * `keepalive: true` rather than `navigator.sendBeacon` because the BE
 * authenticates draft writes via the `X-Wallet-Address` header — sendBeacon
 * doesn't support custom headers, only a fixed Content-Type body.
 *
 * Returns void; caller MUST NOT await — the whole point is firing a request
 * the browser can finish even after page teardown.
 */
function flushDraftKeepalive(
  applicationId: string,
  body: GuildReviewDraftBody,
  walletAddress: string,
  lastSeenModified: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const apiBase =
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
      "http://localhost:4000";
    const url = `${apiBase}/api/experts/guild-applications/${applicationId}/review/draft`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Wallet-Address": walletAddress,
    };
    const payload = lastSeenModified ? { body, lastSeenModified } : { body };
    void fetch(url, {
      method: "PUT",
      keepalive: true,
      headers,
      body: JSON.stringify(payload),
    }).catch(() => {
      /* keepalive failures are unobservable post-teardown — best-effort */
    });
  } catch {
    /* never throw inside lifecycle handlers — that would block page unload */
  }
}

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
  // Pre-sign confirmation dialog. We stash the prepared commit payload in a
  // ref so the dialog's onConfirm callback runs the same code path the user
  // would have triggered with a direct click — but only after they tick
  // "I understand this is permanent". Prevents accidental on-chain commits.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const pendingCommitRef = useRef<{
    normalizedScore: number;
    criteriaScores: Record<string, unknown>;
    criteriaJustifications: Record<string, unknown>;
    feedback?: string;
    redFlagDeductions: number;
    overallScore: number;
  } | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>({ kind: "idle" });

  // ISO timestamp of the last successful draft write the BE acknowledged.
  // Sent on subsequent saves so the BE can 409 if another tab raced ahead.
  const lastSeenModifiedRef = useRef<string | null>(null);
  // Conflict-cycle counter — bail after CONFLICT_MAX_CYCLES so we don't loop.
  const conflictCycleRef = useRef(0);
  // Tracks whether a save is currently in flight, so close-path flushes don't
  // step on it.
  const saveInFlightRef = useRef(false);

  // When we cancel an in-flight on-chain attempt (user pressed Cancel after
  // 90s of waiting on MetaMask, or a refresh-recovery superseded it), this
  // ref flips so async tasks can short-circuit instead of writing stale state.
  const cancelTokenRef = useRef(0);
  // Tracks whether the current pipeline is the resume-from-localStorage path,
  // so the banner shows "Recovering…" instead of "Confirming…" until done.
  const recoveringRef = useRef(false);

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
  // `sessionReady` originally read straight from the legacy
  // `blockchainSessionCreated` prop. Phase 3 hardening also accepts the
  // BE-derived status from the review-state envelope so we hide the banner
  // as soon as the cron finishes, even without a parent re-render.
  // (The envelope check is hoisted further down once `reviewState` is in scope —
  // we expose `sessionReady` again right after that hook call.)

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
        // Capture lastModified so subsequent PUTs can include
        // `lastSeenModified` and the BE can detect concurrent-tab conflicts.
        if (typeof draft.lastModified === "string") {
          lastSeenModifiedRef.current = draft.lastModified;
        }
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
  //
  // Phase 3 hardening: we poll the review-state envelope every 5s while the
  // modal is open and the most-recently observed on-chain session status is
  // not yet terminal. The latest status is mirrored into local state below
  // (after `useReviewState` runs), and the polling predicate reads that
  // value via state — never via a ref during render.
  const [latestSessionStatus, setLatestSessionStatus] = useState<
    "pending" | "created" | "failed" | "abandoned" | null
  >(null);
  const SESSION_POLL_INTERVAL_MS = 5000;
  const shouldPollSession =
    isOpen &&
    !!application?.id &&
    !isPracticeMode &&
    !isStoryLabPreview &&
    latestSessionStatus !== "created" &&
    latestSessionStatus !== "failed" &&
    latestSessionStatus !== "abandoned";
  const reviewState = useReviewState(
    "guildApplication",
    application?.id ?? "",
    {
      skip: !application?.id || isPracticeMode || isStoryLabPreview,
      pollIntervalMs: shouldPollSession ? SESSION_POLL_INTERVAL_MS : null,
    }
  );
  // Mirror the latest envelope status into state so the polling predicate
  // can read it without touching a ref during render.
  // eslint-disable-next-line no-restricted-syntax -- prop->state mirror; the polling predicate must observe terminal statuses on the *next* render
  useEffect(() => {
    const next = reviewState.envelope.blockchainSession?.status ?? null;
    if (next !== latestSessionStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror BE-derived status into local state so the polling predicate reads it on the next render; this is the canonical "external state → React state" sync
      setLatestSessionStatus(next);
    }
  }, [reviewState.envelope.blockchainSession?.status, latestSessionStatus]);

  // ─── Resolved session-ready signal (Phase 3) ──────────────────────────
  // The legacy `blockchainSessionCreated` prop is forwarded by the parent and
  // updates on parent refetch; the envelope's `blockchainSession.status` is
  // refreshed by polling here. Either signal is sufficient to declare the
  // on-chain session usable.
  const blockchainSession = reviewState.envelope.blockchainSession;
  const sessionReady =
    !!blockchainSessionId &&
    (!!blockchainSessionCreated || blockchainSession?.status === "created");

  // Track when the modal mounted so we can show a "taking longer than usual"
  // warning if the session has stayed `pending` for >180s.
  const [modalMountedAt, setModalMountedAt] = useState<number | null>(null);
  // eslint-disable-next-line no-restricted-syntax -- capture mount time on open transitions; resets when application id or open state changes
  useEffect(() => {
    if (!isOpen || isPracticeMode || isStoryLabPreview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset mount-clock when the modal closes
      setModalMountedAt(null);
      return;
    }
    setModalMountedAt(Date.now());
  }, [isOpen, isPracticeMode, isStoryLabPreview, application?.id]);
  // Re-render trigger so the warning surfaces without a user input. The
  // interval below ticks once per second while polling — cheap, runs only
  // while the modal is open + status is `pending`.
  const [now, setNow] = useState<number>(() => Date.now());
  // eslint-disable-next-line no-restricted-syntax -- timer-driven banner threshold; bound to polling state
  useEffect(() => {
    if (!shouldPollSession) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldPollSession]);
  const sessionPendingForMs =
    blockchainSession?.status === "pending" && modalMountedAt !== null
      ? now - modalMountedAt
      : 0;
  const showSessionSlowWarning = sessionPendingForMs > 180_000;

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
    // Bump the cancel token so any in-flight async pipeline from a prior
    // application id stops writing to state.
    cancelTokenRef.current += 1;
    recoveringRef.current = false;
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
    setDraftSaveStatus({ kind: "idle" });
    lastSeenModifiedRef.current = null;
    conflictCycleRef.current = 0;
    // The mount-clock used for the >180s session-slow warning is reset by a
    // dedicated effect keyed on (isOpen, application.id) — see above.
  }, [application?.id, isOpen]);

  // eslint-disable-next-line no-restricted-syntax -- sync stake from parent prop
  useEffect(() => {
    if (proposalContext?.requiredStake != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror parent prop into local stake state when proposal context changes
      setStakeAmount(proposalContext.requiredStake);
    }
  }, [proposalContext?.requiredStake]);

  // ─── Auto-save draft on any scoring / feedback change ──────────────────
  // Debounced PUT to the BE so a mid-signing crash retains progress. We also
  // expose `flushDraftNow` so close paths / tab-switch listeners can force a
  // synchronous save instead of waiting out the debounce.
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror live form state into a ref so the keepalive lifecycle handlers
  // (visibilitychange / pagehide / beforeunload / unmount) can read the
  // latest snapshot without re-binding listeners on every keystroke.
  const latestDraftBodyRef = useRef<GuildReviewDraftBody>({
    feedback: "",
    generalScores: {},
    generalJustifications: {},
    topicScores: {},
    topicJustifications: {},
    redFlags: {},
    stakeAmount: 0,
  });
  // eslint-disable-next-line no-restricted-syntax -- mirror form state into a ref so lifecycle handlers can read without re-binding
  useEffect(() => {
    latestDraftBodyRef.current = {
      feedback,
      generalScores,
      generalJustifications,
      topicScores,
      topicJustifications,
      redFlags,
      stakeAmount,
    };
  }, [
    feedback,
    generalScores,
    generalJustifications,
    topicScores,
    topicJustifications,
    redFlags,
    stakeAmount,
  ]);

  // The 409-conflict retry path inside `performDraftSave` recurses by name.
  // Mirror it via a ref so the function can dispatch into its own latest
  // definition without TDZ issues during compilation.
  const performDraftSaveRef = useRef<
    ((body: GuildReviewDraftBody, applicationId: string) => Promise<void>) | null
  >(null);

  const performDraftSave = useCallback(
    async (body: GuildReviewDraftBody, applicationId: string): Promise<void> => {
      saveInFlightRef.current = true;
      setDraftSaveStatus({ kind: "saving" });
      try {
        const response = await reviewsApi.guildApplication.putDraft(
          applicationId,
          body as unknown as Record<string, unknown>,
          { lastSeenModified: lastSeenModifiedRef.current },
        );
        if (typeof response?.lastModified === "string") {
          lastSeenModifiedRef.current = response.lastModified;
        }
        conflictCycleRef.current = 0;
        setDraftSaveStatus({ kind: "saved", at: Date.now() });
      } catch (err) {
        // ─── Concurrent-tab conflict resolution ───────────────────────────
        // The BE returns 409 when our `lastSeenModified` is stale relative to
        // the stored draft (another tab won the race). Refetch the canonical
        // draft, merge our local edits on top (last-keystroke-wins for
        // diverging fields), then retry up to CONFLICT_MAX_CYCLES.
        if (err instanceof ApiError && err.status === 409) {
          conflictCycleRef.current += 1;
          if (conflictCycleRef.current > CONFLICT_MAX_CYCLES) {
            const reason =
              "Couldn't reconcile with another tab — please re-enter or refresh.";
            setDraftSaveStatus({ kind: "failed", reason });
            toast.error(reason);
            saveInFlightRef.current = false;
            return;
          }
          toast.message("Your draft was updated in another tab — refreshing");
          try {
            const fresh = await reviewsApi.guildApplication.getDraft(applicationId);
            if (fresh) {
              if (typeof fresh.lastModified === "string") {
                lastSeenModifiedRef.current = fresh.lastModified;
              }
              const remoteBody = fresh.body as Partial<GuildReviewDraftBody> | undefined;
              if (remoteBody) {
                // Merge: prefer our local edits where the user has typed
                // anything, else accept the remote value. For object fields
                // (scores/justifications), shallow-merge by key.
                const local = body;
                const merged: GuildReviewDraftBody = {
                  feedback: local.feedback || (remoteBody.feedback ?? ""),
                  generalScores: { ...(remoteBody.generalScores ?? {}), ...local.generalScores },
                  generalJustifications: {
                    ...(remoteBody.generalJustifications ?? {}),
                    ...local.generalJustifications,
                  },
                  topicScores: { ...(remoteBody.topicScores ?? {}), ...local.topicScores },
                  topicJustifications: {
                    ...(remoteBody.topicJustifications ?? {}),
                    ...local.topicJustifications,
                  },
                  redFlags: { ...(remoteBody.redFlags ?? {}), ...local.redFlags },
                  stakeAmount: local.stakeAmount || (remoteBody.stakeAmount ?? 0),
                };
                // Apply merged values back into form state so the UI reflects
                // the post-merge truth before we retry.
                setFeedback(merged.feedback);
                setGeneralScores(merged.generalScores);
                setGeneralJustifications(merged.generalJustifications);
                setTopicScores(merged.topicScores);
                setTopicJustifications(merged.topicJustifications);
                setRedFlags(merged.redFlags);
                setStakeAmount(merged.stakeAmount);
                latestDraftBodyRef.current = merged;
                saveInFlightRef.current = false;
                // Retry with fresh `lastSeenModified`. We dispatch via the
                // ref to avoid the compiler complaining about referencing
                // `performDraftSave` inside its own definition.
                await performDraftSaveRef.current?.(merged, applicationId);
                return;
              }
            }
          } catch (refetchErr) {
            logger.warn(
              "Guild review draft refetch after 409 failed",
              refetchErr,
              { silent: true },
            );
          }
        }
        const reason = extractApiError(err, "Save failed (will retry)");
        setDraftSaveStatus({ kind: "failed", reason });
        logger.warn(
          "Guild review draft save failed (will retry on next edit)",
          err,
          { silent: true },
        );
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [],
  );
  // eslint-disable-next-line no-restricted-syntax -- ref mirror so the function can dispatch into its own latest definition
  useEffect(() => {
    performDraftSaveRef.current = performDraftSave;
  }, [performDraftSave]);

  /**
   * Force-flush any pending debounced save synchronously. Returns a Promise
   * the caller can await for in-flow flushes (modal close, step nav). For
   * lifecycle-handler flushes (page-hide / unload), the caller should NOT
   * await — `flushDraftKeepalive` is invoked in parallel from the listener
   * effect below for that case.
   */
  const flushDraftNow = useCallback((): Promise<void> => {
    const appId = application?.id;
    if (!shouldHydrateDraft || !draftHydrated || !appId) {
      return Promise.resolve();
    }
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    return performDraftSave(latestDraftBodyRef.current, appId);
  }, [shouldHydrateDraft, draftHydrated, application?.id, performDraftSave]);

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
    const applicationId = application.id;
    draftSaveTimerRef.current = setTimeout(() => {
      void performDraftSave(body, applicationId);
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
    performDraftSave,
  ]);

  // ─── Lifecycle-driven flush: tab switch / page hide / before unload ────
  // Each of these can fire within the 1.5s debounce window; without a flush
  // here the reviewer's last keystrokes are lost. We use `fetch` with
  // `keepalive: true` (not `navigator.sendBeacon`) because the BE
  // authenticates draft writes via the `X-Wallet-Address` header, which
  // sendBeacon cannot set.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to page lifecycle events to flush the in-progress draft
  useEffect(() => {
    if (!isOpen) return;
    if (!shouldHydrateDraft || !application?.id) return;
    const applicationId = application.id;
    const wallet = address ?? expertWallet ?? null;
    const flushKeepalive = () => {
      // If a save is already in flight, don't double-fire — the in-flight
      // request is using the same data and `keepalive` would race it.
      if (saveInFlightRef.current) return;
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      if (!wallet) return; // can't authenticate the keepalive PUT
      flushDraftKeepalive(
        applicationId,
        latestDraftBodyRef.current,
        wallet,
        lastSeenModifiedRef.current,
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushKeepalive();
    };
    const handlePageHide = () => flushKeepalive();
    // Note: we deliberately do NOT call preventDefault on beforeunload — that
    // would show a "leave site?" prompt which the spec explicitly forbids.
    const handleBeforeUnload = () => flushKeepalive();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Cleanup runs both on full unmount AND when isOpen flips false. Fire
      // a keepalive flush either way so a parent that closes the modal by
      // toggling its prop (without going through the X / outside-click
      // handlers) still gets the last keystrokes saved.
      flushKeepalive();
    };
  }, [isOpen, shouldHydrateDraft, application?.id, address, expertWallet]);

  // Refetch the envelope every time the modal is opened, so a reviewer who
  // closed the modal mid-edit and returned to it sees the freshest BE state
  // (e.g. another tab committed in the meantime).
  // eslint-disable-next-line no-restricted-syntax -- explicit imperative refetch tied to modal open transitions
  useEffect(() => {
    if (!isOpen) return;
    if (!shouldHydrateDraft || !application?.id) return;
    reviewState.refetch();
    // We deliberately depend only on the open transition + application id so
    // we don't loop on every refetch result. The reviewState reference is
    // stable from useFetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, application?.id, shouldHydrateDraft]);

  // ─── Modal close path: flush before close on every exit ────────────────
  // Wraps the parent's onClose so X-button / outside-click / forced-close
  // and ESC paths all flush the draft. The flush is fire-and-forget — we
  // don't block the close on a slow PUT, but we synchronously cancel the
  // debounce so the in-memory state is committed via the await'd path or,
  // failing that, the keepalive on unmount cleanup.
  const handleCloseWithFlush = useCallback(() => {
    if (shouldHydrateDraft && application?.id && draftHydrated) {
      // Fire the in-flow flush; UI proceeds to close immediately.
      void flushDraftNow();
    }
    onClose();
  }, [shouldHydrateDraft, application?.id, draftHydrated, flushDraftNow, onClose]);

  // ESC keypress closes via the flushing path. Some modal hosts/parents
  // already wire ESC themselves; we only act when the modal is open AND
  // close is permitted, and we don't preventDefault so other listeners are
  // free to no-op.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to a window keydown event for in-modal ESC handling
  useEffect(() => {
    if (!isOpen || !canClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseWithFlush();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, canClose, handleCloseWithFlush]);

  // ─── Unmount-time keepalive flush ──────────────────────────────────────
  // If the parent yanks the modal (route change, isOpen flipped to false in
  // the same tick the user clicked, etc.) the regular flushDraftNow path
  // can race with React tearing the component down. Belt-and-suspenders:
  // also fire a keepalive PUT in the cleanup phase. Cheap to double-fire —
  // BE is idempotent and the keepalive guard above bails when one's in
  // flight.
  // eslint-disable-next-line no-restricted-syntax -- cleanup on unmount fires a keepalive flush so the BE always has the last state
  useEffect(() => {
    return () => {
      if (!shouldHydrateDraft || !application?.id) return;
      if (saveInFlightRef.current) return;
      const wallet = address ?? expertWallet ?? null;
      if (!wallet) return;
      // Only flush if we have actually hydrated (avoids overwriting a real
      // draft with an empty {} on a fast mount/unmount before getDraft
      // resolves).
      if (!draftHydrated) return;
      flushDraftKeepalive(
        application.id,
        latestDraftBodyRef.current,
        wallet,
        lastSeenModifiedRef.current,
      );
    };
    // We intentionally re-bind the cleanup whenever the application changes
    // so the captured id matches what we're flushing.
  }, [shouldHydrateDraft, application?.id, draftHydrated, address, expertWallet]);

  const responses = application?.applicationResponses || {};
  const generalResponses = responses.general || {};
  const domainResponses = responses.domain || {};
  const level = responses.level || application?.expertiseLevel || "";
  const topicAnswers: Record<string, string> = domainResponses.topics || {};

  // Hoisted so the inline error banner can re-invoke it via a Retry button
  // without forcing a modal close+reopen cycle.
  const loadTemplates = useCallback(async () => {
    if (!guildId) return;
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
  }, [guildId, level]);

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

    void loadTemplates();
  }, [application, application?.id, guildId, isOpen, isPracticeMode, isStoryLabPreview, level, templateOverrides, loadTemplates]);

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
  // Reads the envelope so older `kind: "committed"` responses and newer
  // `hasCommittedReview` envelopes are both handled in one branch.
  // Phase 3 hardening: when the BE reports the on-chain session as
  // failed/abandoned we render the SessionFailureBanner instead of the
  // CommitFlowPanel; here the regular `banner` stays in `preparing_session`
  // so the rest of the form (locked/disabled state) keeps behaving as before.
  const banner: OnChainStatus = useMemo(() => {
    if (reviewState.envelope.hasCommittedReview) {
      return {
        kind: "confirmed",
        txHash: reviewState.envelope.onChainCommitTxHash || "0x0",
      };
    }
    if (isCommitPhase && !sessionReady) return { kind: "preparing_session" };
    return submitState;
  }, [
    reviewState.envelope.hasCommittedReview,
    reviewState.envelope.onChainCommitTxHash,
    isCommitPhase,
    sessionReady,
    submitState,
  ]);

  // Phase 3 hardening: derive a single "session creation failed" predicate
  // off the envelope so the banner state machine below has a single source
  // of truth. Falls back to the legacy preparing-session banner when the BE
  // hasn't returned the new field (older deployments).
  const sessionCreationFailed =
    isCommitPhase &&
    !sessionReady &&
    !!blockchainSession &&
    (blockchainSession.status === "failed" || blockchainSession.status === "abandoned");

  // Imperative retry handler. POSTs to the new BE endpoint; on success we
  // refetch the review-state envelope so the banner flips back to pending.
  const sessionRetryApi = useApi<BlockchainSessionInfo>();
  const handleRetrySessionCreation = useCallback(async () => {
    if (!application?.id) return;
    const result = await sessionRetryApi.execute(
      () => reviewsApi.guildApplication.retrySession(application.id),
      {
        onSuccess: () => {
          toast.success("On-chain session retry queued");
          // Reset the >180s timer — operator restarted the cron; give it a
          // fresh window before warning again.
          setModalMountedAt(Date.now());
          // Pull the fresh envelope (status will flip back to `pending`,
          // which re-engages polling via the predicate above).
          reviewState.refetch();
        },
        onError: (msg) => {
          toast.error(msg || "Could not retry session creation");
        },
      },
    );
    return result;
  }, [application, sessionRetryApi, reviewState]);

  // Envelope-driven gates. We only act on `false` for `isAssignedReviewer` —
  // older BE versions don't populate it and we surface them as `null`, which
  // means "unknown, fall through to existing UI".
  const isExplicitlyNotAssigned =
    !isPracticeMode &&
    !isStoryLabPreview &&
    reviewState.envelope.isAssignedReviewer === false;

  // If the BE says we've already committed, swap the entire form for the
  // success/receipt step. This survives a refresh after a successful commit
  // even if the local `currentStep === 4` state was lost.
  const hasAlreadyCommitted =
    !isPracticeMode &&
    !isStoryLabPreview &&
    reviewState.envelope.hasCommittedReview;

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
    // Force-flush the debounce before transitioning steps so a mid-typing
    // refresh on the new step doesn't lose the previous step's last edits.
    void flushDraftNow();
    setCurrentStep((prev) => Math.min(prev + 1, 3));
    scrollContentToTop(contentRef.current);
  };

  const handleBack = () => {
    setValidationError(null);
    void flushDraftNow();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollContentToTop(contentRef.current);
  };

  // ─── On-chain pipeline helpers ─────────────────────────────────────────
  // Extracted from handleSubmit so the mount-time recovery path can resume
  // a pending tx (waitForReceipt + BE submit) without requiring a re-sign.

  const submitToBackendWithRetry = async (
    applicationId: string,
    payload: OnChainReviewSubmitPayload,
    txHash: `0x${string}`,
    token: number,
  ): Promise<void> => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= SUBMIT_RETRY_DELAYS_MS.length; attempt++) {
      if (cancelTokenRef.current !== token) return;
      try {
        await reviewsApi.guildApplication.submit(applicationId, payload);
        return;
      } catch (err: unknown) {
        lastError = err;
        // 409 ConflictError indicates the BE already recorded this commit
        // (another tab or a previous successful submit). Treat as success.
        if (err instanceof ApiError && err.status === 409) {
          logger.info(
            "Guild review submit returned 409 — treating as idempotent success",
            { silent: true },
          );
          return;
        }
        if (!isRetryableBackendError(err)) {
          // 4xx (other than 409) is terminal — surface to the user.
          throw err;
        }
        const delayMs = SUBMIT_RETRY_DELAYS_MS[attempt];
        if (delayMs === undefined) break; // exhausted
        if (cancelTokenRef.current !== token) return;
        // Show "Recovering…" between retries with a visible countdown so the
        // user knows the FE is still trying and hasn't given up. Tick the
        // visible value down once per second so the banner doesn't say
        // "retrying in 16s…" then suddenly fire — it counts down honestly.
        const reason = extractApiError(err, "Backend submit failed");
        const startedAt = Date.now();
        setSubmitState({
          kind: "recovering",
          reason: `${reason} — retrying`,
          txHash,
          attempt: attempt + 2, // human-friendly: "attempt 2"
          nextRetryInMs: delayMs,
        });
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (cancelTokenRef.current !== token) {
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              resolve();
              return;
            }
            const remaining = Math.max(0, delayMs - (Date.now() - startedAt));
            setSubmitState((prev) =>
              prev.kind === "recovering"
                ? { ...prev, nextRetryInMs: remaining }
                : prev,
            );
          };
          const intervalId = setInterval(tick, 1000);
          const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            resolve();
          }, delayMs);
        });
        if (cancelTokenRef.current !== token) return;
      }
    }
    throw lastError ?? new Error("Submit failed after retries");
  };

  const confirmAndSubmit = async (record: PendingReviewTx, token: number): Promise<void> => {
    if (!publicClient) {
      throw new Error("Public RPC client is not available");
    }
    const txHash = record.txHash;
    setCommitTxHash(txHash);

    // Block-counter ticker: poll getBlockNumber() once per second and update
    // the banner with blocksRemaining + elapsedMs. This runs alongside
    // waitForTransactionReceipt — viem's helper resolves on its own schedule
    // so we just need a separate ticker for the UI.
    const startedAt = Date.now();
    let receiptBlock: bigint | null = null;
    let stop = false;
    // Count consecutive RPC failures so a flaky provider escalates the UI
    // instead of silently spinning. After 3 we surface "RPC unstable —
    // retrying" so the user knows we're stuck; after 10 we give up so the
    // user can switch RPCs / try later. Reset on any successful RPC call.
    let rpcErrorStreak = 0;
    const RPC_WARN_THRESHOLD = 3;
    const RPC_GIVEUP_THRESHOLD = 10;

    const tick = async () => {
      while (!stop) {
        if (cancelTokenRef.current !== token) return;
        try {
          const current = await publicClient.getBlockNumber();
          if (receiptBlock === null) {
            try {
              const r = await publicClient.getTransactionReceipt({ hash: txHash });
              if (r?.blockNumber) receiptBlock = r.blockNumber;
            } catch {
              /* tx not yet mined — keep waiting (does not count as RPC failure) */
            }
          }
          const remaining = receiptBlock !== null
            ? Math.max(0, Number((receiptBlock + COMMIT_CONFIRMATIONS - 1n) - current))
            : undefined;
          if (cancelTokenRef.current !== token) return;
          const elapsedMs = Date.now() - startedAt;
          rpcErrorStreak = 0;
          if (recoveringRef.current) {
            setSubmitState({
              kind: "recovering",
              reason: remaining === undefined
                ? "verifying tx on-chain"
                : `waiting ${remaining} more block${remaining === 1 ? "" : "s"}`,
              txHash,
            });
          } else {
            setSubmitState({
              kind: "confirming",
              txHash,
              blocksRemaining: remaining,
              elapsedMs,
            });
          }
        } catch (err: unknown) {
          rpcErrorStreak += 1;
          if (cancelTokenRef.current !== token) return;
          if (rpcErrorStreak >= RPC_GIVEUP_THRESHOLD) {
            stop = true;
            const reason = err instanceof Error
              ? `RPC unavailable — ${err.message}`
              : "RPC unavailable — check your network and retry";
            setSubmitState({
              kind: "failed",
              reason,
              canRetry: true,
              txHash,
            });
            return;
          }
          if (rpcErrorStreak >= RPC_WARN_THRESHOLD) {
            setSubmitState({
              kind: "recovering",
              reason: `RPC unstable — retrying (${rpcErrorStreak} consecutive errors)`,
              txHash,
            });
          }
          /* otherwise: transient hiccup, keep ticking quietly */
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      }
    };
    void tick();

    try {
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: Number(COMMIT_CONFIRMATIONS),
      });
    } finally {
      stop = true;
    }
    if (cancelTokenRef.current !== token) return;

    const payload: OnChainReviewSubmitPayload = {
      score: record.normalizedScore,
      txHash,
      feedback: record.feedback,
      criteriaScores: record.criteriaScores,
      criteriaJustifications: record.criteriaJustifications,
      overallScore: record.overallScore,
      redFlagDeductions: record.redFlagDeductions,
    };

    await submitToBackendWithRetry(record.applicationId, payload, txHash, token);
    if (cancelTokenRef.current !== token) return;

    // Success — clear pending-tx storage so the next mount starts clean.
    clearPendingTx(record.applicationId, record.reviewerWallet);
    recoveringRef.current = false;
    setSubmitState({ kind: "confirmed", txHash });
    setApiResponse({
      message:
        "Vote submitted! Scores will be revealed automatically when all reviewers have voted.",
    });
    setCurrentStep(4);
    scrollContentToTop(contentRef.current);
    toast.success("Vote committed on-chain");
    // Refetch the envelope so any future re-open of this application shows
    // the receipt view via `hasCommittedReview` instead of re-rendering the
    // editable form.
    reviewState.refetch();
    onReviewSuccess?.();
  };

  // ─── Recovery from localStorage on mount ───────────────────────────────
  // If the user signed in a prior session/tab and we lost the in-memory tx
  // hash, pick it up from localStorage and resume the pipeline. Fires once
  // per opened-application when all deps are ready (publicClient + wallet
  // + commit phase signal from the parent).
  const hasResumedRef = useRef(false);
  // eslint-disable-next-line no-restricted-syntax -- gated one-shot recovery that depends on async-loaded props (commit phase, public client, wallet)
  useEffect(() => {
    if (hasResumedRef.current) return;
    if (!isOpen || isPracticeMode || isStoryLabPreview) return;
    if (!application?.id || !address || !publicClient) return;
    if (!isCommitPhase) return;
    if (submitState.kind !== "ready") return;
    const pending = loadPendingTx(application.id, address);
    if (!pending) return;
    hasResumedRef.current = true;
    const token = ++cancelTokenRef.current;
    recoveringRef.current = true;
    // Defer the React state writes off the effect tick to avoid the
    // setState-in-effect lint; behaviorally identical for the user.
    queueMicrotask(() => {
      setCommitTxHash(pending.txHash);
      setSubmitState({
        kind: "recovering",
        reason: "tx in flight — verifying with backend",
        txHash: pending.txHash,
      });
    });
    confirmAndSubmit(pending, token).catch((err: unknown) => {
      if (cancelTokenRef.current !== token) return;
      recoveringRef.current = false;
      const reason = extractApiError(err, "Recovery failed");
      // Keep the localStorage entry so the next mount can try again — see
      // item 3 in the spec ("keep the localStorage entry so the next mount
      // can attempt recovery").
      setSubmitState({
        kind: "failed",
        reason,
        canRetry: true,
        txHash: pending.txHash,
      });
      toast.error(reason);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPracticeMode, isStoryLabPreview, application?.id, address, publicClient, isCommitPhase, submitState.kind]);

  // Reset the one-shot guard when the application id changes (so opening a
  // different application can trigger recovery for it).
  // eslint-disable-next-line no-restricted-syntax -- ref reset bound to the same prop key as the form-reset effect above
  useEffect(() => {
    hasResumedRef.current = false;
  }, [application?.id]);

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
      const normalizedScore = computedOverallMax > 0
        ? Math.round((overallScore / computedOverallMax) * 100)
        : 0;
      const criteriaScores = buildCriteriaScores();
      const criteriaJustifications = buildCriteriaJustifications();

      // Retry path: a prior attempt already produced a tx hash. Skip the
      // confirmation dialog (user already consented for that score) and
      // resume from the on-chain confirmation. The on-chain commitment is
      // bound to the EXACT scores at signing time, so we MUST replay the
      // persisted record. If localStorage was cleared (incognito, manual
      // purge), the form values may have diverged from what the chain
      // accepted — submitting them would produce a hash mismatch on the BE.
      // Surface a clear "recovery data lost" error instead of silently
      // submitting divergent values.
      if (commitTxHash) {
        const token = ++cancelTokenRef.current;
        recoveringRef.current = false;
        const persisted = address ? loadPendingTx(application.id, address) : null;
        if (!persisted) {
          const reason =
            "Recovery data lost — your prior on-chain commit can't be matched to a saved score. Please refresh the page and start a new review.";
          setSubmitState({
            kind: "failed",
            reason,
            canRetry: false,
            txHash: commitTxHash,
          });
          toast.error(reason);
          return;
        }
        await confirmAndSubmit(persisted, token);
        return;
      }

      // First-time submit: stash the prepared payload and surface the
      // confirmation dialog. The actual MetaMask popup only fires after the
      // user explicitly acknowledges the commit is permanent.
      pendingCommitRef.current = {
        normalizedScore,
        criteriaScores,
        criteriaJustifications,
        feedback: feedback || undefined,
        redFlagDeductions,
        overallScore,
      };
      setIsConfirmOpen(true);
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
      // Re-pull the envelope so the next open of this application reflects
      // the just-submitted review.
      reviewState.refetch();
    } catch {
      // Error is handled by the parent via toast
    }
  };

  // Driven by the confirmation dialog. Runs the same fresh-sign + BE submit
  // pipeline that handleSubmit used to fire directly, but only after the
  // user acknowledged the commit is permanent.
  const handleConfirmCommit = async () => {
    setIsConfirmOpen(false);
    const pending = pendingCommitRef.current;
    if (!pending || !application?.id || !address) return;

    const token = ++cancelTokenRef.current;
    recoveringRef.current = false;
    // Track the freshly-signed hash locally so the failure catch below can
    // surface it without depending on stale closure state from `commitTxHash`.
    let signedTxHash: `0x${string}` | undefined;
    try {
      setSubmitState({ kind: "awaiting_signature", elapsedMs: 0 });

      // 1. Get expected commit hash from BE (server derives the salt).
      const ch = await reviewsApi.guildApplication.getCommitHash(
        application.id,
        pending.normalizedScore,
      );
      if (cancelTokenRef.current !== token) return;
      const expectedCommitHash = ch.expectedCommitHash;

      // 2. Sign on-chain.
      const txHash = await commitVote(expectedCommitHash as `0x${string}`);
      if (!txHash) {
        throw new Error("Wallet did not return a transaction hash");
      }
      const typedTxHash = txHash as `0x${string}`;

      // ─── PERSIST FIRST — order matters ─────────────────────────────────
      // The wallet has accepted the commit. Anything that throws between
      // here and savePendingTx would orphan the on-chain side. Do the
      // minimum-viable persistence steps before any other work:
      //   1. Mirror the hash into React state so the failed-state banner /
      //      retry path can surface a tx link even if the rest blows up.
      //   2. Persist the full record to localStorage so a refresh can
      //      recover the same scoring envelope.
      // Only after both are durable do we honour the cancel-token and
      // continue into confirm/submit.
      signedTxHash = typedTxHash;
      setCommitTxHash(typedTxHash);
      const record: PendingReviewTx = {
        txHash: typedTxHash,
        applicationId: application.id,
        reviewerWallet: address,
        normalizedScore: pending.normalizedScore,
        criteriaScores: pending.criteriaScores,
        criteriaJustifications: pending.criteriaJustifications,
        feedback: pending.feedback,
        redFlagDeductions: pending.redFlagDeductions,
        overallScore: pending.overallScore,
        createdAt: Date.now(),
      };
      savePendingTx(record);
      if (cancelTokenRef.current !== token) return;

      await confirmAndSubmit(record, token);
    } catch (err: unknown) {
      if (cancelTokenRef.current !== token) return;
      recoveringRef.current = false;
      if (isUserRejection(err)) {
        // User dismissed the wallet popup — return to ready, no scary banner.
        setSubmitState({ kind: "ready" });
        toast.message("Signature dismissed");
        return;
      }
      const contractErrorName = getContractErrorName(err);
      const isOnChainTerminal =
        contractErrorName !== undefined &&
        NON_RETRYABLE_CONTRACT_ERRORS.has(contractErrorName);
      const reason = err instanceof ApiError
        ? extractApiError(err, "Backend submit failed")
        : getTransactionErrorMessage(err, "On-chain commit failed");
      setSubmitState({
        kind: "failed",
        reason,
        canRetry: !isOnChainTerminal,
        // Prefer the freshly-signed hash captured in this invocation over the
        // stale closure value of `commitTxHash` — this is what makes the
        // failed-state View tx / Copy buttons work even when the throw
        // happens immediately after sign.
        txHash: signedTxHash ?? commitTxHash ?? undefined,
      });
      toast.error(reason);
    }
  };

  // ─── Awaiting-signature elapsed-ms ticker ──────────────────────────────
  // Drives the 30s nudge / 90s cancel escalation in the banner.
  // eslint-disable-next-line no-restricted-syntax -- timer keyed off submitState.kind, internal to the modal pipeline
  useEffect(() => {
    if (submitState.kind !== "awaiting_signature") return;
    const startedAt = Date.now() - (submitState.elapsedMs ?? 0);
    const id = setInterval(() => {
      setSubmitState((prev) =>
        prev.kind === "awaiting_signature"
          ? { kind: "awaiting_signature", elapsedMs: Date.now() - startedAt }
          : prev,
      );
    }, 1000);
    return () => clearInterval(id);
    // We intentionally restart the ticker only when the kind transitions to
    // awaiting_signature; tracking elapsedMs would re-create it every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitState.kind]);

  const handleCancelAwaiting = () => {
    // Only safe to clear localStorage when there is NO on-chain commitment
    // yet — i.e. we're still waiting for the wallet signature. After the
    // wallet returns a hash (confirming / recovering), the chain has
    // accepted the commit; clearing localStorage at that point would orphan
    // the tx and the next mount couldn't recover it without the orphan
    // listener. Bump the cancel token either way so any in-flight async
    // pipeline stops writing state.
    const wasAwaitingSignature = submitState.kind === "awaiting_signature";
    cancelTokenRef.current += 1;
    recoveringRef.current = false;
    setSubmitState({ kind: "ready" });
    if (wasAwaitingSignature) {
      if (application?.id && address) {
        clearPendingTx(application.id, address);
      }
    } else {
      toast.message(
        "Your on-chain commit is still pending — reopen this review to resume.",
      );
    }
  };

  const handleRetry = () => {
    // If we have a tx hash from a prior signing attempt, the next submit
    // will reuse it (see commitTxHash branch in handleSubmit). Otherwise
    // the user starts a fresh signing flow. Either way, return to ready.
    setSubmitState({ kind: "ready" });
  };

  // Resume CTA after a `failed → retry` cycle. When `commitTxHash` is set
  // and we're back to `ready`, the inline ResumePrompt fires this directly
  // so the user doesn't need to scroll to the bottom Submit button.
  const handleResume = () => {
    void handleSubmit();
  };

  const isCommitting =
    submitState.kind === "awaiting_signature" ||
    submitState.kind === "confirming" ||
    submitState.kind === "recovering";

  // The on-chain commit is bound to the EXACT scores at signing time. While
  // a tx hash exists locally and the BE submit hasn't completed, freezing the
  // form prevents the user from editing values that diverge from what the
  // chain accepted. Once `confirmed` (success) the modal switches to the
  // ReviewSuccessStep view and this gate no longer applies.
  const formLocked =
    !isPracticeMode &&
    !isStoryLabPreview &&
    commitTxHash !== null &&
    submitState.kind !== "confirmed";

  // ─── "Saved · 3s ago" tick ─────────────────────────────────────────────
  // The `saved` indicator shows relative time; we tick a "now" timestamp
  // into state every 5s while in the saved state. Storing the snapshot in
  // state (vs reading Date.now() in render) keeps the memo pure per React's
  // hook-purity rule.
  const [nowSnapshot, setNowSnapshot] = useState<number>(() => Date.now());
  // eslint-disable-next-line no-restricted-syntax -- timer for the relative-time copy on the save indicator
  useEffect(() => {
    if (draftSaveStatus.kind !== "saved") return;
    // Defer initial sync so we don't trigger setState-in-effect; the next
    // microtask runs before paint, so users see no perceivable delay.
    queueMicrotask(() => setNowSnapshot(Date.now()));
    const id = setInterval(() => {
      setNowSnapshot(Date.now());
    }, 5000);
    return () => clearInterval(id);
  }, [draftSaveStatus.kind]);

  const savedAgoLabel = useMemo(() => {
    if (draftSaveStatus.kind !== "saved") return null;
    const seconds = Math.max(0, Math.round((nowSnapshot - draftSaveStatus.at) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m ago`;
  }, [draftSaveStatus, nowSnapshot]);

  // All hooks above this line MUST run unconditionally — Rules of Hooks.
  // Bail-out renders are only safe past this point.
  if (!application || !isOpen) return null;

  // ─── Envelope-driven full-modal gates ──────────────────────────────────
  // These render BEFORE the form steps so there's no "flash of editable
  // form" before the BE state resolves into "you can't review this".
  if (isExplicitlyNotAssigned) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={canClose ? handleCloseWithFlush : undefined}
        />
        <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
          <div
            className="relative w-full max-w-md flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Not assigned</h2>
              <button
                onClick={handleCloseWithFlush}
                aria-label="Close review modal"
                className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                You&apos;re not assigned to review this application. Only panel
                members chosen during random reviewer selection can submit a
                review.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={canClose ? handleCloseWithFlush : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className="relative w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-border" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-4">
              {/* Variant-tinted head icon: sky for candidate review, gold for
                  expert membership review. Matches the mock's head-icon
                  styling and gives the user an at-a-glance signal of which
                  flow they're in. */}
              <div
                className={`hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shrink-0 border ${
                  reviewTypeProp === "candidate"
                    ? "bg-info/10 border-info/25 text-info"
                    : "bg-warning/10 border-warning/25 text-warning"
                }`}
                aria-hidden="true"
              >
                {reviewTypeProp === "candidate" ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-2">
                  <span>
                    {isPracticeMode
                      ? "Practice review"
                      : reviewTypeProp === "candidate"
                        ? "Candidate review"
                        : "Expert application"}
                  </span>
                  {!isPracticeMode && reviewTypeProp !== "candidate" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-warning/10 border border-warning/25 text-warning">
                      Members only
                    </span>
                  )}
                </p>
                <h2 className="text-xl font-bold text-foreground">
                  {isPracticeMode ? "Practice Review" : proposalContext ? "Review Candidate" : reviewTypeProp === "candidate" ? "Review Candidate Application" : "Review Expert Application"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isPracticeMode || isStoryLabPreview
                    ? "Sandbox practice sample / synthetic applicant"
                    : reviewTypeProp === "candidate"
                      ? "Outcome is computed from rubric scores via IQR consensus across all reviewers."
                      : "Membership outcome is computed from rubric scores via IQR consensus across all assigned members."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Save indicator — surfaces the auto-save state machine so the
                  reviewer always knows their work is on the server. */}
              {shouldHydrateDraft && draftHydrated && draftSaveStatus.kind !== "idle" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground select-none"
                >
                  {draftSaveStatus.kind === "saving" && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  )}
                  {draftSaveStatus.kind === "saved" && (
                    <>
                      <Check className={`w-3.5 h-3.5 ${STATUS_COLORS.positive.icon}`} />
                      <span>Saved · {savedAgoLabel}</span>
                    </>
                  )}
                  {draftSaveStatus.kind === "failed" && (
                    <>
                      <CloudOff className={`w-3.5 h-3.5 ${STATUS_COLORS.negative.icon}`} />
                      <span title={draftSaveStatus.reason} className={STATUS_COLORS.negative.text}>
                        Save failed
                      </span>
                      <button
                        type="button"
                        onClick={() => void flushDraftNow()}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] hover:bg-muted/40 transition-colors"
                        aria-label="Retry save"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
              {canClose && (
                <button
                  onClick={handleCloseWithFlush}
                  aria-label="Close review modal"
                  className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  {...(isStoryLabPreview ? dataTourTarget(TOUR_TARGETS.practiceReviewCloseButton) : {})}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div ref={contentRef} className="relative flex-1 overflow-hidden">
            {/* If the BE envelope already says we've committed, jump to the
                receipt step. Survives a refresh after a successful commit
                even if the local `currentStep === 4` was lost. Renders as
                full-width single column. */}
            {hasAlreadyCommitted ? (
              <div className="px-6 py-5 overflow-y-auto h-full">
                <StepIndicator currentStep={4} />
                <Alert variant="info">
                  You&apos;ve already committed your vote on this review. Below
                  is your receipt; the on-chain link is available once the
                  reveal phase begins.
                </Alert>
                <ReviewSuccessStep
                  isCommitPhase
                  apiResponse={{
                    message:
                      "Vote committed on-chain. Scores will be revealed automatically when all reviewers have voted.",
                  }}
                  generalTotal={generalTotal}
                  generalMax={generalMax}
                  topicTotal={topicTotal}
                  topicMax={topicMax}
                  redFlagDeductions={redFlagDeductions}
                  overallScore={overallScore}
                  commitTxHash={
                    reviewState.envelope.onChainCommitTxHash ?? commitTxHash
                  }
                  isPracticeMode={false}
                  practiceActions={undefined}
                />
              </div>
            ) : renderStep === 4 ? (
              /* Success step renders full-width — no need for the 3-col workspace. */
              <div className="px-6 py-5 overflow-y-auto h-full">
                <StepIndicator currentStep={renderStep} />
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
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_400px] h-full">
              {/* LEFT RAIL — vertical stepper */}
              <aside className="hidden lg:block border-r border-border bg-muted/[0.02] overflow-y-auto">
                <VerticalStepRail
                  currentStep={renderStep}
                  onStepClick={(target) => {
                    // Allow free navigation to any prior step; forward-jump is
                    // gated by the existing validation pipeline (handleNext).
                    if (target < currentStep) setCurrentStep(target);
                    else if (target === currentStep + 1) handleNext();
                  }}
                  isCommitPhase={isCommitPhase}
                  variant={reviewTypeProp === "candidate" ? "candidate" : "expert"}
                />
              </aside>

              {/* CENTER — persistent applicant materials */}
              <section className="overflow-y-auto px-6 py-5 border-r border-border">
                {/* Mobile fallback: show the horizontal stepper since the
                    left rail is hidden on small screens. */}
                <div className="lg:hidden mb-4">
                  <StepIndicator currentStep={renderStep} />
                </div>
                <ReviewProfileStep
                  application={application}
                  level={level}
                  reviewScope={
                    proposalContext
                      ? "application"
                      : reviewTypeProp === "candidate"
                        ? "candidateApplication"
                        : "expertApplication"
                  }
                />
              </section>

              {/* RIGHT PANE — current step's form / rubric */}
              <section className="overflow-y-auto px-5 py-5 bg-muted/[0.02]">

            {templateError && (
              <Alert variant="error">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 min-w-0">{templateError}</span>
                  <button
                    type="button"
                    onClick={() => void loadTemplates()}
                    disabled={loadingTemplates}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingTemplates ? "animate-spin" : ""}`} />
                    Retry
                  </button>
                </div>
              </Alert>
            )}
            {loadingTemplates && (
              <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-warning/[0.06] border border-warning/15">
                <Loader2 className="w-4 h-4 text-warning animate-spin" />
                <p className="text-sm text-primary/80">Loading review template and rubric...</p>
              </div>
            )}

            {formLocked && (
              <Alert variant="info">
                On-chain commit is bound to your previous score — fields are
                locked. Cancel the commit (above) to start over with fresh
                values.
              </Alert>
            )}
            {renderStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-4">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.08em] mb-1">
                    Step 1 · Review materials
                  </p>
                  <p className="text-sm text-foreground font-semibold mb-1">
                    Read the applicant&apos;s profile.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Take your time with the resume, responses, and references on
                    the left. When you&apos;re ready to score, click{" "}
                    <strong className="text-foreground">Next</strong> or jump to
                    a rubric section using the left rail.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Start scoring →
                </button>
              </div>
            )}
            {renderStep === 2 && (
              <fieldset
                disabled={formLocked}
                aria-disabled={formLocked || undefined}
                className={formLocked ? "opacity-60 pointer-events-none" : undefined}
              >
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
              </fieldset>
            )}
            {renderStep === 3 && (
              <>
                <fieldset
                  disabled={formLocked}
                  aria-disabled={formLocked || undefined}
                  className={formLocked ? "opacity-60 pointer-events-none" : undefined}
                >
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
                </fieldset>
                {isCommitPhase && (
                  <div
                    className="mt-4 space-y-3"
                    {...(isStoryLabPreview
                      ? dataTourTarget(TOUR_TARGETS.practiceReviewTxStatus)
                      : {})}
                  >
                    {/* Show the inline explainer only before the commit flow
                        engages — once we're asking for confirmation or
                        signing/confirming/etc., the CommitFlowPanel itself
                        carries the visual weight and the explainer becomes
                        noise. */}
                    {banner.kind === "ready" && !isConfirmOpen && (
                      <CommitRevealExplainer />
                    )}
                    {/* Phase 3: cron-driven session creation failed or was
                        abandoned. Replace the spinner with an actionable
                        error + retry surface so reviewers aren't stuck. */}
                    {sessionCreationFailed && blockchainSession && (
                      <SessionFailureBanner
                        info={blockchainSession}
                        onRetry={handleRetrySessionCreation}
                        isRetrying={sessionRetryApi.isLoading}
                      />
                    )}
                    {/* Phase 3: stuck-pending warning. Surfaced under the
                        normal preparing banner once the cron has been
                        chewing on this for >3 minutes. */}
                    {!sessionCreationFailed &&
                      banner.kind === "preparing_session" &&
                      showSessionSlowWarning && (
                        <Alert variant="warning">
                          Session creation is taking longer than usual. The
                          on-chain transaction may be congested.
                        </Alert>
                      )}
                    {/* Once the on-chain commit confirms, ReviewSuccessStep
                        (step 4) becomes the single source of truth for the
                        success view — suppress the CommitFlowPanel's inline
                        SuccessCard so the user doesn't see two stacked
                        confirmations during the brief transition.
                        We also suppress the panel entirely when session
                        creation has failed — the SessionFailureBanner above
                        owns the surface. */}
                    {banner.kind !== "confirmed" && !sessionCreationFailed && (
                      <CommitFlowPanel
                        status={banner}
                        confirmState={
                          isConfirmOpen
                            ? "asking"
                            : commitTxHash && banner.kind === "ready"
                              ? "resuming"
                              : "idle"
                        }
                        applicantName={application?.fullName}
                        applicantLevel={application?.expertiseLevel ?? ""}
                        score={overallScore}
                        scoreMax={(generalMax || 0) + (topicMax || 0)}
                        onConfirm={handleConfirmCommit}
                        onCancelConfirm={() => {
                          setIsConfirmOpen(false);
                          pendingCommitRef.current = null;
                        }}
                        onRetry={handleRetry}
                        onResume={handleResume}
                        onCancelAwaiting={handleCancelAwaiting}
                        sessionId={blockchainSessionId}
                        resumeTxHash={commitTxHash ?? undefined}
                        commitConfirmations={Number(COMMIT_CONFIRMATIONS)}
                      />
                    )}
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
                <fieldset
                  disabled={formLocked}
                  aria-disabled={formLocked || undefined}
                  className={formLocked ? "opacity-60 pointer-events-none" : undefined}
                >
                  {/* Eligibility note replaces the legacy per-review stake
                      input. Review eligibility comes from a one-time guild
                      stake; per-candidate endorsement staking is a separate
                      optional flow that runs after consensus. The story-lab
                      tour's old "stake input" stop now anchors here via its
                      fallback target. */}
                  <div
                    className="mt-6"
                    {...dataTourTarget(TOUR_TARGETS.practiceReviewStakeInput)}
                  >
                    <EligibilityNote
                      variant={reviewTypeProp === "candidate" ? "candidate" : "expert"}
                    />
                  </div>
                  <ReviewSubmitSection />
                </fieldset>
              </>
            )}

            {validationError && (
              <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl ${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.border}`}>
                <XCircle className={`w-4 h-4 ${STATUS_COLORS.negative.icon} shrink-0`} />
                <p className={`text-sm ${STATUS_COLORS.negative.text}`}>{validationError}</p>
              </div>
            )}
              </section>
            </div>
            )}
          </div>

          {/* Navigation */}
          <div className="border-t border-border px-7 py-5">
            <ReviewNavigation
              // When the envelope says we've already committed, force step 4
              // so the navigation collapses to a single Done button.
              currentStep={hasAlreadyCommitted ? 4 : currentStep}
              isReviewing={isReviewing}
              isCommitting={isCommitting}
              isCommitPhase={isCommitPhase}
              onClose={handleCloseWithFlush}
              onNext={handleNext}
              onBack={handleBack}
              onSubmit={handleSubmit}
              canClose={canClose}
              submitLabel={isPracticeMode ? completionActionLabel ?? "Complete Practice Review" : undefined}
              // Lock the bottom Submit button while the inline confirmation
              // panel owns the surface — the user should be acting on the
              // panel's Cancel / Sign buttons, not the navigation footer.
              submitDisabled={isConfirmOpen}
              submitDisabledTooltip={isConfirmOpen ? "Confirm above to sign" : undefined}
              // While the inline ConfirmAsk owns Cancel + Sign, OR while we're
              // signing/confirming on-chain (CommitFlowPanel's progress rail
              // owns the surface), collapse the footer to a minimal state so
              // the user only sees one submit affordance at a time.
              confirmingInline={isConfirmOpen || isCommitting}
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

// ─── Phase 3: session-creation failure banner ───────────────────────────
// Rendered above the CommitFlowPanel when the BE reports the on-chain
// `create_vetting_session` op as failed/abandoned. Covers three concerns:
//   1. Tell the user what failed (errorCode + raw message).
//   2. For known stake-related codes, add a hint that this is a backend
//      issue and not the reviewer's mistake.
//   3. Offer a "Retry session creation" button that POSTs to
//      `/api/experts/guild-applications/:id/retry-session`.
//
// Implementation note: we deliberately use the shared `<Alert>` primitive
// rather than building a bespoke surface (per project CLAUDE.md). The retry
// button lives inside the alert body as a small inline action.
const SESSION_FAILURE_KNOWN_HINTS: Record<string, string> = {
  InsufficientUnlockedStake:
    "Reviewer panel could not be locked on-chain. Please contact support — this is a backend issue, not your fault.",
  NotGuildMember:
    "Reviewer panel could not be locked on-chain. Please contact support — this is a backend issue, not your fault.",
  InsufficientPanelistStake:
    "Reviewer panel could not be locked on-chain. Please contact support — this is a backend issue, not your fault.",
};

function SessionFailureBanner({
  info,
  onRetry,
  isRetrying,
}: {
  info: BlockchainSessionInfo;
  onRetry: () => void | Promise<unknown>;
  isRetrying: boolean;
}) {
  const codeLabel = info.errorCode || "Unknown error";
  const knownHint = info.errorCode ? SESSION_FAILURE_KNOWN_HINTS[info.errorCode] : undefined;
  return (
    <Alert variant="error">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            On-chain session creation {info.status === "abandoned" ? "abandoned" : "failed"}
          </span>
          <code className="px-1.5 py-0.5 text-xs rounded bg-destructive/15 font-mono">
            {codeLabel}
          </code>
          {info.attemptCount > 0 && (
            <span className="text-xs opacity-70">
              ({info.attemptCount} {info.attemptCount === 1 ? "attempt" : "attempts"})
            </span>
          )}
        </div>
        {info.errorMessage && (
          <p className="text-xs break-words opacity-80">{info.errorMessage}</p>
        )}
        {knownHint && <p className="text-xs">{knownHint}</p>}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              void onRetry();
            }}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-destructive/40 hover:text-destructive text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying…" : "Retry session creation"}
          </button>
        </div>
      </div>
    </Alert>
  );
}
