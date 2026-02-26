import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts, usePublicClient } from 'wagmi';
import { parseEther, keccak256, toBytes, formatEther } from 'viem';
import { useState, useEffect, useMemo } from 'react';
import { blockchainApi } from '@/lib/api';
import { useFetch } from '@/lib/hooks/useFetch';
import { logger } from '@/lib/logger';
import type { ActiveEndorsement } from '@/types';
import {
  VETTED_TOKEN_ABI,
  EXPERT_STAKING_ABI,
  ENDORSEMENT_BIDDING_ABI,
  REPUTATION_MANAGER_ABI,
  REWARD_DISTRIBUTOR_ABI,
  CONTRACT_ADDRESSES,
} from '@/contracts/abis';

/**
 * Hook for token operations
 */
export function useVettedToken() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: false, // Disable auto-refetch
      staleTime: 10000, // Consider data fresh for 10 seconds
    },
  });

  // Approve spending
  const approve = async (spender: `0x${string}`, amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.TOKEN,
      abi: VETTED_TOKEN_ABI,
      functionName: 'approve',
      args: [spender, parseEther(amount)],
      gas: 100000n, // Manual gas limit for ERC20 approval
    });

    return hash;
  };

  // Mint tokens (for testing on testnet)
  const mint = async (to: `0x${string}`, amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.TOKEN,
      abi: VETTED_TOKEN_ABI,
      functionName: 'mint',
      args: [to, parseEther(amount)],
      gas: 150000n, // Manual gas limit for minting
    });

    return hash;
  };

  // Check allowance for staking contract (for backward compatibility)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.STAKING] : undefined,
    query: {
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Check allowance for endorsement contract
  const { data: endorsementAllowance, refetch: refetchEndorsementAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.ENDORSEMENT] : undefined,
    query: {
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  return {
    balance,
    refetchBalance,
    approve,
    mint,
    allowance,
    refetchAllowance,
    endorsementAllowance,
    refetchEndorsementAllowance,
  };
}

/**
 * Hook for per-guild staking operations (V2)
 * @param blockchainGuildId - bytes32 guild ID for the blockchain contract
 */
export function useGuildStaking(blockchainGuildId?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read stake info for this guild
  const { data: stakeInfo, refetch: refetchStake } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'stakes',
    args: address && blockchainGuildId ? [address, blockchainGuildId] : undefined,
    query: {
      enabled: !!address && !!blockchainGuildId,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Read guild total staked
  const { data: guildTotalStaked, refetch: refetchGuildTotal } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'guildTotalStaked',
    args: blockchainGuildId ? [blockchainGuildId] : undefined,
    query: {
      enabled: !!blockchainGuildId,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Read minimum stake
  const { data: minimumStake } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'minimumStake',
    query: {
      refetchInterval: false,
      staleTime: 60000,
    },
  });

  // Read global total staked
  const { data: totalStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'totalStaked',
    query: {
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Check if contract is paused
  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'paused',
    query: {
      refetchInterval: false,
      staleTime: 30000,
    },
  });

  // Stake tokens for a guild
  const stake = async (guildId: `0x${string}`, amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'stake',
      args: [guildId, parseEther(amount)],
      gas: 300000n,
    });

    return hash;
  };

  // Request unstake from a guild
  const requestUnstake = async (guildId: `0x${string}`, amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'requestUnstake',
      args: [guildId, parseEther(amount)],
      gas: 200000n,
    });

    return hash;
  };

  // Complete unstake for a guild
  const completeUnstake = async (guildId: `0x${string}`) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'completeUnstake',
      args: [guildId],
      gas: 200000n,
    });

    return hash;
  };

  return {
    stakeInfo,
    refetchStake,
    guildTotalStaked,
    refetchGuildTotal,
    minimumStake,
    totalStaked,
    isPaused,
    stake,
    requestUnstake,
    completeUnstake,
  };
}

/**
 * Hook for on-chain appeal staking
 * Reuses the ExpertStaking contract to stake VETD as part of the appeal process
 */
export function useAppealStaking(guildId?: string) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Convert guild UUID to bytes32 for the blockchain contract
  const blockchainGuildId = guildId ? keccak256(toBytes(guildId)) as `0x${string}` : undefined;

  // Check current allowance for staking contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.STAKING] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Approve token transfer to staking contract
  const approveTokens = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.TOKEN,
      abi: VETTED_TOKEN_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.STAKING, parseEther(amount)],
      gas: 100000n,
    });

    return hash;
  };

  // Stake tokens for the appeal (via guild staking)
  const stakeForAppeal = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    if (!blockchainGuildId) throw new Error('Guild ID required for appeal staking');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'stake',
      args: [blockchainGuildId, parseEther(amount)],
      gas: 300000n,
    });

    return hash;
  };

  // Check if approval is needed for a given amount
  const needsApproval = (amount: string): boolean => {
    if (!allowance) return true;
    return (allowance as bigint) < parseEther(amount);
  };

  return {
    approveTokens,
    stakeForAppeal,
    needsApproval,
    refetchAllowance,
  };
}

/**
 * Hook for endorsement operations
 */
export function useEndorsementBidding() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read minimum bid
  const { data: minimumBid } = useReadContract({
    address: CONTRACT_ADDRESSES.ENDORSEMENT,
    abi: ENDORSEMENT_BIDDING_ABI,
    functionName: 'minimumBid',
    query: {
      refetchInterval: false,
      staleTime: 60000, // Minimum bid rarely changes, cache for 60s
    },
  });

  // Get top endorsers for an application
  const useTopEndorsers = (jobId: string, candidateId: string) => {
    const jobHash = keccak256(toBytes(jobId));
    const candidateHash = keccak256(toBytes(candidateId));

    return useReadContract({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'getTopEndorsers',
      args: [jobHash, candidateHash],
      query: {
        refetchInterval: false,
        staleTime: 15000,
      },
    });
  };

  // Get bid info for current user
  const useBidInfo = (jobId: string, candidateId: string) => {
    const jobHash = keccak256(toBytes(jobId));
    const candidateHash = keccak256(toBytes(candidateId));

    return useReadContract({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'getBidInfo',
      args: address ? [jobHash, candidateHash, address] : undefined,
      query: {
        refetchInterval: false,
        staleTime: 15000,
      },
    });
  };

  // Place endorsement bid
  const placeBid = async (jobId: string, candidateId: string, bidAmount: string) => {
    if (!address) throw new Error('Wallet not connected');

    const jobHash = keccak256(toBytes(jobId));
    const candidateHash = keccak256(toBytes(candidateId));

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'placeBid',
      args: [jobHash, candidateHash, parseEther(bidAmount)],
      gas: 300000n, // Manual gas limit for bidding
    });

    return hash;
  };

  // Withdraw refunded bid
  const withdrawRefund = async () => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'withdrawRefund',
      gas: 150000n, // Manual gas limit
    });

    return hash;
  };

  return {
    minimumBid,
    useTopEndorsers,
    useBidInfo,
    placeBid,
    withdrawRefund,
  };
}

/**
 * Hook for reputation
 */
export function useReputation() {
  const { address } = useAccount();

  const { data: reputationScore, refetch: refetchReputation } = useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION,
    abi: REPUTATION_MANAGER_ABI,
    functionName: 'reputation',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: false,
      staleTime: 15000,
    },
  });

  return {
    reputationScore,
    refetchReputation,
  };
}

/**
 * Hook to wait for transaction confirmation
 */
export function useTransactionConfirmation(hash: `0x${string}` | undefined) {
  return useWaitForTransactionReceipt({
    hash,
  });
}

/**
 * Hook to read user's endorsements from blockchain
 * Queries getBidInfo for each application to find active bids
 *
 * PERFORMANCE OPTIMIZED: Only queries applications with current_bid to reduce RPC calls
 */
export function useUserEndorsements(applications: Array<{
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  company_name: string;
  current_bid?: string;
  rank?: number;
}>) {
  const { address } = useAccount();
  const [endorsements, setEndorsements] = useState<Array<{
    application_id: string;
    candidate_id: string;
    candidate_name: string;
    job_id: string;
    job_title: string;
    company_name: string;
    bid_amount: string;
    rank: number;
    total_endorsers: number;
    created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // PERFORMANCE: Only query blockchain for applications where user has a bid (from API)
  // This dramatically reduces RPC calls from potentially 100+ to just a few
  // Use useMemo to prevent recalculation on every render
  const applicationsWithBids = useMemo(
    () => applications.filter(app => app.current_bid),
    [applications]
  );


  // Build contract calls for getBidInfo and getTopEndorsers
  // Only for applications where user has a bid
  // Use useMemo to prevent recreating contract calls on every render
  const contracts = useMemo(() => applicationsWithBids.flatMap((app) => {
    const jobHash = keccak256(toBytes(app.job_id));
    const candidateHash = keccak256(toBytes(app.candidate_id));

    return [
      {
        address: CONTRACT_ADDRESSES.ENDORSEMENT,
        abi: ENDORSEMENT_BIDDING_ABI,
        functionName: 'getBidInfo',
        args: address ? [jobHash, candidateHash, address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.ENDORSEMENT,
        abi: ENDORSEMENT_BIDDING_ABI,
        functionName: 'getTopEndorsers',
        args: [jobHash, candidateHash],
      },
    ];
  }), [applicationsWithBids, address]);

  const { data: contractResults, isLoading: isLoadingContracts, refetch } = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- wagmi's useReadContracts has strict generic constraints that don't accept dynamically-built contract arrays
    contracts: contracts as any,
    query: {
      enabled: applicationsWithBids.length > 0 && !!address, // Only run if there are apps with bids
      refetchInterval: false,
      staleTime: 15000,
    },
  });

  // Process contract results to build endorsements list
  useEffect(() => {
    if (!contractResults || !address || applicationsWithBids.length === 0) {
      setEndorsements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const userEndorsements: typeof endorsements = [];

    // Process results in pairs (getBidInfo, getTopEndorsers)
    for (let i = 0; i < applicationsWithBids.length; i++) {
      const app = applicationsWithBids[i];
      const bidInfoIndex = i * 2;
      const topEndorsersIndex = i * 2 + 1;

      const bidInfoResult = contractResults[bidInfoIndex];
      const topEndorsersResult = contractResults[topEndorsersIndex];


      // Check if bid info is valid
      if (bidInfoResult?.status === 'success' && bidInfoResult.result) {
        const [amount, isActive] = bidInfoResult.result as [bigint, boolean];


        if (isActive && amount > 0n) {
          // User has an active bid on this application
          let rank = 0;
          let totalEndorsers = 0;

          // Check user's rank in top endorsers
          if (topEndorsersResult?.status === 'success' && topEndorsersResult.result) {
            const [experts, amounts] = topEndorsersResult.result as [`0x${string}`[], bigint[]];

            // Count total endorsers (non-zero amounts)
            totalEndorsers = amounts.filter(amt => amt > 0n).length;

            // Find user's rank (1-indexed)
            const userIndex = experts.findIndex(
              (expert) => expert?.toLowerCase() === address.toLowerCase()
            );
            if (userIndex !== -1 && amounts[userIndex] > 0n) {
              rank = userIndex + 1; // Convert to 1-indexed rank
            }

          }

          const endorsement = {
            application_id: app.application_id,
            candidate_id: app.candidate_id,
            candidate_name: app.candidate_name,
            job_id: app.job_id,
            job_title: app.job_title,
            company_name: app.company_name,
            bid_amount: formatEther(amount),
            rank: rank,
            total_endorsers: totalEndorsers,
            created_at: new Date().toISOString(), // We don't have exact timestamp from chain
          };

          userEndorsements.push(endorsement);
        }
      } else if (bidInfoResult?.status === 'failure') {
        logger.debug(`[useUserEndorsements] Failed to get bid info for ${app.candidate_name}:`, bidInfoResult.error);
      }
    }

    setEndorsements(userEndorsements);
    setIsLoading(false);
  }, [contractResults, address, applicationsWithBids.length, refreshTrigger]); // Use length to avoid deep comparison

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  return {
    endorsements,
    isLoading,
    refetch,
  };
}

/**
 * Hook to fetch user's active endorsements from backend API
 * Shows full endorsement details including job title, candidate name, etc.
 */
export function useMyActiveEndorsements() {
  const { address, isConnected } = useAccount();

  const { data: endorsements, isLoading, error, refetch } = useFetch<ActiveEndorsement[]>(
    async () => {
      const data = await blockchainApi.getExpertEndorsements(address!, { status: 'active', limit: 50 });
      if (!Array.isArray(data)) throw new Error('Invalid response format from API');
      return data;
    },
    { skip: !isConnected || !address }
  );

  return {
    endorsements: endorsements ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch user's endorsement history from blockchain events
 * Queries BidPlaced events to find all historical endorsements
 */
export function useMyEndorsementHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [endorsements, setEndorsements] = useState<Array<{
    jobId: string;
    candidateId: string;
    bidAmount: string;
    rank: number;
    timestamp: number;
    transactionHash: string;
    blockNumber: bigint;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEndorsementHistory = async () => {
      if (!address || !publicClient) {
        setEndorsements([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {

        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();

        // Define chunk size (stay well under 10k limit for free-tier RPCs)
        const CHUNK_SIZE = 5000n;

        // Query last 100k blocks or from block 0, whichever is more recent
        const startBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;


        // Query in chunks to avoid RPC limits
        interface BidPlacedArgs { jobId: `0x${string}`; candidateId: `0x${string}`; expert: `0x${string}`; bidAmount: bigint; rank: bigint }
        const allLogs: Array<{ args: BidPlacedArgs; blockNumber: bigint | null; transactionHash: `0x${string}` | null }> = [];
        for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
          const toBlock = fromBlock + CHUNK_SIZE - 1n > currentBlock ? currentBlock : fromBlock + CHUNK_SIZE - 1n;


          const chunkLogs = await publicClient.getLogs({
            address: CONTRACT_ADDRESSES.ENDORSEMENT,
            event: {
              anonymous: false,
              inputs: [
                { indexed: true, name: 'jobId', type: 'bytes32' },
                { indexed: true, name: 'candidateId', type: 'bytes32' },
                { indexed: true, name: 'expert', type: 'address' },
                { indexed: false, name: 'bidAmount', type: 'uint256' },
                { indexed: false, name: 'rank', type: 'uint256' },
              ],
              name: 'BidPlaced',
              type: 'event',
            },
            args: {
              expert: address,
            },
            fromBlock,
            toBlock,
          });

          // chunkLogs has the full viem Log type; narrow to just the fields we use
          for (const cl of chunkLogs) {
            allLogs.push({ args: cl.args as BidPlacedArgs, blockNumber: cl.blockNumber, transactionHash: cl.transactionHash });
          }
        }


        const logs = allLogs;

        // Process logs to extract endorsement data
        const endorsementHistory = logs.map((log) => {
          const { jobId, candidateId, bidAmount, rank } = log.args;

          return {
            jobId: jobId,
            candidateId: candidateId,
            bidAmount: formatEther(bidAmount),
            rank: Number(rank),
            timestamp: 0, // Will be fetched from block if needed
            transactionHash: log.transactionHash || '0x',
            blockNumber: log.blockNumber || 0n,
          };
        });

        // Sort by block number (most recent first)
        endorsementHistory.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

        setEndorsements(endorsementHistory);
      } catch (err) {
        logger.error('[useMyEndorsementHistory] Error fetching endorsement history', err, { silent: true });
        setError(err instanceof Error ? err.message : 'Failed to fetch endorsement history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndorsementHistory();
  }, [address, publicClient]);

  return {
    endorsements,
    isLoading,
    error,
  };
}

/**
 * Hook for claiming VETD rewards from RewardDistributor contract
 */
export function useRewardClaiming() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: pendingRewards, refetch: refetchPending } = useReadContract({
    address: CONTRACT_ADDRESSES.REWARD,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  const { data: totalClaimed, refetch: refetchClaimed } = useReadContract({
    address: CONTRACT_ADDRESSES.REWARD,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'expertRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  const claimRewards = async () => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.REWARD,
      abi: REWARD_DISTRIBUTOR_ABI,
      functionName: 'claimRewards',
      args: [],
      gas: 150000n,
    });

    return hash;
  };

  const refetchAll = () => {
    refetchPending();
    refetchClaimed();
  };

  return {
    pendingRewards: pendingRewards as bigint | undefined,
    totalClaimed: totalClaimed as bigint | undefined,
    claimRewards,
    refetchAll,
  };
}
