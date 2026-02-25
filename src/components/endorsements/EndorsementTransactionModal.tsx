import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  X
} from 'lucide-react';

type TransactionStep = 'input' | 'approving' | 'bidding' | 'success' | 'error';

interface TopBid {
  expert: string;
  amount: string;
  rank: number;
}

interface EndorsementTransactionModalProps {
  application: any | null;
  isOpen: boolean;
  onClose: () => void;
  userBalance: string;
  userStake: string;
  minimumBid: string;
  onPlaceEndorsement: (application: any, bidAmount: string) => Promise<void>;
  topBids?: TopBid[];
  txStep: 'idle' | 'approving' | 'bidding' | 'success' | 'error';
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
  topBids = [],
  txStep,
  txError,
  approvalTxHash,
  bidTxHash,
}: EndorsementTransactionModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && txStep === 'idle') {
      setBidAmount('');
      setErrorMessage('');
    }
  }, [isOpen, txStep]);

  const estimatedRank = () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) return null;
    const currentBidAmount = parseFloat(bidAmount);
    let rank = 1;
    for (const bid of topBids) {
      if (parseFloat(bid.amount) >= currentBidAmount) rank++;
    }
    return Math.min(rank, topBids.length + 1);
  };

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
    } catch (error: any) {
      console.error('[Modal] Error:', error);
      setErrorMessage(error.message || "Failed to place endorsement");
    }
  };

  if (!isOpen || !application) return null;

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const progressSteps = ['Approve', 'Endorse', 'Done'];
  const currentStepIndex = txStep === 'idle' ? 0 : txStep === 'approving' ? 0 : txStep === 'bidding' ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-200">
      <div
        className="relative max-w-[480px] w-full mx-4 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 bg-card/80 backdrop-blur-2xl border border-white/[0.08] dark:bg-card/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative">
          {/* Decorative glow layer */}
          <div className="absolute inset-0 overflow-hidden rounded-t-3xl pointer-events-none">
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/15 rounded-full blur-[80px]" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/8 rounded-full blur-[60px]" />
          </div>

          {/* Content */}
          <div className="relative px-6 flex items-center justify-between" style={{ paddingTop: '3.5rem', paddingBottom: '2rem' }}>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {txStep === 'success' ? 'Endorsement Confirmed' : application?.current_bid ? 'Your Endorsement' : 'Place Endorsement'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Stake VETD to back this candidate</p>
            </div>
            <button
              onClick={onClose}
              disabled={txStep === 'approving' || txStep === 'bidding'}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 pb-6 space-y-4">

          {/* Progress Steps */}
          {(txStep === 'approving' || txStep === 'bidding' || txStep === 'success') && (
            <div className="flex items-center gap-2">
              {progressSteps.map((stepName, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    idx <= currentStepIndex
                      ? 'bg-gradient-to-br from-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-sm'
                      : 'bg-white/[0.06] border border-white/[0.08] text-muted-foreground'
                  }`}>
                    {idx < currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${idx <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                    {stepName}
                  </span>
                  {idx < progressSteps.length - 1 && (
                    <div className={`flex-1 h-px ${idx < currentStepIndex ? 'bg-primary/40' : 'bg-white/[0.06]'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Candidate Card */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white/[0.1] shadow-sm flex-shrink-0">
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
                  {(parseFloat(application.guild_score.toString()) * 10).toFixed(0)}/100
                </Badge>
              )}
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
              {/* Balance Row */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {parseFloat(userBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-muted-foreground font-normal">VETD</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div>
                      <p className="text-[10px] text-primary/70 uppercase tracking-wider text-right">Staked</p>
                      <p className="text-sm font-semibold text-primary tabular-nums text-right">
                        {parseFloat(userStake).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-primary/50 font-normal">VETD</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Your bid</span>
                    <button
                      onClick={() => setBidAmount(parseFloat(userBalance).toFixed(2))}
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
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
                      className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 outline-none tabular-nums min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[hsl(var(--gradient-button-text))]">V</span>
                      </div>
                      <span className="text-sm font-semibold">VETD</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2">Min. {minimumBid} VETD</p>
                </div>
              </div>

              {/* Quick Select */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Select</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Min +10%', action: () => handleQuickAmount(0.1, 'min') },
                    { label: 'Min +50%', action: () => handleQuickAmount(0.5, 'min') },
                    { label: '25% Bal', action: () => handleQuickAmount(0.25, 'balance') },
                    { label: '50% Bal', action: () => handleQuickAmount(0.5, 'balance') },
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={btn.action}
                      className="h-10 text-xs font-semibold rounded-xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-95 transition-all"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Rank */}
              {bidAmount && parseFloat(bidAmount) > 0 && estimatedRank() && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Estimated rank</p>
                    <p className="text-sm font-semibold">
                      <span className="text-primary">{parseFloat(bidAmount).toFixed(2)} VETD</span> → Rank <span className="text-lg font-bold text-primary">#{estimatedRank()}</span>
                    </p>
                  </div>
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
                  className="flex-1 h-[3.25rem] rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] font-semibold"
                >
                  Cancel
                </Button>
                <button
                  onClick={handleSubmit}
                  disabled={!bidAmount || parseFloat(bidAmount) <= 0 || !!application?.current_bid}
                  className="flex-1 h-[3.25rem] flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary via-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4" />
                  {application?.current_bid ? 'Already Placed' : 'Place Endorsement'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Approving ── */}
          {txStep === 'approving' && (
            <div className="text-center py-10">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Approving Tokens...</h3>
              <p className="text-sm text-muted-foreground mb-4">Confirm the approval in your wallet</p>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 max-w-xs mx-auto">
                <p className="text-xs text-muted-foreground">
                  Step 1/2: Approving <span className="text-primary font-semibold">{bidAmount} VETD</span>
                </p>
                {approvalTxHash && (
                  <a href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`} target="_blank" rel="noopener noreferrer"
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
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Placing Endorsement...</h3>
              <p className="text-sm text-muted-foreground mb-4">Confirm the transaction in your wallet</p>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 max-w-xs mx-auto">
                <p className="text-xs text-muted-foreground">
                  Step 2/2: Endorsing with <span className="text-primary font-semibold">{bidAmount} VETD</span>
                </p>
                {bidTxHash && (
                  <a href={`https://sepolia.etherscan.io/tx/${bidTxHash}`} target="_blank" rel="noopener noreferrer"
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
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30">
                  <CheckCircle2 className="w-10 h-10 text-[hsl(var(--gradient-button-text))]" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-primary mb-1">Endorsement Confirmed!</h3>
              <p className="text-sm text-muted-foreground mb-6">Top 3 endorsers earn rewards when candidate is hired.</p>

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3 mb-6 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Bid Amount</span>
                  <span className="text-sm font-bold text-primary">{bidAmount} VETD</span>
                </div>
                {estimatedRank() && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Estimated Rank</span>
                    <Badge className="bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] border-0 font-bold">
                      #{estimatedRank()}
                    </Badge>
                  </div>
                )}

                {(approvalTxHash || bidTxHash) && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="space-y-2">
                      {approvalTxHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Approval</span>
                          <a href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1">
                            {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {bidTxHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Endorsement</span>
                          <a href={`https://sepolia.etherscan.io/tx/${bidTxHash}`} target="_blank" rel="noopener noreferrer"
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
                className="w-full h-[3.25rem] rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary via-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 transition-all duration-300"
              >
                Done
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {txStep === 'error' && (
            <div className="text-center py-8">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-red-400 mb-4">Transaction Failed</h3>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{txError || errorMessage || "An error occurred."}</p>
                </div>

                {(approvalTxHash || bidTxHash) && (
                  <div className="mt-3 pt-3 border-t border-red-500/20 space-y-2">
                    {approvalTxHash && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Approval</span>
                        <a href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1">
                          {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {bidTxHash && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Endorsement</span>
                        <a href={`https://sepolia.etherscan.io/tx/${bidTxHash}`} target="_blank" rel="noopener noreferrer"
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
                  className="flex-1 h-[3.25rem] rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] font-semibold">
                  Cancel
                </Button>
                <button
                  onClick={() => { setErrorMessage(''); handleSubmit(); }}
                  className="flex-1 h-[3.25rem] rounded-2xl font-bold text-[15px] bg-gradient-to-r from-primary via-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-xl shadow-primary/25 transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
