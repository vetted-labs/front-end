"use client";
import { WithdrawalManager } from '@/components/WithdrawalManager';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ArrowLeft } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { blockchainApi } from '@/lib/api';
import { toast } from 'sonner';
import { useFetch } from '@/lib/hooks/useFetch';

// Import hooks for getting balances
import { useVettedToken } from '@/lib/hooks/useVettedContracts';

export default function WithdrawalsPage() {
  const { address } = useAccount();

  const { balance, refetchBalance } = useVettedToken();

  const { data: stakeInfo, isLoading: loading, refetch } = useFetch(
    () => blockchainApi.getStakeBalance(address!),
    {
      skip: !address,
      onError: (error) => {
        // 404 is expected when no staking data exists yet
        if (!error.includes("404")) {
          toast.error('Failed to load staking information');
        }
      },
    }
  );

  const handleWithdrawalComplete = () => {
    // Reload data after withdrawal
    refetch();
    refetchBalance();
  };

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to manage withdrawals
          </p>
          <Link href="/expert/dashboard" className={cn(buttonVariants())}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 animate-page-enter">
      {/* Header */}
      <div className="mb-8">
        <Link href="/expert/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Withdrawals</h1>
        <p className="text-muted-foreground">
          Manage your staked tokens and endorsement refunds
        </p>
      </div>

      <WithdrawalManager
        walletAddress={address}
        currentStake={stakeInfo?.stakedAmount || '0'}
        currentBalance={balance ? formatEther(balance) : '0'}
        onWithdrawalComplete={handleWithdrawalComplete}
      />
    </div>
  );
}
