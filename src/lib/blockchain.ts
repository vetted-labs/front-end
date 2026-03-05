/**
 * Shared blockchain transaction error utilities.
 *
 * Centralises wallet-rejection detection, error message extraction, and
 * Solidity custom-error → human-readable mapping so every component that
 * interacts with on-chain transactions behaves consistently.
 */

import { keccak256, toBytes } from "viem";

const EXPLORER_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.etherscan.io";

/** Build a block-explorer URL for a transaction hash. */
export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/** Build a block-explorer URL for a wallet / contract address. */
export function getExplorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

/** Convert a string ID (guild UUID, job ID, candidate ID) to a bytes32 hash for on-chain contract calls. */
export function hashToBytes32(id: string): `0x${string}` {
  return keccak256(toBytes(id));
}

/** Returns true when the user rejected/denied the transaction in their wallet. */
export function isUserRejection(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code: number }).code === 4001) return true;
  }
  const message = error instanceof Error ? error.message : "";
  return message.includes("User rejected") || message.includes("User denied");
}

/** Map of Solidity custom error names → user-friendly messages. */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  // Shared
  ZeroAmount: "Amount must be greater than zero",
  ZeroAddress: "Invalid address provided",
  Unauthorized: "You are not authorized for this action",
  ArrayLengthMismatch: "Input arrays must have the same length",
  BatchTooLarge: "Batch size exceeds the maximum allowed",
  EnforcedPause: "Contract is currently paused",

  // VettedToken
  ExceedsMaxSupply: "Exceeds maximum token supply",
  ExceedsAbsoluteMaxSupply: "Exceeds absolute maximum token supply",
  MaxSupplyBelowTotalSupply: "Max supply cannot be below current total supply",
  ERC20InsufficientBalance: "Insufficient token balance",
  ERC20InsufficientAllowance: "Insufficient token allowance — approve tokens first",

  // ERC20Permit
  ERC2612ExpiredSignature: "Permit signature has expired — please try again",
  ERC2612InvalidSigner: "Invalid permit signature — please reconnect your wallet",

  // ExpertStaking
  BelowMinimumStake: "Stake amount is below the minimum required",
  InsufficientStake: "Insufficient staked balance",
  CooldownNotExpired: "Cooldown period has not expired yet",
  NoUnstakeRequest: "No pending unstake request found",
  UnstakeRequestExists: "An unstake request is already pending",
  InvalidGuildId: "Invalid guild identifier",
  NotAuthorizedSlasher: "Not authorized to slash stakes",
  NotGuildMember: "You are not a member of this guild",
  StakeIsLocked: "Your stake is currently locked",
  InsufficientUnlockedStake: "Not enough unlocked stake available",
  CooldownPeriodTooLong: "Cooldown period exceeds the maximum allowed",
  CooldownPeriodTooShort: "Cooldown period is below the minimum allowed",
  InvalidRecipient: "Invalid recipient address",
  MinimumStakeTooHigh: "Minimum stake exceeds the maximum allowed",
  NotInEmergencyMode: "Emergency mode is not active",

  // EndorsementBidding
  InvalidJob: "This job has not been initialized on-chain",
  InvalidCandidate: "Invalid candidate identifier",
  BidAlreadyExists: "You already have an active bid for this candidate",
  BidIsActive: "Cannot withdraw — bid is still active",
  NoBidToWithdraw: "No bid available to withdraw",
  JobClosed: "This job is no longer accepting endorsements",
  SlashPercentageTooHigh: "Slash percentage exceeds the allowed maximum",
  AlreadySlashed: "This bid has already been slashed",
  AlreadyDistributed: "Rewards have already been distributed",
  AlreadyReclaimed: "Bids have already been reclaimed",
  BelowMinimumBid: "Bid amount is below the minimum required",
  InsufficientBalance: "Insufficient token balance for this operation",
  JobNotExpired: "Job has not expired yet",
  NoActiveEndorsers: "No active endorsers found for this job",
  ReclaimDeadlineNotReached: "Reclaim deadline has not been reached yet",

  // ReputationManager
  ChangeTooLarge: "Reputation change exceeds the maximum allowed per call",
  DecayAmountTooLarge: "Reputation decay amount is too large",

  // RewardDistributor
  InsufficientTreasury: "Insufficient funds in the treasury",
  NoRewardWeight: "No reward weight assigned — earn reputation first",
  DuplicateExpert: "Duplicate expert in the batch",
  ReputationManagerNotSet: "Reputation manager contract is not configured",

  // SlashingManager
  AlreadyAppealed: "This slashing has already been appealed",
  AlreadyResolved: "This appeal has already been resolved",
  AppealPeriodExpired: "The appeal period has expired",
  AppealResolutionExpired: "The appeal resolution period has expired",
  AppealResolutionNotExpired: "The appeal resolution period has not expired yet",
  InsufficientEscrowBalance: "Insufficient balance in escrow",
  NoActiveAppeal: "No active appeal found",
  NotSlashedExpert: "Only the slashed expert can perform this action",
  SlashingPercentageTooHigh: "Slashing percentage exceeds the allowed maximum",

  // GuildRegistry
  AlreadyMember: "This address is already a guild member",
  NotMember: "This address is not a guild member",
  GuildAlreadyExists: "A guild with this ID already exists",
  GuildDoesNotExist: "This guild does not exist",
  GuildNotActive: "This guild is not currently active",
  GuildAlreadyActive: "This guild is already active",
  GuildAlreadyInactive: "This guild is already inactive",

  // VettingManager
  AlreadyCommitted: "You have already committed a vote for this session",
  AlreadyRevealed: "You have already revealed your vote",
  CommitPeriodEnded: "The commit period has ended",
  CommitPeriodNotEnded: "The commit period has not ended yet",
  RevealPeriodNotEnded: "The reveal period has not ended yet",
  InvalidCommitment: "Vote commitment does not match the revealed score",
  InvalidPanelSize: "Panel size is outside the allowed range",
  InvalidScore: "Score is outside the valid range",
  InvalidSessionPhase: "Invalid session phase for this operation",
  SessionAlreadyExists: "A session with this ID already exists",
  SessionDoesNotExist: "This vetting session does not exist",
  SessionDurationTooLong: "Session duration exceeds the maximum allowed",
  NotPanelMember: "You are not a panel member for this session",
  DuplicatePanelist: "Duplicate panelist in the panel",
  DuplicateInResults: "Duplicate address in finalization results",
  PanelSizeMismatch: "Results size does not match the panel size",
  PanelistDidNotReveal: "A panelist did not reveal their vote",
  ExpireGracePeriodNotElapsed: "Grace period for expiration has not elapsed",
  NotAuthorizedToExpire: "Not authorized to expire this session",
  InsufficientPanelistStake: "Panelist does not meet the minimum stake requirement",
  ZeroSessionId: "Session ID cannot be zero",
};

/**
 * Convert a Solidity custom error name into a user-friendly sentence.
 * Falls back to a formatted version of the name if not mapped.
 */
export function formatContractError(errorName: string): string {
  if (CONTRACT_ERROR_MESSAGES[errorName]) {
    return CONTRACT_ERROR_MESSAGES[errorName];
  }
  // Fallback: split PascalCase → words (e.g. "SomeError" → "Some error")
  return errorName.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Extract the most useful error message from a viem/wagmi error.
 *
 * Priority:
 * 1. Decoded custom error name (via `shortMessage` containing the error name)
 * 2. `shortMessage` from viem (usually the most concise)
 * 3. Standard `Error.message`
 * 4. Provided `fallback`
 */
export function getTransactionErrorMessage(
  error: unknown,
  fallback = "Transaction failed"
): string {
  if (!error) return fallback;

  const shortMessage =
    typeof error === "object" && error !== null && "shortMessage" in error
      ? (error as { shortMessage: string }).shortMessage
      : undefined;

  // Try to extract a decoded custom error name from the short message
  // viem formats these as: "... reverted with the following reason: ErrorName()"
  // or "... reverted with custom error 'ErrorName()'"
  if (shortMessage) {
    for (const errorName of Object.keys(CONTRACT_ERROR_MESSAGES)) {
      if (shortMessage.includes(errorName)) {
        return CONTRACT_ERROR_MESSAGES[errorName];
      }
    }
    return shortMessage;
  }

  if (error instanceof Error) {
    // Also check the full message for custom error names
    for (const errorName of Object.keys(CONTRACT_ERROR_MESSAGES)) {
      if (error.message.includes(errorName)) {
        return CONTRACT_ERROR_MESSAGES[errorName];
      }
    }
    return error.message;
  }

  return fallback;
}
