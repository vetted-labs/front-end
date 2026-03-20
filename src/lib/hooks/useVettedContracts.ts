import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { hashToBytes32 } from '@/lib/blockchain';
import { blockchainApi } from '@/lib/api';
import { useFetch } from '@/lib/hooks/useFetch';
import type { ActiveEndorsement } from '@/types';
import {
  VETTED_TOKEN_ABI,
  EXPERT_STAKING_ABI,
  ENDORSEMENT_BIDDING_ABI,
  REWARD_DISTRIBUTOR_ABI,
  VETTING_MANAGER_ABI,
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
 * Lightweight hook for reading only the user's VETD token balance.
 * Use this when you don't need allowances or mint — avoids 2 unnecessary reads.
 */
export function useTokenBalance() {
  const { address } = useAccount();

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  return { balance, refetchBalance };
}

/**
 * Hook for per-guild staking operations (V2)
 * @param blockchainGuildId - bytes32 guild ID for the blockchain contract
 */
export function useGuildStaking(blockchainGuildId?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read stake info for this guild (use getStakeInfo getter, not the raw mapping)
  const { data: stakeInfo, refetch: refetchStake } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'getStakeInfo',
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

  // Read minimum stake (governance-controlled — changes rarely)
  // Only read when a guild is selected (not needed before then)
  const { data: minimumStake } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'minimumStake',
    query: {
      enabled: !!blockchainGuildId,
      refetchInterval: false,
      staleTime: 300_000,
    },
  });

  // Read global total staked — only when a guild context exists
  const { data: totalStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'totalStaked',
    query: {
      enabled: !!blockchainGuildId,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Check if contract is paused (governance-controlled — changes rarely)
  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING,
    abi: EXPERT_STAKING_ABI,
    functionName: 'paused',
    query: {
      enabled: !!blockchainGuildId,
      refetchInterval: false,
      staleTime: 300_000,
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

  // Stake tokens with EIP-2612 permit (single TX)
  const stakeWithPermit = async (
    guildId: `0x${string}`,
    amount: string,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'stakeWithPermit',
      args: [guildId, parseEther(amount), deadline, v, r, s],
      gas: 400000n, // Slightly higher gas limit for permit + stake
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
    stakeWithPermit,
    requestUnstake,
    completeUnstake,
  };
}

/**
 * Hook for VettingManager contract interactions (commit-reveal voting).
 * Reads session state and vote state, provides commitVote write function.
 * @param sessionId - bytes32 session ID (from hashToBytes32(proposalId))
 */
export function useVettingManager(sessionId?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read session data
  const { data: sessionData, refetch: refetchSession } = useReadContract({
    address: CONTRACT_ADDRESSES.VETTING,
    abi: VETTING_MANAGER_ABI,
    functionName: 'sessions',
    args: sessionId ? [sessionId] : undefined,
    query: {
      enabled: !!sessionId,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Read vote state for current user
  const { data: voteData, refetch: refetchVote } = useReadContract({
    address: CONTRACT_ADDRESSES.VETTING,
    abi: VETTING_MANAGER_ABI,
    functionName: 'getVote',
    args: sessionId && address ? [sessionId, address] : undefined,
    query: {
      enabled: !!sessionId && !!address,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Check if current user is a panel member
  const { data: isPanelMember } = useReadContract({
    address: CONTRACT_ADDRESSES.VETTING,
    abi: VETTING_MANAGER_ABI,
    functionName: 'isPanelMember',
    args: sessionId && address ? [sessionId, address] : undefined,
    query: {
      enabled: !!sessionId && !!address,
      refetchInterval: false,
      staleTime: 30000,
    },
  });

  // Parse session tuple
  const session = sessionData as [
    `0x${string}`, bigint, bigint, bigint, bigint, bigint, number, `0x${string}`
  ] | undefined;

  // Parse vote tuple
  const vote = voteData as [
    `0x${string}`, number, boolean, boolean
  ] | undefined;

  // Commit a vote on-chain
  const commitVote = async (commitment: `0x${string}`) => {
    if (!address) throw new Error('Wallet not connected');
    if (!sessionId) throw new Error('No session ID');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.VETTING,
      abi: VETTING_MANAGER_ABI,
      functionName: 'commitVote',
      args: [sessionId, commitment],
      gas: 200000n,
    });

    return hash;
  };

  return {
    // Session data
    sessionPhase: session?.[6],
    commitDeadline: session?.[1],
    revealDeadline: session?.[2],
    panelSize: session?.[3],
    commitCount: session?.[4],
    revealCount: session?.[5],
    // Vote data
    voteCommitment: vote?.[0],
    voteScore: vote?.[1],
    isCommitted: vote?.[2] ?? false,
    isRevealed: vote?.[3] ?? false,
    isPanelMember: (isPanelMember as boolean) ?? false,
    // Actions
    commitVote,
    refetchSession,
    refetchVote,
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
  const blockchainGuildId = guildId ? hashToBytes32(guildId) : undefined;

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

  // Stake tokens for appeal using EIP-2612 permit (single TX)
  const stakeForAppealWithPermit = async (
    amount: string,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (!blockchainGuildId) throw new Error('Guild ID required for appeal staking');

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.STAKING,
      abi: EXPERT_STAKING_ABI,
      functionName: 'stakeWithPermit',
      args: [blockchainGuildId, parseEther(amount), deadline, v, r, s],
      gas: 400000n,
    });

    return hash;
  };

  return {
    approveTokens,
    stakeForAppeal,
    stakeForAppealWithPermit,
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
      staleTime: 300_000, // Governance-controlled — changes rarely
    },
  });

  // Get top endorsers for an application
  const useTopEndorsers = (jobId: string, candidateId: string) => {
    const jobHash = hashToBytes32(jobId);
    const candidateHash = hashToBytes32(candidateId);

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
    const jobHash = hashToBytes32(jobId);
    const candidateHash = hashToBytes32(candidateId);

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

    const jobHash = hashToBytes32(jobId);
    const candidateHash = hashToBytes32(candidateId);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'placeBid',
      args: [jobHash, candidateHash, parseEther(bidAmount)],
      gas: 500000n, // Manual gas limit for bidding
    });

    return hash;
  };

  // Place endorsement bid with EIP-2612 permit (single TX)
  const placeBidWithPermit = async (
    jobId: string,
    candidateId: string,
    bidAmount: string,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    if (!address) throw new Error('Wallet not connected');

    const jobHash = hashToBytes32(jobId);
    const candidateHash = hashToBytes32(candidateId);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.ENDORSEMENT,
      abi: ENDORSEMENT_BIDDING_ABI,
      functionName: 'placeBidWithPermit',
      args: [jobHash, candidateHash, parseEther(bidAmount), deadline, v, r, s],
      gas: 600000n, // Slightly higher gas limit for permit + bid
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
    placeBidWithPermit,
    withdrawRefund,
  };
}

/**
 * Hook to wait for transaction confirmation
 */
export function useTransactionConfirmation(hash: `0x${string}` | undefined) {
  return useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    pollingInterval: 3_000,
    query: {
      retry: 6,
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 15_000),
    },
  });
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
    functionName: 'getExpertTotalRewards',
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
