"use client";

import { useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  AlertCircle,
  Wallet,
  TrendingUp,
  Award,
  ExternalLink,
  Zap,
  ArrowRight,
  X,
  Clock
} from 'lucide-react';
import { logger } from "@/lib/logger";
import { getExplorerTxUrl } from "@/lib/blockchain";
import { useCountdown } from "@/lib/hooks/useCountdown";
import type { EndorsementApplication } from "@/types";

interface EndorsementTransactionModalProps {
  application: EndorsementApplication | null;
  isOpen: boolean;
  onClose: () => void;
  userBalance: string;
  userStake: string;
  minimumBid: string;
  onPlaceEndorsement: (application: EndorsementApplication, bidAmount: string) => Promise<void>;
  txStep: 'idle' | 'signing' | 'approving' | 'bidding' | 'success' | 'error';
  txError: string | null;
  approvalTxHash?: `0x${string}`;
  bidTxHash?: `0x${string}`;
}

export function EndorsementTransactionModal({
  application,
  isOpen,
  onClose,
  userBalance,
  userStake,
  minimumBid,
  onPlaceEndorsement,
  txStep,
  txError,
  approvalTxHash,
  bidTxHash,
}: EndorsementTransactionModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { label: countdownLabel, isExpired: biddingExpired, isUrgent: biddingUrgent } = useCountdown(
    application?.bidding_deadline,
    { fallbackStart: application?.applied_at, expiredLabel: "Bidding closed" },
  );

  useEffect(() => {
    if (isOpen && txStep === 'idle') {
      setBidAmount('');
      setErrorMessage('');
    }
  }, [isOpen, txStep]);

  const handleQuickAmount = (multiplier: number, type: 'min' | 'balance') => {
    if (type === 'min') {
      setBidAmount((parseFloat(minimumBid) * (1 + multiplier)).toFixed(2));
    } else {
      setBidAmount((parseFloat(userBalance) * multiplier).toFixed(2));
    }
  };

  const validateBid = (): boolean => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setErrorMessage('Please enter a valid bid amount');
      return false;
    }
    if (parseFloat(bidAmount) < parseFloat(minimumBid)) {
      setErrorMessage(`Minimum bid is ${minimumBid} VETD`);
      return false;
    }
    if (parseFloat(userBalance) < parseFloat(bidAmount)) {
      setErrorMessage(`Insufficient balance. You have ${parseFloat(userBalance).toFixed(2)} VETD`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!application || !validateBid()) return;
    try {
      setErrorMessage('');
      await onPlaceEndorsement(application, bidAmount);
    } catch (error: unknown) {
      logger.error("Failed to place endorsement", error, { silent: true });
      const { getTransactionErrorMessage } = await import("@/lib/blockchain");
      setErrorMessage(getTransactionErrorMessage(error, "Failed to place endorsement"));
    }
  };

  if (!isOpen || !application) return null;

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const isPermitPath = txStep === 'signing' || (txStep === 'bidding' && !approvalTxHash);
  const progressSteps = isPermitPath ? ['Sign', 'Confirm', 'Done'] : ['Approve', 'Endorse', 'Done'];
  const currentStepIndex = txStep === 'idle' ? 0 : txStep === 'signing' ? 0 : txStep === 'approving' ? 0 : txStep === 'bidding' ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-modal-backdrop-in">
      {/* Gradient border glow wrapper */}
      <div className="max-w-[480px] w-full mx-4 rounded-3xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent p-px animate-modal-scale-in">
        <div
          className="relative w-full max-h-[90vh] flex flex-col overflow-hidden rounded-3xl shadow-2xl bg-card/70 backdrop-blur-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="relative flex-shrink-0">
            {/* Decorative glow layer */}
            <div className="absolute inset-0 overflow-hidden rounded-t-3xl pointer-events-none">
              <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-[100px]" />
            </div>

            {/* Content */}
            <div className="relative px-6 pt-8 pb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  {txStep === 'success' ? 'Endorsement Confirmed' : application?.current_bid ? 'Your Endorsement' : 'Place Endorsement'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Stake VETD to back this candidate</p>
              </div>
              <button
                onClick={onClose}
                disabled={txStep === 'signing' || txStep === 'approving' || txStep === 'bidding'}
                className="group w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Gradient divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {/* ── Content ── */}
          <div className="px-6 pt-5 pb-6 space-y-3.5 flex-1 overflow-y-auto min-h-0">

            {/* Progress Steps — fixed-width circles with separate flex lines */}
            {(txStep === 'signing' || txStep === 'approving' || txStep === 'bidding' || txStep === 'success') && (
              <div className="flex items-center">
                {progressSteps.map((stepName, idx) => (
                  <Fragment key={idx}>
                    {/* Step circle + label */}
                    <div className="w-16 flex flex-col items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        idx <= currentStepIndex
                          ? 'bg-gradient-to-br from-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-sm'
                          : 'bg-white/[0.06] border border-white/[0.08] text-muted-foreground'
                      } ${idx === currentStepIndex && txStep !== 'success' ? 'ring-4 ring-primary/15' : ''}`}>
                        {idx < currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-medium ${idx <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                        {stepName}
                      </span>
                    </div>
                    {/* Connecting line between steps */}
                    {idx < progressSteps.length - 1 && (
                      <div className="flex-1 h-px bg-white/[0.06] relative -mt-5">
                        <div
                          className={`absolute inset-y-0 left-0 bg-gradient-to-r from-primary/40 to-primary/20 transition-all duration-500 ${
                            idx < currentStepIndex ? 'w-full' : 'w-0'
                          }`}
                        />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}

            {/* Candidate Card */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex overflow-hidden">
              {/* Left accent bar */}
              <div className="w-0.5 bg-gradient-to-b from-primary to-accent rounded-full -my-4 -ml-4 mr-4 flex-shrink-0" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-12 h-12 border-2 border-primary/15 shadow-md shadow-primary/10 flex-shrink-0">
                  {application.candidate_profile_picture_url && (
                    <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
                  )}
                  <AvatarFallback className="bg-primary/15 text-primary font-bold">
                    {candidateInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{application.candidate_name}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {application.job_title} at {application.company_name}
                  </p>
                </div>
                {application.guild_score && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs flex-shrink-0">
                    <Award className="w-3 h-3 mr-1" />
                    {parseFloat(application.guild_score.toString()).toFixed(0)}/100
                  </Badge>
                )}
              </div>
            </div>

            {/* Bidding Period Countdown */}
            <div className={`rounded-2xl border p-3 flex items-center gap-2.5 ${
              biddingExpired
                ? "border-red-500/20 bg-red-500/[0.08]"
                : biddingUrgent
                ? "border-amber-500/20 bg-amber-500/[0.08]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                biddingExpired ? "bg-red-500/10" : biddingUrgent ? "bg-amber-500/10" : "bg-white/[0.06]"
              }`}>
                <Clock className={`w-4 h-4 ${
                  biddingExpired ? "text-red-400" : biddingUrgent ? "text-amber-400" : "text-primary"
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Bidding period</p>
                <p className={`text-sm font-semibold tabular-nums ${
                  biddingExpired ? "text-red-400" : biddingUrgent ? "text-amber-400" : "text-foreground"
                }`}>
                  {countdownLabel}
                </p>
              </div>
            </div>

            {/* Existing Bid Warning */}
            {application?.current_bid && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Already endorsed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current bid: {parseFloat(application.current_bid).toFixed(2)} VETD. Bid increases are not currently supported.
                  </p>
                </div>
              </div>
            )}

            {/* ── Input Step ── */}
            {txStep === 'idle' && (
              <>
                {/* Balance/Staked inline row */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-semibold tabular-nums">
                      {parseFloat(userBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} VETD
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary/70">Staked:</span>
                    <span className="font-semibold text-primary tabular-nums">
                      {parseFloat(userStake).toLocaleString(undefined, { maximumFractionDigits: 2 })} VETD
                    </span>
                  </div>
                </div>

                {/* Amount Input Card */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2 transition-colors focus-within:border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Your bid</span>
                    <button
                      onClick={() => setBidAmount(parseFloat(userBalance).toFixed(2))}
                      className="text-[10px] font-bold text-primary/70 hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all tracking-wider uppercase"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder={application?.current_bid ? `Current: ${parseFloat(application.current_bid).toFixed(2)}` : `Min: ${minimumBid}`}
                      value={bidAmount}
                      onChange={(e) => { setBidAmount(e.target.value); setErrorMessage(''); }}
                      min={minimumBid}
                      step="0.1"
                      disabled={!!application?.current_bid}
                      className="flex-1 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/30 outline-none tabular-nums min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-[11px] font-bold text-[hsl(var(--gradient-button-text))]">V</span>
                      </div>
                      <span className="text-sm font-semibold">VETD</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60">Min. {minimumBid} VETD</p>
                </div>

                {/* Quick Select */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Min +10%', action: () => handleQuickAmount(0.1, 'min') },
                    { label: 'Min +50%', action: () => handleQuickAmount(0.5, 'min') },
                    { label: '25% Bal', action: () => handleQuickAmount(0.25, 'balance') },
                    { label: '50% Bal', action: () => handleQuickAmount(0.5, 'balance') },
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={btn.action}
                      className="h-10 text-xs font-semibold rounded-lg border border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-95 transition-all"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Blind bidding info */}
                {bidAmount && parseFloat(bidAmount) > 0 && (
                  <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground flex-1">
                      <span className="font-semibold text-muted-foreground/80">Blind bidding</span> — rankings are hidden during the bidding period and revealed when it ends.
                    </p>
                  </div>
                )}

                {/* Error */}
                {errorMessage && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Error</p>
                      <p className="text-xs text-red-300/80 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-[0.4] h-[3.25rem] rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] font-semibold"
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleSubmit}
                    disabled={!bidAmount || parseFloat(bidAmount) <= 0 || !!application?.current_bid || biddingExpired}
                    className="flex-[0.6] h-[3.25rem] flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Zap className="w-4 h-4" />
                    {biddingExpired ? 'Bidding Closed' : application?.current_bid ? 'Already Placed' : 'Place Endorsement'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── Signing Permit ── */}
            {txStep === 'signing' && (
              <div className="text-center py-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-125" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Sign Permit...</h3>
                <p className="text-sm text-muted-foreground mb-4">Sign the message in your wallet</p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 max-w-xs mx-auto">
                  <p className="text-xs text-muted-foreground">
                    Authorizing <span className="text-primary font-semibold">{bidAmount} VETD</span> for endorsement
                  </p>
                  <p className="text-xs text-primary/60 mt-2 font-medium">No gas required</p>
                </div>
              </div>
            )}

            {/* ── Approving (fallback path) ── */}
            {txStep === 'approving' && (
              <div className="text-center py-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-125" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Approving Tokens...</h3>
                <p className="text-sm text-muted-foreground mb-4">Confirm the approval in your wallet</p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 max-w-xs mx-auto">
                  <p className="text-xs text-muted-foreground">
                    Step 1/2: Approving <span className="text-primary font-semibold">{bidAmount} VETD</span>
                  </p>
                  {approvalTxHash && (
                    <a href={getExplorerTxUrl(approvalTxHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-2">
                      View on Etherscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Bidding ── */}
            {txStep === 'bidding' && (
              <div className="text-center py-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-125" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Placing Endorsement...</h3>
                <p className="text-sm text-muted-foreground mb-4">Confirm the transaction in your wallet</p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 max-w-xs mx-auto">
                  <p className="text-xs text-muted-foreground">
                    {isPermitPath ? 'Endorsing' : 'Step 2/2: Endorsing'} with <span className="text-primary font-semibold">{bidAmount} VETD</span>
                  </p>
                  {bidTxHash && (
                    <a href={getExplorerTxUrl(bidTxHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-2">
                      View on Etherscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Success ── */}
            {txStep === 'success' && (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6 animate-celebrate-scale-in">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-celebrate-glow" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30">
                    <CheckCircle2 className="w-10 h-10 text-[hsl(var(--gradient-button-text))]" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-1">Endorsement Confirmed!</h3>
                <p className="text-sm text-muted-foreground mb-6">Top 3 endorsers earn rewards when candidate is hired.</p>

                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3 mb-6 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Bid Amount</span>
                    <span className="text-lg font-bold text-primary">{bidAmount} VETD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Ranking</span>
                    <span className="text-xs text-muted-foreground">Revealed when bidding ends</span>
                  </div>

                  {(approvalTxHash || bidTxHash) && (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                      <div className="space-y-2">
                        {approvalTxHash && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Approval</span>
                            <a href={getExplorerTxUrl(approvalTxHash)} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1">
                              {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {bidTxHash && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Endorsement</span>
                            <a href={getExplorerTxUrl(bidTxHash)} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1">
                              {bidTxHash.slice(0, 6)}...{bidTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full h-[3.25rem] rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 transition-all duration-300"
                >
                  Done
                </button>
              </div>
            )}

            {/* ── Error ── */}
            {txStep === 'error' && (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl">
                    <AlertCircle className="w-10 h-10 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-red-400 mb-4">Transaction Failed</h3>

                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{txError || errorMessage || "An error occurred."}</p>
                  </div>

                  {(approvalTxHash || bidTxHash) && (
                    <div className="mt-3 pt-3 border-t border-red-500/20 space-y-2">
                      {approvalTxHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Approval</span>
                          <a href={getExplorerTxUrl(approvalTxHash)} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1">
                            {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {bidTxHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Endorsement</span>
                          <a href={getExplorerTxUrl(bidTxHash)} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1">
                            {bidTxHash.slice(0, 6)}...{bidTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}
                    className="flex-[0.4] h-[3.25rem] rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] font-semibold">
                    Cancel
                  </Button>
                  <button
                    onClick={() => { setErrorMessage(''); handleSubmit(); }}
                    className="flex-[0.6] h-[3.25rem] rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 transition-all duration-300"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
