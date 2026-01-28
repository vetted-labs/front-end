// Contract ABIs for blockchain interactions

export const VETTED_TOKEN_ABI = [
  // Read functions
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const EXPERT_STAKING_ABI = [
  // Read functions
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'stakes',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'stakedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalStaked',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minimumStake',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'requestUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'completeUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'expert', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalStake', type: 'uint256' },
    ],
    name: 'Staked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'expert', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'unlockTime', type: 'uint256' },
    ],
    name: 'UnstakeRequested',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'expert', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'Unstaked',
    type: 'event',
  },
] as const;

export const ENDORSEMENT_BIDDING_ABI = [
  // Read functions
  {
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    name: 'jobs',
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'isOpen', type: 'bool' },
      { name: 'selectedCandidate', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'candidateId', type: 'bytes32' },
    ],
    name: 'getTopEndorsers',
    outputs: [
      { name: 'experts', type: 'address[3]' },
      { name: 'amounts', type: 'uint256[3]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'candidateId', type: 'bytes32' },
      { name: 'expert', type: 'address' },
    ],
    name: 'getBidInfo',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minimumBid',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    name: 'createJob',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'candidateId', type: 'bytes32' },
      { name: 'bidAmount', type: 'uint256' },
    ],
    name: 'placeBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
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
] as const;

export const REPUTATION_MANAGER_ABI = [
  {
    inputs: [{ name: 'expert', type: 'address' }],
    name: 'reputation',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses on Sepolia (updated 2026-01-27)
export const CONTRACT_ADDRESSES = {
  TOKEN: '0x28bfc34939066d0aba30206b4865855b4f175c31',
  STAKING: '0x38fd365fe7c33e8ef0ce1fd0adcc4dd0ba743535',
  ENDORSEMENT: '0x4a3ae6b94ecb901fd704b4613aab1d1d5142dd74',
  REPUTATION: '0x573f8d7130933911a1024fd2cf639f6c58aac197',
  REWARD: '0x218637bc4fab50ee4339d09a477048d62f97b613',
  SLASHING: '0x78fc5df3f550f3f01f1add9b21ee11a8d704496d',
} as const;
