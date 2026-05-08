"use client";

import { useState, useId } from "react";
import {
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  Copy,
  ShieldCheck,
  PenLine,
  Clock,
  CircleDot,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { OnChainStatus } from "@/components/reviews/OnChainStatusBanner";

const explorerTxUrl = (base: string, hash: string) => `${base}/tx/${hash}`;
const truncateHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

export interface CommitFlowPanelProps {
  /** Current on-chain submit state. Drives the active stage of the flow. */
  status: OnChainStatus;
  /**
   * Optional confirmation mode toggle.
   *  - `"asking"` — initial pre-sign confirmation card.
   *  - `"resuming"` — a previous attempt produced an on-chain commit but the
   *    BE submit hasn't completed yet. Render a single "Resume previous
   *    commit" CTA so the user doesn't need to scroll back to the footer.
   */
  confirmState?: "idle" | "asking" | "resuming";
  /** Applicant whose vote we're committing. */
  applicantName?: string;
  /** Applicant level/badge text. */
  applicantLevel?: string;
  /** Score being committed. */
  score?: number;
  /** Maximum possible score for the X / Y display. */
  scoreMax?: number;

  /** Confirm handler — only used when `confirmState === "asking"`. */
  onConfirm?: () => void;
  /** Cancel handler — only used when `confirmState === "asking"`. */
  onCancelConfirm?: () => void;

  /** Retry the current step (used in `failed` state). */
  onRetry?: () => void;
  /** Resume the prior on-chain commit (used when `confirmState === "resuming"`). */
  onResume?: () => void;
  /** Cancel an awaiting-signature step. */
  onCancelAwaiting?: () => void;

  /** Sepolia/etc. explorer base URL for tx links. */
  explorerBase?: string;
  /** Optional bytes32 session id rendered as a debug pill in the success card. */
  sessionId?: string;
  /** Tx hash of a prior on-chain commit, surfaced in the resume CTA. */
  resumeTxHash?: string;
  /**
   * Number of block confirmations the modal waits for after the commit tx
   * lands. Default 1 — keep in sync with the modal's COMMIT_CONFIRMATIONS so
   * the BlockBar shows the correct denominator if that constant changes.
   */
  commitConfirmations?: number;
}

/**
 * Single coherent in-modal commit flow. Replaces:
 *   - the OnChainStatusBanner (small status pill that buried context)
 *   - the ReviewCommitConfirmDialog (modal-in-modal that broke focus)
 *
 * Stages (all visible in one component, animated between):
 *   1. ASKING — inline "you're about to commit" card with score recap + "I
 *      understand this is permanent" checkbox + Cancel / Confirm + Sign.
 *   2. PROGRESS — 3-step pill rail (Sign → Confirm → Recorded), each pill
 *      transitioning dot → spinner → green check as the state advances.
 *      Live tx hash + block counter + cancel/retry below.
 *   3. SUCCESS — celebratory full-width card with big check, score recap,
 *      Etherscan receipt link.
 *   4. FAILURE — distinct red card with reason, retry + copy-tx affordances.
 */
export function CommitFlowPanel({
  status,
  confirmState = "idle",
  applicantName,
  applicantLevel,
  score,
  scoreMax,
  onConfirm,
  onCancelConfirm,
  onRetry,
  onResume,
  onCancelAwaiting,
  explorerBase = "https://sepolia.etherscan.io",
  sessionId,
  resumeTxHash,
  commitConfirmations = 1,
}: CommitFlowPanelProps) {
  // ─── Inline confirmation card ─────────────────────────────────────────
  if (confirmState === "asking" && status.kind === "ready") {
    return (
      <ConfirmAsk
        applicantName={applicantName ?? ""}
        applicantLevel={applicantLevel ?? ""}
        score={score ?? 0}
        scoreMax={scoreMax ?? 0}
        onConfirm={onConfirm}
        onCancel={onCancelConfirm}
      />
    );
  }

  // ─── Resume previous on-chain commit ───────────────────────────────────
  // After a `failed` → `handleRetry` cycle, status flips back to `ready` but
  // a tx hash is still bound to the form. Surface a single CTA so the user
  // doesn't need to scroll to the footer.
  if (confirmState === "resuming" && status.kind === "ready") {
    return (
      <ResumePrompt
        txHash={resumeTxHash}
        explorerBase={explorerBase}
        onResume={onResume}
      />
    );
  }

  // ─── Confirmed (success celebration) ──────────────────────────────────
  if (status.kind === "confirmed") {
    return (
      <SuccessCard
        txHash={status.txHash}
        applicantName={applicantName}
        score={score}
        scoreMax={scoreMax}
        explorerBase={explorerBase}
        sessionId={sessionId}
      />
    );
  }

  // ─── Failed ───────────────────────────────────────────────────────────
  if (status.kind === "failed") {
    return (
      <FailureCard
        reason={status.reason}
        canRetry={status.canRetry}
        txHash={status.txHash}
        onRetry={onRetry}
        explorerBase={explorerBase}
      />
    );
  }

  // ─── Pre-flight (preparing on-chain session) ──────────────────────────
  if (status.kind === "preparing_session") {
    return (
      <PrepBanner
        attempt={status.attempt}
        lastError={status.lastError}
      />
    );
  }

  // saving_draft is owned by the form's persistence indicator, not this
  // commit-flow surface — stay silent.
  if (status.kind === "saving_draft") {
    return null;
  }

  // Idle "ready" state with no asking — let the explainer + Submit button
  // own the surface. Showing all-pending stages here would be visual noise.
  if (status.kind === "ready") {
    return null;
  }

  // ─── Active progress: awaiting / confirming / recovering ──────────────
  return (
    <ProgressRail
      status={status}
      onCancelAwaiting={onCancelAwaiting}
      explorerBase={explorerBase}
      commitConfirmations={commitConfirmations}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ASK — inline pre-sign confirmation card
// ─────────────────────────────────────────────────────────────────────────
function ConfirmAsk({
  applicantName,
  applicantLevel,
  score,
  scoreMax,
  onConfirm,
  onCancel,
}: {
  applicantName: string;
  applicantLevel: string;
  score: number;
  scoreMax: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  // `acked` resets naturally because the parent (`CommitFlowPanel`) only
  // mounts `ConfirmAsk` while `confirmState === "asking" && status.kind ===
  // "ready"`; flipping out of that branch unmounts the component and the
  // next entry initialises a fresh `useState(false)`.
  const [acked, setAcked] = useState(false);
  const ackId = useId();

  const safeMax = Math.max(0, scoreMax);
  const safeScore = Math.max(0, Math.min(score, safeMax > 0 ? safeMax : score));
  const pct = safeMax > 0 ? Math.round((safeScore / safeMax) * 100) : 0;

  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.06] to-transparent p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="w-4 h-4" />
        <h4 className="text-xs font-bold uppercase tracking-wider">Confirm your commitment</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
            Applicant
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {applicantName || "—"}
            </p>
            {applicantLevel && (
              <span className="px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0">
                {applicantLevel}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
            Final score
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground tabular-nums leading-none">
              {safeScore}
            </span>
            {safeMax > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                / {safeMax}
              </span>
            )}
            {safeMax > 0 && (
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums font-medium">
                {pct}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border p-3 flex items-start gap-3 text-sm",
          STATUS_COLORS.warning.border,
          STATUS_COLORS.warning.bgSubtle,
        )}
      >
        <AlertTriangle
          className={cn("w-4 h-4 mt-0.5 shrink-0", STATUS_COLORS.warning.icon)}
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="font-bold text-foreground">This vote is permanent.</p>
          <p className="text-muted-foreground text-xs">
            Once signed, your commitment is recorded on-chain and cannot be changed.
            You&apos;ll need to reveal this exact score during the reveal phase.
          </p>
        </div>
      </div>

      <label
        htmlFor={ackId}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200",
          acked
            ? `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle}`
            : "border-border bg-muted/30 hover:bg-muted/40",
        )}
      >
        <input
          id={ackId}
          type="checkbox"
          checked={acked}
          onChange={(e) => setAcked(e.target.checked)}
          className="h-4 w-4 rounded border-border bg-card accent-primary"
        />
        <span className="text-sm text-foreground select-none flex-1">
          I understand this commitment is final.
        </span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!acked}
          aria-disabled={!acked || undefined}
          className="flex-[2] py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          Sign Commit Vote
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PROGRESS — three-step rail
// ─────────────────────────────────────────────────────────────────────────
type StageState = "pending" | "active" | "done";

function ProgressRail({
  status,
  onCancelAwaiting,
  explorerBase,
  commitConfirmations,
}: {
  status: Extract<
    OnChainStatus,
    { kind: "awaiting_signature" | "confirming" | "recovering" | "ready" }
  >;
  onCancelAwaiting?: () => void;
  explorerBase: string;
  commitConfirmations: number;
}) {
  const k = status.kind;

  // Stage map:
  //   sign     — awaiting_signature is active; confirmed when txHash present
  //   confirm  — confirming is active; done once kind === "confirmed"
  //   recorded — only "active" briefly between BE submit and `confirmed`
  let signState: StageState = "pending";
  let confirmStageState: StageState = "pending";
  const recordedState: StageState = "pending";
  let activeLabel = "Ready to sign";
  let elapsedSec = 0;
  let txHash: string | undefined;
  let blocksRemaining: number | undefined;

  if (k === "awaiting_signature") {
    signState = "active";
    activeLabel = "Awaiting wallet signature";
    elapsedSec = Math.floor((status.elapsedMs ?? 0) / 1000);
  } else if (k === "confirming") {
    signState = "done";
    confirmStageState = "active";
    activeLabel = "Confirming on Sepolia";
    txHash = status.txHash;
    blocksRemaining = status.blocksRemaining;
    elapsedSec = Math.floor((status.elapsedMs ?? 0) / 1000);
  } else if (k === "recovering") {
    signState = "done";
    confirmStageState = "active";
    activeLabel = "Recovering prior session";
    txHash = status.txHash;
  } else if (k === "ready") {
    // Idle, no progress yet — render an unstyled placeholder
  }

  const showCancel =
    k === "awaiting_signature" && elapsedSec >= 30 && !!onCancelAwaiting;
  const nudge =
    k === "awaiting_signature" && elapsedSec >= 30
      ? "Still waiting — check your MetaMask popup"
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {activeLabel}
        </h4>
        {elapsedSec > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {elapsedSec}s elapsed
          </span>
        )}
      </div>

      <Stages
        sign={signState}
        confirmStage={confirmStageState}
        recorded={recordedState}
      />

      {/* Subtext: tx + block progress + cancel */}
      <div className="space-y-2">
        {nudge && (
          <p className="text-xs text-muted-foreground">
            {nudge}
          </p>
        )}
        {blocksRemaining !== undefined && blocksRemaining > 0 && (
          <BlockBar
            blocksRemaining={blocksRemaining}
            totalBlocks={Math.max(1, commitConfirmations)}
          />
        )}
        {txHash && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <a
              href={explorerTxUrl(explorerBase, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              tx {truncateHash(txHash)}
              <ExternalLink className="w-3 h-3" />
            </a>
            {showCancel && onCancelAwaiting && (
              <button
                type="button"
                onClick={onCancelAwaiting}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive font-medium transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        )}
        {!txHash && showCancel && onCancelAwaiting && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancelAwaiting}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive font-medium transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel signature
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stages({
  sign,
  confirmStage,
  recorded,
}: {
  sign: StageState;
  confirmStage: StageState;
  recorded: StageState;
}) {
  return (
    <div className="flex items-center gap-2">
      <Pill state={sign} icon={<PenLine className="w-3.5 h-3.5" />} label="Sign" />
      <Connector lit={sign === "done"} />
      <Pill state={confirmStage} icon={<Clock className="w-3.5 h-3.5" />} label="Confirm" />
      <Connector lit={confirmStage === "done"} />
      <Pill state={recorded} icon={<Check className="w-3.5 h-3.5" />} label="Record" />
    </div>
  );
}

function Pill({
  state,
  icon,
  label,
}: {
  state: StageState;
  icon: React.ReactNode;
  label: string;
}) {
  const palette =
    state === "done"
      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
      : state === "active"
        ? "bg-primary/10 border-primary/40 text-primary"
        : "bg-muted/30 border-border/60 text-muted-foreground";

  const iconNode =
    state === "done" ? (
      <Check className="w-3.5 h-3.5" />
    ) : state === "active" ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ) : (
      <CircleDot className="w-3.5 h-3.5" />
    );
  // The label icon is unused when active/done — we lean on the universal status icon instead.
  void icon;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all duration-300",
        palette,
      )}
    >
      {iconNode}
      <span>{label}</span>
    </div>
  );
}

function Connector({ lit }: { lit: boolean }) {
  return (
    <div
      className={cn(
        "h-px flex-1 transition-colors duration-500",
        lit ? "bg-emerald-500/40" : "bg-border/60",
      )}
    />
  );
}

function BlockBar({
  blocksRemaining,
  totalBlocks,
}: {
  blocksRemaining: number;
  totalBlocks: number;
}) {
  const done = Math.max(0, totalBlocks - blocksRemaining);
  const pct = Math.min(100, Math.round((done / totalBlocks) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Block confirmations</span>
        <span className="tabular-nums font-medium">
          {done} / {totalBlocks}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SUCCESS — celebratory inline card
// ─────────────────────────────────────────────────────────────────────────
function SuccessCard({
  txHash,
  applicantName,
  score,
  scoreMax,
  explorerBase,
  sessionId,
}: {
  txHash: string;
  applicantName?: string;
  score?: number;
  scoreMax?: number;
  explorerBase: string;
  sessionId?: string;
}) {
  const safeMax = Math.max(0, scoreMax ?? 0);
  const safeScore = Math.max(0, Math.min(score ?? 0, safeMax > 0 ? safeMax : (score ?? 0)));

  return (
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-6 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-500" strokeWidth={3} />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">Vote committed on-chain</h3>
        <p className="text-sm text-muted-foreground">
          Your commitment is recorded. You&apos;ll be prompted to reveal your score
          when the commit phase ends.
        </p>
      </div>

      {applicantName && (
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border text-sm">
          <span className="text-muted-foreground">{applicantName}</span>
          {safeMax > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="font-bold text-foreground tabular-nums">
                {safeScore} / {safeMax}
              </span>
            </>
          )}
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
        <a
          href={explorerTxUrl(explorerBase, txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 hover:text-primary transition-colors font-medium"
        >
          View receipt
          <ExternalLink className="w-3 h-3" />
        </a>
        <span className="text-muted-foreground/60 font-mono">
          {truncateHash(txHash)}
        </span>
        {sessionId && (
          <span className="text-muted-foreground/40 font-mono hidden sm:inline">
            session {truncateHash(sessionId)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FAILURE — distinct red card
// ─────────────────────────────────────────────────────────────────────────
function FailureCard({
  reason,
  canRetry,
  txHash,
  onRetry,
  explorerBase,
}: {
  reason: string;
  canRetry: boolean;
  txHash?: string;
  onRetry?: () => void;
  explorerBase: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 space-y-3",
        STATUS_COLORS.negative.border,
        STATUS_COLORS.negative.bgSubtle,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn("w-5 h-5 mt-0.5 shrink-0", STATUS_COLORS.negative.icon)}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className={cn("font-bold text-sm", STATUS_COLORS.negative.text)}>
            Commit failed
          </h4>
          <p className="text-sm text-foreground/80 break-words">{reason}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {canRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:text-primary text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        )}
        {txHash && (
          <>
            <a
              href={explorerTxUrl(explorerBase, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:text-primary text-xs font-medium transition-colors"
            >
              View tx
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(txHash).then(
                  () => toast.success("Tx hash copied"),
                  () => toast.error("Could not copy tx hash"),
                );
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:text-primary text-xs font-medium transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RESUME — prior on-chain commit awaiting BE submit
// ─────────────────────────────────────────────────────────────────────────
function ResumePrompt({
  txHash,
  explorerBase,
  onResume,
}: {
  txHash?: string;
  explorerBase: string;
  onResume?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 space-y-3",
        STATUS_COLORS.warning.border,
        STATUS_COLORS.warning.bgSubtle,
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className={cn("w-5 h-5 mt-0.5 shrink-0", STATUS_COLORS.warning.icon)}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="font-bold text-sm text-foreground">
            Previous commit pending
          </h4>
          <p className="text-sm text-muted-foreground">
            Your on-chain vote was already signed. Resume to finish recording
            it on the backend — no new signature is required.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {onResume && (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Resume previous commit
          </button>
        )}
        {txHash && (
          <a
            href={explorerTxUrl(explorerBase, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:text-primary text-xs font-medium transition-colors font-mono"
          >
            tx {truncateHash(txHash)}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PREP — preparing on-chain session (cron-driven)
// ─────────────────────────────────────────────────────────────────────────
function PrepBanner({ attempt, lastError }: { attempt?: number; lastError?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center gap-3 text-sm",
        STATUS_COLORS.warning.border,
        STATUS_COLORS.warning.bgSubtle,
      )}
    >
      <Loader2 className={cn("w-4 h-4 animate-spin", STATUS_COLORS.warning.icon)} />
      <span className="flex-1">
        Preparing on-chain session…
        {attempt !== undefined && attempt > 1 && (
          <span className="ml-2 text-xs opacity-70">attempt {attempt}</span>
        )}
        {lastError && (
          <span className="ml-2 text-xs opacity-70 truncate max-w-md">
            {lastError}
          </span>
        )}
      </span>
    </div>
  );
}
