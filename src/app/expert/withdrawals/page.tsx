"use client";
import { WithdrawalManager } from '@/components/WithdrawalManager';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

// Import hooks for getting balances
import { useVettedToken } from '@/lib/hooks/useVettedContracts';

export default function WithdrawalsPage() {
  const { address } = useAccount();
  const [stakeInfo, setStakeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { balance, refetchBalance } = useVettedToken();

  useEffect(() => {
    if (address) {
      loadStakeInfo();
    }
  }, [address]);

  const loadStakeInfo = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        `/api/blockchain/staking/balance/${address}`
      );

      if (response.success) {
        setStakeInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load stake info:', error);
      toast.error('Failed to load staking information');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalComplete = () => {
    // Reload data after withdrawal
    loadStakeInfo();
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
          <Button asChild>
            <Link href="/expert/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/expert/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

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
