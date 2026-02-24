import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  AlertCircle,
  Wallet,
  TrendingUp,
  Award,
  ExternalLink,
  Zap,
  ArrowRight
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

  // Transaction state passed from parent
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
  txStep,        // Use parent's state
  txError,       // Use parent's state
  approvalTxHash, // Real transaction hash
  bidTxHash,     // Real transaction hash
}: EndorsementTransactionModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && txStep === 'idle') {
      setBidAmount('');
      setErrorMessage('');
    }
  }, [isOpen, txStep]);

  // Calculate estimated rank based on bid amount
  const estimatedRank = () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) return null;

    const currentBidAmount = parseFloat(bidAmount);
    let rank = 1;

    for (const bid of topBids) {
      if (parseFloat(bid.amount) >= currentBidAmount) {
        rank++;
      }
    }

    return Math.min(rank, topBids.length + 1);
  };

  const handleQuickAmount = (multiplier: number, type: 'min' | 'balance') => {
    if (type === 'min') {
      const amount = parseFloat(minimumBid) * (1 + multiplier);
      setBidAmount(amount.toFixed(2));
    } else {
      const amount = parseFloat(userBalance) * multiplier;
      setBidAmount(amount.toFixed(2));
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
    if (!application) return;

    if (!validateBid()) {
      return;
    }

    try {
      setErrorMessage('');

      // Parent will manage the state transitions
      // We just call the handler and let parent track progress
      await onPlaceEndorsement(application, bidAmount);

      // Don't set step here - parent manages it via txStep prop
    } catch (error: any) {
      // Error is caught and managed by parent
      console.error('[Modal] Error in onPlaceEndorsement:', error);
      setErrorMessage(error.message || "Failed to place endorsement");
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!application) return null;

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const progressSteps = ['Approve Tokens', 'Place Bid', 'Complete'];
  const currentStepIndex = txStep === 'idle' ? 0 : txStep === 'approving' ? 0 : txStep === 'bidding' ? 1 : 2;
  const progressPercentage = ((currentStepIndex + 1) / progressSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-border bg-gradient-to-b from-background/95 via-background/98 to-background/98 backdrop-blur-xl shadow-sm dark:shadow-lg" onInteractOutside={(e) => {
        // Prevent closing during transactions
        if (txStep === 'approving' || txStep === 'bidding') {
          e.preventDefault();
        }
      }}>
        {/* Top glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" />
        {/* Radial background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)]" />

        <div className="relative z-10 p-4 sm:p-6">
        <DialogHeader className="pb-6 border-b border-border">
          <DialogTitle className="text-2xl font-bold font-display text-foreground">
            {txStep === 'success'
              ? 'Endorsement Successful!'
              : application?.current_bid
                ? 'Your Active Endorsement'
                : 'Place Endorsement Bid'
            }
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        {(txStep === 'approving' || txStep === 'bidding' || txStep === 'success') && (
          <div className="mb-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              {progressSteps.map((stepName, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {idx > 0 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          idx <= currentStepIndex ? 'bg-amber-400' : 'bg-border'
                        }`}
                      />
                    )}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 mx-2 ${
                        idx <= currentStepIndex
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-orange-500/30 scale-110'
                          : 'bg-muted/50 border border-border text-muted-foreground'
                      }`}
                    >
                      {idx < currentStepIndex ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    {idx < progressSteps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          idx < currentStepIndex ? 'bg-amber-400' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${idx <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                    {stepName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidate Info Card (shown in all steps) */}
        <Card className="border border-border bg-muted/50 backdrop-blur-sm shadow-sm dark:shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-orange-400/30 shadow-lg shadow-orange-500/10">
                {application.candidate_profile_picture_url && (
                  <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-primary font-bold text-lg">
                  {candidateInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate text-foreground">{application.candidate_name}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {application.job_title} at {application.company_name}
                </p>
              </div>
              {application.guild_score && (
                <Badge variant="outline" className="bg-amber-500/10 text-primary border-amber-400/30 font-semibold">
                  <Award className="w-4 h-4 mr-1" />
                  {(parseFloat(application.guild_score.toString()) * 10).toFixed(0)}/100
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Bid Warning */}
        {application?.current_bid && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">
                  You already endorsed this candidate
                </p>
                <p className="text-sm text-amber-300/80 mt-1">
                  Your current bid: {parseFloat(application.current_bid).toFixed(2)} VETD
                </p>
                <p className="text-sm text-amber-300/80 mt-1">
                  Bid increases are not currently supported. To change your bid, please contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Input */}
        {txStep === 'idle' && (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-muted/50 p-5 hover:border-orange-400/30 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Your Balance</p>
                    <p className="text-3xl font-bold text-primary mb-1">{parseFloat(userBalance).toFixed(2)}</p>
                    <p className="text-sm font-semibold text-muted-foreground">VETD</p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-400/20">
                    <Wallet className="w-6 h-6 text-amber-300" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-5 hover:border-sky-400/30 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Staked Amount</p>
                    <p className="text-3xl font-bold text-sky-300 mb-1">{parseFloat(userStake).toFixed(2)}</p>
                    <p className="text-sm font-semibold text-muted-foreground">VETD</p>
                  </div>
                  <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-400/20">
                    <TrendingUp className="w-6 h-6 text-sky-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Top Bids */}
            {topBids.length > 0 && (
              <div>
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-500" />
                  Current Top Bids
                </h4>
                <div className="space-y-3">
                  {topBids.slice(0, 3).map((bid, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-5 rounded-lg border-2 transition-all duration-300 hover:scale-102 hover:shadow-md animate-in fade-in slide-in-from-left-4 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30'
                          : idx === 1
                          ? 'bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30'
                          : 'bg-gradient-to-r from-orange-600/10 to-orange-700/10 border-orange-600/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`font-bold px-4 py-2 text-base ${
                            idx === 0
                              ? 'bg-yellow-500 text-white border-yellow-600'
                              : idx === 1
                              ? 'bg-gray-400 text-white border-gray-500'
                              : 'bg-orange-600 text-white border-orange-700'
                          }`}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} #{bid.rank}
                        </Badge>
                        <span className="text-sm font-semibold">{bid.expert}</span>
                      </div>
                      <span className="font-bold text-lg">{parseFloat(bid.amount).toFixed(2)} VETD</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bid Input */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="bidAmount" className="text-base font-bold text-foreground">
                  Enter Your Bid Amount
                </Label>
                <div className="relative">
                    <Input
                      id="bidAmount"
                      type="number"
                    placeholder={
                      application?.current_bid
                        ? `Current bid: ${parseFloat(application.current_bid).toFixed(2)} VETD`
                        : `Minimum: ${minimumBid} VETD`
                    }
                    value={bidAmount}
                    onChange={(e) => {
                      setBidAmount(e.target.value);
                      setErrorMessage('');
                    }}
                      min={minimumBid}
                      step="0.1"
                      disabled={!!application?.current_bid}
                    className="text-2xl font-bold h-16 pr-20 pl-6 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    VETD
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum bid: {minimumBid} VETD
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  Quick Select
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleQuickAmount(0.1, 'min')}
                    className="h-12 text-xs font-semibold rounded-lg border border-border bg-muted/50 text-foreground hover:bg-orange-500/15 hover:text-primary hover:border-orange-400/30 active:scale-95 transition-all duration-200"
                  >
                    Min +10%
                  </button>
                  <button
                    onClick={() => handleQuickAmount(0.5, 'min')}
                    className="h-12 text-xs font-semibold rounded-lg border border-border bg-muted/50 text-foreground hover:bg-orange-500/15 hover:text-primary hover:border-orange-400/30 active:scale-95 transition-all duration-200"
                  >
                    Min +50%
                  </button>
                  <button
                    onClick={() => handleQuickAmount(0.25, 'balance')}
                    className="h-12 text-xs font-semibold rounded-lg border border-border bg-muted/50 text-foreground hover:bg-orange-500/15 hover:text-primary hover:border-orange-400/30 active:scale-95 transition-all duration-200"
                  >
                    25% Balance
                  </button>
                  <button
                    onClick={() => handleQuickAmount(0.5, 'balance')}
                    className="h-12 text-xs font-semibold rounded-lg border border-border bg-muted/50 text-foreground hover:bg-orange-500/15 hover:text-primary hover:border-orange-400/30 active:scale-95 transition-all duration-200"
                  >
                    50% Balance
                  </button>
                </div>
              </div>

              {/* Estimated Rank */}
              {bidAmount && parseFloat(bidAmount) > 0 && estimatedRank() && (
                <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/15 rounded-xl border border-orange-400/20 animate-pulse">
                      <Award className="w-7 h-7 text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Estimated Rank
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        Your bid of{' '}
                        <span className="text-primary">{parseFloat(bidAmount).toFixed(2)} VETD</span>{' '}
                        would rank{' '}
                        <span className="text-2xl text-primary">#{estimatedRank()}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-300 mb-1">
                        Error
                      </p>
                      <p className="text-sm text-red-400">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-14 text-base font-semibold border border-border text-foreground bg-transparent hover:bg-muted hover:scale-105 transition-all duration-200"
              >
                Cancel
              </Button>
              <button
                onClick={handleSubmit}
                disabled={!bidAmount || parseFloat(bidAmount) <= 0 || !!application?.current_bid}
                className="flex-1 h-14 flex items-center justify-center gap-2 text-base font-bold rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-900 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 hover:scale-105 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Zap className="w-5 h-5" />
                {application?.current_bid ? 'Bid Already Placed' : 'Place Endorsement'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Approving */}
        {txStep === 'approving' && (
          <div className="text-center py-16">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Wallet className="w-12 h-12 text-amber-300" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4 text-foreground">Approving Tokens...</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Please confirm the approval transaction in your wallet
            </p>
            <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/50 p-6">
              <p className="text-sm font-medium text-foreground mb-4">
                <span className="text-muted-foreground">Step 1/2:</span> Approving{' '}
                <span className="text-primary font-bold">{bidAmount} VETD</span> tokens for endorsement contract
              </p>
              {approvalTxHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-300 hover:underline flex items-center justify-center gap-2"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Step: Bidding */}
        {txStep === 'bidding' && (
          <div className="text-center py-16">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-sky-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-sky-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-12 h-12 text-sky-300" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4 text-foreground">Placing Endorsement...</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Please confirm the endorsement transaction in your wallet
            </p>
            <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/50 p-6">
              <p className="text-sm font-medium text-foreground mb-4">
                <span className="text-muted-foreground">Step 2/2:</span> Placing endorsement bid of{' '}
                <span className="text-sky-300 font-bold">{bidAmount} VETD</span>
              </p>
              {bidTxHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-300 hover:underline flex items-center justify-center gap-2"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Step: Success */}
        {txStep === 'success' && (
          <div className="text-center py-12">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse opacity-20"></div>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </div>

            <h3 className="text-4xl font-bold mb-3 text-primary">
              Endorsement Successful!
            </h3>
            <p className="text-lg text-muted-foreground mb-10">
              Your endorsement has been placed. You'll earn rewards if this candidate is hired and you're in the top 3 endorsers.
            </p>

            <div className="rounded-2xl border border-border bg-muted/50 backdrop-blur-sm p-8 mb-8 shadow-sm dark:shadow-lg">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                  <span className="text-sm font-medium text-muted-foreground">Bid Amount</span>
                  <span className="text-xl font-bold text-primary">{bidAmount} VETD</span>
                </div>
                {estimatedRank() && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Estimated Rank</span>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-lg px-4 py-1 font-bold">
                      #{estimatedRank()}
                    </Badge>
                  </div>
                )}

                {/* Transaction Links */}
                {(approvalTxHash || bidTxHash) && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Transaction Details</p>
                    <div className="space-y-2 text-sm">
                      {approvalTxHash && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                          <span className="text-muted-foreground">Approval:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-300 hover:underline flex items-center gap-1"
                          >
                            {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {bidTxHash && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                          <span className="text-muted-foreground">Endorsement:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-300 hover:underline flex items-center gap-1"
                          >
                            {bidTxHash.slice(0, 6)}...{bidTxHash.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 justify-center text-sm">
                    <Award className="w-4 h-4 text-amber-300" />
                    <p className="text-muted-foreground font-medium">
                      Top 3 endorsers earn rewards when candidate is hired!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full h-14 text-base font-bold rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-900 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 hover:scale-105 shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all duration-200"
            >
              Done
            </button>
          </div>
        )}

        {/* Step: Error */}
        {txStep === 'error' && (
          <div className="text-center py-12">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"></div>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl">
                <AlertCircle className="w-16 h-16 text-white" />
              </div>
            </div>

            <h3 className="text-4xl font-bold mb-4 text-red-400">
              Transaction Failed
            </h3>

            <Card className="max-w-md mx-auto mb-8 border border-red-500/30 bg-red-500/10 shadow-sm dark:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-left font-medium text-red-300">
                    {txError || errorMessage || "An error occurred while placing your endorsement."}
                  </p>
                </div>

                {/* Transaction Links if available */}
                {(approvalTxHash || bidTxHash) && (
                  <div className="pt-4 border-t border-red-500/20">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Transaction Details</p>
                    <div className="space-y-2 text-sm">
                      {approvalTxHash && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Approval:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-300 hover:underline flex items-center gap-1"
                          >
                            {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {bidTxHash && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Endorsement:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-300 hover:underline flex items-center gap-1"
                          >
                            {bidTxHash.slice(0, 6)}...{bidTxHash.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-14 text-base font-semibold border border-border text-foreground hover:bg-muted hover:scale-105 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setErrorMessage('');
                  handleSubmit(); // Retry
                }}
                className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-orange-500 to-amber-400 text-slate-900 hover:from-orange-400 hover:to-amber-300 hover:scale-105 shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
