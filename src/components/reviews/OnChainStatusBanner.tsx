"use client";

import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, Save } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";

export type OnChainStatus =
  | { kind: "saving_draft" }
  | { kind: "ready" }
  | { kind: "preparing_session"; attempt?: number; lastError?: string }
  | { kind: "awaiting_signature" }
  | { kind: "confirming"; txHash: string; blocksRemaining?: number }
  | { kind: "confirmed"; txHash: string }
  | { kind: "recovering"; reason: string }
  | { kind: "failed"; reason: string; canRetry: boolean };

interface Props {
  status: OnChainStatus;
  sessionId?: string;
  explorerBase?: string; // default https://sepolia.etherscan.io
  onRetry?: () => void;
}

const explorerTxUrl = (base: string, hash: string) => `${base}/tx/${hash}`;

export function OnChainStatusBanner({
  status,
  sessionId,
  explorerBase = "https://sepolia.etherscan.io",
  onRetry,
}: Props) {
  const k = status.kind;

  if (k === "saving_draft") {
    return (
      <Row palette={STATUS_COLORS.info} icon={<Save className="w-4 h-4 animate-pulse" />}>
        Saving draft…
      </Row>
    );
  }
  if (k === "ready") {
    return (
      <Row palette={STATUS_COLORS.positive} icon={<CheckCircle2 className="w-4 h-4" />}>
        On-chain session ready
        {sessionId && <Mono>{truncate(sessionId)}</Mono>}
      </Row>
    );
  }
  if (k === "preparing_session") {
    return (
      <Row palette={STATUS_COLORS.warning} icon={<Loader2 className="w-4 h-4 animate-spin" />}>
        Preparing on-chain session…
        {status.attempt !== undefined && status.attempt > 1 && (
          <span className="text-xs">(attempt {status.attempt})</span>
        )}
        {status.lastError && (
          <span className="text-xs opacity-70 truncate max-w-md">{status.lastError}</span>
        )}
      </Row>
    );
  }
  if (k === "awaiting_signature") {
    return (
      <Row palette={STATUS_COLORS.info} icon={<Loader2 className="w-4 h-4 animate-spin" />}>
        Awaiting wallet signature in MetaMask…
      </Row>
    );
  }
  if (k === "confirming") {
    return (
      <Row palette={STATUS_COLORS.info} icon={<Loader2 className="w-4 h-4 animate-spin" />}>
        Confirming on Sepolia…
        {status.blocksRemaining !== undefined && (
          <span className="text-xs">({status.blocksRemaining} blocks remaining)</span>
        )}
        <a
          href={explorerTxUrl(explorerBase, status.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs underline"
        >
          view <ExternalLink className="w-3 h-3" />
        </a>
      </Row>
    );
  }
  if (k === "confirmed") {
    return (
      <Row palette={STATUS_COLORS.positive} icon={<CheckCircle2 className="w-4 h-4" />}>
        Vote committed on-chain
        <a
          href={explorerTxUrl(explorerBase, status.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs underline"
        >
          view receipt <ExternalLink className="w-3 h-3" />
        </a>
      </Row>
    );
  }
  if (k === "recovering") {
    return (
      <Row palette={STATUS_COLORS.warning} icon={<Loader2 className="w-4 h-4 animate-spin" />}>
        Recovering from prior session: {status.reason}
      </Row>
    );
  }
  // failed
  return (
    <Row palette={STATUS_COLORS.negative} icon={<AlertTriangle className="w-4 h-4" />}>
      <span className="flex-1">{status.reason}</span>
      {status.canRetry && onRetry && (
        <button onClick={onRetry} className="text-xs underline">
          retry
        </button>
      )}
    </Row>
  );
}

function Row({
  palette,
  icon,
  children,
}: {
  palette: { border: string; bgSubtle: string; icon: string; text?: string };
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border p-3 text-sm",
        palette.border,
        palette.bgSubtle
      )}
    >
      <span className={palette.icon}>{icon}</span>
      <span className="flex flex-1 items-center gap-2 flex-wrap">{children}</span>
    </div>
  );
}

function Mono({ children }: { children: string }) {
  return <code className="text-xs opacity-70">{children}</code>;
}

function truncate(s: string) {
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
