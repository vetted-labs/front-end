"use client";
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, AlertCircle, Clock, CheckCircle2, TrendingUp, Coins } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/api';
import { logger } from "@/lib/logger";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESSES, EXPERT_STAKING_ABI } from '@/contracts/abis';

interface WithdrawalManagerProps {
  walletAddress: string;
  currentStake: string;
  currentBalance: string;
  onWithdrawalComplete?: () => void;
}

export function WithdrawalManager({
  walletAddress,
  currentStake,
  currentBalance,
  onWithdrawalComplete
}: WithdrawalManagerProps) {
  const { address } = useAccount();
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [unstakeRequest, setUnstakeRequest] = useState<{ hasRequest: boolean; unlockTime?: string; amount?: string } | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Contract interactions
  const { writeContract: requestUnstake, data: requestTxHash, isPending: isRequesting } = useWriteContract();
  const { writeContract: completeUnstake, data: completeTxHash, isPending: isCompleting } = useWriteContract();
  const { writeContract: cancelUnstake, data: cancelTxHash, isPending: isCanceling } = useWriteContract();

  // Transaction confirmations
  const { isSuccess: requestSuccess } = useWaitForTransactionReceipt({ hash: requestTxHash });
  const { isSuccess: completeSuccess } = useWaitForTransactionReceipt({ hash: completeTxHash });
  const { isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTxHash });

  // Load unstake request
  useEffect(() => {
    loadUnstakeRequest();
  }, [walletAddress]);

  // Update time remaining
  useEffect(() => {
    if (unstakeRequest?.hasRequest && unstakeRequest.unlockTime) {
      const interval = setInterval(() => {
        const remaining = new Date(unstakeRequest.unlockTime).getTime() - Date.now();
        setTimeRemaining(Math.max(0, remaining));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [unstakeRequest]);

  // Handle transaction success
  useEffect(() => {
    if (requestSuccess) {
      toast.success('Unstake requested! 7-day cooldown started.');
      loadUnstakeRequest();
      onWithdrawalComplete?.();
    }
    if (completeSuccess) {
      toast.success('Unstake completed! Tokens returned to wallet.');
      loadUnstakeRequest();
      onWithdrawalComplete?.();
    }
    if (cancelSuccess) {
      toast.success('Unstake request cancelled');
      loadUnstakeRequest();
      onWithdrawalComplete?.();
    }
  }, [requestSuccess, completeSuccess, cancelSuccess]);

  const loadUnstakeRequest = async () => {
    try {
      setLoadingRequest(true);
      const data = await apiRequest<{ hasRequest: boolean; unlockTime?: string; amount?: string }>(
        `/api/blockchain/staking/unstake-request-detailed/${walletAddress}`
      );

      setUnstakeRequest(data);
    } catch (error: unknown) {
      // 404 is expected when no unstake request exists
      if (!(error instanceof ApiError && error.status === 404)) {
        logger.error('Failed to load unstake request', error);
      }
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleRequestUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(unstakeAmount) > parseFloat(currentStake)) {
      toast.error(`Cannot unstake more than your current stake of ${currentStake} VETD`);
      return;
    }

    try {
      await requestUnstake({
        address: CONTRACT_ADDRESSES.STAKING as `0x${string}`,
        abi: EXPERT_STAKING_ABI,
        functionName: 'requestUnstake',
        args: [parseEther(unstakeAmount)]
      });

      setUnstakeAmount('');
    } catch (error: unknown) {
      logger.error('Request unstake error', error, { silent: true });
      toast.error(error instanceof Error ? error.message : 'Failed to request unstake');
    }
  };

  const handleCompleteUnstake = async () => {
    try {
      await completeUnstake({
        address: CONTRACT_ADDRESSES.STAKING as `0x${string}`,
        abi: EXPERT_STAKING_ABI,
        functionName: 'completeUnstake'
      });
    } catch (error: unknown) {
      logger.error('Complete unstake error', error, { silent: true });
      toast.error(error instanceof Error ? error.message : 'Failed to complete unstake');
    }
  };

  const handleCancelUnstake = async () => {
    try {
      await cancelUnstake({
        address: CONTRACT_ADDRESSES.STAKING as `0x${string}`,
        abi: EXPERT_STAKING_ABI,
        functionName: 'cancelUnstake'
      });
    } catch (error: unknown) {
      logger.error('Cancel unstake error', error, { silent: true });
      toast.error(error instanceof Error ? error.message : 'Failed to cancel unstake');
    }
  };

  const canCompleteUnstake = timeRemaining !== null && timeRemaining === 0;
  const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)) : 0;
  const progress = timeRemaining !== null
    ? Math.min(100, ((7 * 24 * 60 * 60 * 1000 - timeRemaining) / (7 * 24 * 60 * 60 * 1000)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Balances */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-muted-foreground">Current Stake</Label>
                <p className="text-2xl font-bold mt-1">{parseFloat(currentStake).toFixed(2)} VETD</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-muted-foreground">Wallet Balance</Label>
                <p className="text-2xl font-bold mt-1">{parseFloat(currentBalance).toFixed(2)} VETD</p>
              </div>
              <Coins className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unstaking Section */}
      <Card>
        <CardHeader>
          <CardTitle>Unstake Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRequest ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : unstakeRequest?.hasRequest ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold">Unstake Request Pending</h4>
                  <p className="text-sm text-muted-foreground">
                    Amount: {parseFloat(unstakeRequest.amount).toFixed(2)} VETD
                  </p>
                </div>
              </div>

              {!canCompleteUnstake ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Cooldown Period
                    </span>
                    <strong>{daysRemaining} days remaining</strong>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can complete your unstake on {new Date(unstakeRequest.unlockTime).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Ready to complete!</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCompleteUnstake}
                  disabled={!canCompleteUnstake || isCompleting}
                  className="flex-1"
                >
                  {isCompleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Complete Unstake
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelUnstake}
                  disabled={isCanceling}
                >
                  {isCanceling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="unstakeAmount">Amount to Unstake (VETD)</Label>
                <Input
                  id="unstakeAmount"
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  max={currentStake}
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available to unstake: {parseFloat(currentStake).toFixed(2)} VETD
                </p>
              </div>

              <Button
                onClick={handleRequestUnstake}
                disabled={isRequesting || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                className="w-full"
              >
                {isRequesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Request Unstake (7-day cooldown)
              </Button>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> After requesting an unstake, you'll need to wait 7 days before you can complete the unstake and receive your tokens back.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
