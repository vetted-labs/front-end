import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6" onInteractOutside={(e) => {
        // Prevent closing during transactions
        if (txStep === 'approving' || txStep === 'bidding') {
          e.preventDefault();
        }
      }}>
        <DialogHeader className="pb-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {txStep === 'success'
              ? '🎉 Endorsement Successful!'
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
                        className={`flex-1 h-1 ${
                          idx <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    )}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 mx-2 ${
                        idx <= currentStepIndex
                          ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                          : 'bg-muted text-muted-foreground'
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
                        className={`flex-1 h-1 ${
                          idx < currentStepIndex ? 'bg-primary' : 'bg-muted'
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
        <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-2 border-primary/20 shadow-md mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-lg">
                {application.candidate_profile_picture_url && (
                  <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {candidateInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate">{application.candidate_name}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {application.job_title} at {application.company_name}
                </p>
              </div>
              {application.guild_score && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-semibold">
                  <Award className="w-4 h-4 mr-1" />
                  {(parseFloat(application.guild_score.toString()) * 10).toFixed(0)}/100
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Bid Warning */}
        {application?.current_bid && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 border-2 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                    You already endorsed this candidate
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    Your current bid: {parseFloat(application.current_bid).toFixed(2)} VETD
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    Bid increases are not currently supported. To change your bid, please contact support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Input */}
        {txStep === 'idle' && (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:shadow-lg hover:scale-105 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Your Balance</p>
                      <p className="text-3xl font-bold text-primary mb-1">{parseFloat(userBalance).toFixed(2)}</p>
                      <p className="text-sm font-semibold text-muted-foreground">VETD</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full shadow-md">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:shadow-lg hover:scale-105 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Staked Amount</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{parseFloat(userStake).toFixed(2)}</p>
                      <p className="text-sm font-semibold text-muted-foreground">VETD</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-full shadow-md">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    className="text-2xl font-bold h-16 pr-20 pl-6 border-2 focus:border-primary focus:ring-4 focus:ring-primary/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="grid grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(0.1, 'min')}
                    className="h-12 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                  >
                    Min +10%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(0.5, 'min')}
                    className="h-12 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                  >
                    Min +50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(0.25, 'balance')}
                    className="h-12 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                  >
                    25% Balance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(0.5, 'balance')}
                    className="h-12 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                  >
                    50% Balance
                  </Button>
                </div>
              </div>

              {/* Estimated Rank */}
              {bidAmount && parseFloat(bidAmount) > 0 && estimatedRank() && (
                <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-full shadow-md animate-pulse">
                        <Award className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Estimated Rank
                        </p>
                        <p className="text-lg font-bold">
                          Your bid of{' '}
                          <span className="text-primary">{parseFloat(bidAmount).toFixed(2)} VETD</span>{' '}
                          would rank{' '}
                          <span className="text-2xl text-blue-600 dark:text-blue-400">#{estimatedRank()}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {errorMessage && (
                <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10 animate-in fade-in slide-in-from-bottom-2">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
                          Error
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-14 text-base font-semibold hover:bg-muted hover:scale-105 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!bidAmount || parseFloat(bidAmount) <= 0 || !!application?.current_bid}
                className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-700 hover:to-pink-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Zap className="w-5 h-5 mr-2" />
                {application?.current_bid ? 'Bid Already Placed' : 'Place Endorsement'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Approving */}
        {txStep === 'approving' && (
          <div className="text-center py-16">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Wallet className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4">Approving Tokens...</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Please confirm the approval transaction in your wallet
            </p>
            <Card className="max-w-md mx-auto bg-gradient-to-br from-primary/5 to-purple-500/5 border-2 border-primary/20 shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm font-medium mb-4">
                  <span className="text-muted-foreground">Step 1/2:</span> Approving{' '}
                  <span className="text-primary font-bold">{bidAmount} VETD</span> tokens for endorsement contract
                </p>
                {approvalTxHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                  >
                    View on Etherscan
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Bidding */}
        {txStep === 'bidding' && (
          <div className="text-center py-16">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-12 h-12 text-purple-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4">Placing Endorsement...</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Please confirm the endorsement transaction in your wallet
            </p>
            <Card className="max-w-md mx-auto bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-2 border-purple-500/20 shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm font-medium mb-4">
                  <span className="text-muted-foreground">Step 2/2:</span> Placing endorsement bid of{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{bidAmount} VETD</span>
                </p>
                {bidTxHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                  >
                    View on Etherscan
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Success */}
        {txStep === 'success' && (
          <div className="text-center py-12">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-600 animate-pulse opacity-20"></div>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </div>

            <h3 className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Endorsement Successful!
            </h3>
            <p className="text-lg text-muted-foreground mb-10">
              Your endorsement has been placed. You'll earn rewards if this candidate is hired and you're in the top 3 endorsers.
            </p>

            <Card className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-green-500/10 border-2 border-purple-500/30 mb-8 shadow-xl">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Bid Amount</span>
                    <span className="text-xl font-bold text-primary">{bidAmount} VETD</span>
                  </div>
                  {estimatedRank() && (
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Estimated Rank</span>
                      <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 text-lg px-4 py-1 font-bold">
                        {estimatedRank() === 1 ? '🥇' : estimatedRank() === 2 ? '🥈' : estimatedRank() === 3 ? '🥉' : ''}
                        #{estimatedRank()}
                      </Badge>
                    </div>
                  )}

                  {/* Transaction Links */}
                  {(approvalTxHash || bidTxHash) && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Transaction Details</p>
                      <div className="space-y-2 text-sm">
                        {approvalTxHash && (
                          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                            <span className="text-muted-foreground">Approval:</span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {bidTxHash && (
                          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                            <span className="text-muted-foreground">Endorsement:</span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {bidTxHash.slice(0, 6)}...{bidTxHash.slice(-4)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 justify-center text-sm">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <p className="text-muted-foreground font-medium">
                        Top 3 endorsers earn rewards when candidate is hired!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleClose}
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 hover:scale-105 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Done
            </Button>
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

            <h3 className="text-4xl font-bold mb-4 text-red-600 dark:text-red-400">
              Transaction Failed
            </h3>

            <Card className="max-w-md mx-auto mb-8 bg-gradient-to-br from-red-500/10 to-red-600/10 border-2 border-red-500/30 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-left font-medium text-red-600 dark:text-red-400">
                    {txError || errorMessage || "An error occurred while placing your endorsement."}
                  </p>
                </div>

                {/* Transaction Links if available */}
                {(approvalTxHash || bidTxHash) && (
                  <div className="pt-4 border-t border-red-500/20">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Transaction Details</p>
                    <div className="space-y-2 text-sm">
                      {approvalTxHash && (
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-muted-foreground">Approval:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${approvalTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {approvalTxHash.slice(0, 6)}...{approvalTxHash.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {bidTxHash && (
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-muted-foreground">Endorsement:</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${bidTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
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
                className="flex-1 h-14 text-base font-semibold border-2 hover:bg-muted hover:scale-105 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setErrorMessage('');
                  handleSubmit(); // Retry
                }}
                className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
