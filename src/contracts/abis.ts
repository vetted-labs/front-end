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
  // ERC20Permit functions
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const EXPERT_STAKING_ABI = [
  // Read functions
  {
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'bytes32' },
    ],
    name: 'stakes',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'stakedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'bytes32' },
    ],
    name: 'unstakeRequests',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'unlockTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'guildTotalStaked',
    outputs: [{ name: '', type: 'uint256' }],
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
  {
    inputs: [
      { name: 'expert', type: 'address' },
      { name: 'guildId', type: 'bytes32' },
    ],
    name: 'meetsMinimumStake',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'expert', type: 'address' },
      { name: 'guildId', type: 'bytes32' },
    ],
    name: 'getStakeInfo',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'stakedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'expert', type: 'address' },
      { name: 'guildId', type: 'bytes32' },
    ],
    name: 'getUnstakeRequest',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'unlockTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'guildId', type: 'bytes32' }],
    name: 'getGuildTotalStaked',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'guildId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'guildId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'requestUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'guildId', type: 'bytes32' }],
    name: 'completeUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'guildId', type: 'bytes32' }],
    name: 'cancelUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'guildId', type: 'bytes32' }],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'guildId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'stakeWithPermit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Custom errors
  { inputs: [], name: 'ZeroAmount', type: 'error' },
  { inputs: [], name: 'ZeroAddress', type: 'error' },
  { inputs: [], name: 'BelowMinimumStake', type: 'error' },
  { inputs: [], name: 'InsufficientStake', type: 'error' },
  { inputs: [], name: 'CooldownNotExpired', type: 'error' },
  { inputs: [], name: 'NoUnstakeRequest', type: 'error' },
  { inputs: [], name: 'UnstakeRequestExists', type: 'error' },
  { inputs: [], name: 'InvalidGuildId', type: 'error' },
  { inputs: [], name: 'NotAuthorizedSlasher', type: 'error' },
  { inputs: [], name: 'NotGuildMember', type: 'error' },
  { inputs: [], name: 'StakeIsLocked', type: 'error' },
  { inputs: [], name: 'InsufficientUnlockedStake', type: 'error' },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'expert', type: 'address' },
      { indexed: true, name: 'guildId', type: 'bytes32' },
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
      { indexed: true, name: 'guildId', type: 'bytes32' },
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
      { indexed: true, name: 'guildId', type: 'bytes32' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'Unstaked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'expert', type: 'address' },
      { indexed: true, name: 'guildId', type: 'bytes32' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'EmergencyWithdraw',
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
  {
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'candidateId', type: 'bytes32' },
      { name: 'bidAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'placeBidWithPermit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Custom errors
  { inputs: [], name: 'ZeroAmount', type: 'error' },
  { inputs: [], name: 'InvalidJob', type: 'error' },
  { inputs: [], name: 'InvalidCandidate', type: 'error' },
  { inputs: [], name: 'BidAlreadyExists', type: 'error' },
  { inputs: [], name: 'BidIsActive', type: 'error' },
  { inputs: [], name: 'NoBidToWithdraw', type: 'error' },
  { inputs: [], name: 'JobClosed', type: 'error' },
  { inputs: [], name: 'Unauthorized', type: 'error' },
  { inputs: [], name: 'SlashPercentageTooHigh', type: 'error' },
  { inputs: [], name: 'AlreadySlashed', type: 'error' },
  { inputs: [], name: 'AlreadyDistributed', type: 'error' },
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

export const REWARD_DISTRIBUTOR_ABI = [
  // Custom errors
  { inputs: [], name: 'ZeroAmount', type: 'error' },
  { inputs: [], name: 'ArrayLengthMismatch', type: 'error' },
  { inputs: [], name: 'InsufficientTreasury', type: 'error' },
  { inputs: [], name: 'NoRewardWeight', type: 'error' },
  { inputs: [], name: 'BatchTooLarge', type: 'error' },
  { inputs: [], name: 'DuplicateExpert', type: 'error' },
  { inputs: [], name: 'ReputationManagerNotSet', type: 'error' },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'pendingRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'expertRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTreasuryBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRewardsDistributed',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses on Sepolia (updated 2026-03-03)
export const CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
  TOKEN: '0x8BAD852D0C0A9bc66196b2a833183db4D05E2711',
  STAKING: '0x1EE77A26F1dCBb37FC8F9f705699104fb2AF9E1E',
  ENDORSEMENT: '0xbe1773ba0FAc2cFAc3f26adcD5D097fb76000BF3',
  REPUTATION: '0xa8AD3B6B1D67a2F6Bb1624747C32c22000Cab8d8',
  REWARD: '0xE83e817420bBD067cCB6d4D94E41DF4A1c69a16b',
  SLASHING: '0xe7F88cd5883df8A3e3A5fCC3Ba65c619B7F354eE',
  GUILD_REGISTRY: '0xe525A91F3b8dA61921F36313d352735c4D6e9624',
  VETTING: '0xddD3b7436FF8C6548C54A64b051D2FA4ff3736aA',
};
