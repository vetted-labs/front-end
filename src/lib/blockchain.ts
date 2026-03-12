/**
 * Shared blockchain transaction error utilities.
 *
 * Centralises wallet-rejection detection, error message extraction, and
 * Solidity custom-error → human-readable mapping so every component that
 * interacts with on-chain transactions behaves consistently.
 */

import { keccak256, toBytes, encodePacked } from "viem";

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

/** Generate a cryptographically random bytes32 salt for on-chain commit-reveal. */
export function generateBytes32Salt(): `0x${string}` {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return `0x${Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Compute the on-chain commitment hash matching VettingManager contract:
 * keccak256(abi.encodePacked(sessionId, panelist, score, salt))
 */
export function computeOnChainCommitHash(
  sessionId: `0x${string}`,
  panelist: `0x${string}`,
  score: number,
  salt: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["bytes32", "address", "uint8", "bytes32"],
      [sessionId, panelist, score, salt]
    )
  );
}

/**
 * Map a 0-100 score to the 1-10 range used by the smart contract.
 * Must match the backend's mapScoreToChain().
 */
export function mapScoreToChain(score100: number): number {
  if (score100 <= 0) return 1;
  if (score100 >= 100) return 10;
  return Math.max(1, Math.min(10, Math.round(score100 / 10) || 1));
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
  NotAuthorizedRevealer: "Not authorized as a batch revealer for this session",
  ArrayLengthMismatch: "Input arrays must have the same length",
  InsufficientReveals: "Not enough votes were revealed to finalize",
  InsufficientPanelistStake: "Panelist does not meet the minimum stake requirement",
  ZeroSessionId: "Session ID cannot be zero",
};

/**
 * Map of 4-byte error selectors → error names.
 * Generated via `cast sig "ErrorName()"` for each custom error.
 * Used to decode raw revert data when viem can't match an ABI.
 */
export const ERROR_SELECTORS: Record<string, string> = {
  // Shared
  "0xd92e233d": "ZeroAddress",
  "0x1f2a2005": "ZeroAmount",
  "0xa24a13a6": "ArrayLengthMismatch",
  "0x0b7d62e2": "BatchTooLarge",
  "0x71d9c5f6": "InvalidGuildId",

  // VettedToken
  "0xc30436e9": "ExceedsMaxSupply",
  "0xbb3ab081": "MaxSupplyBelowTotalSupply",
  "0x16c59563": "ExceedsAbsoluteMaxSupply",

  // ExpertStaking
  "0xf1bc94d2": "InsufficientStake",
  "0x856807e3": "StakeIsLocked",
  "0x4afc4985": "UnstakeRequestExists",
  "0xda0461f9": "PendingSlashEscrow",
  "0x8ecf3d03": "BelowMinimumStake",
  "0x16f68e4b": "NoUnstakeRequest",
  "0x3ce33ddb": "CooldownNotExpired",
  "0x5ed90a72": "NotGuildMember",
  "0x65ec9844": "NotInEmergencyMode",
  "0x9c8d2cd2": "InvalidRecipient",
  "0x680eebb0": "InsufficientUnlockedStake",
  "0xb916033a": "InsufficientLockedStake",
  "0x2c6f822a": "CooldownPeriodTooShort",
  "0x876e76c0": "CooldownPeriodTooLong",
  "0x7355e5c5": "MinimumStakeTooHigh",

  // EndorsementBidding
  "0xbb5d1a95": "BelowMinimumBid",
  "0x71c8f460": "InvalidJob",
  "0xe66ea08f": "InvalidCandidate",
  "0x81c888d2": "BidAlreadyExists",
  "0xe685ddca": "BidIsActive",
  "0xc9cd5804": "NoBidToWithdraw",
  "0x4a0be34b": "JobClosed",
  "0x82b42900": "Unauthorized",
  "0x0edf5154": "SlashPercentageTooHigh",
  "0x37233762": "AlreadySlashed",
  "0xcce553a9": "AlreadyDistributed",
  "0xd9fd0110": "JobNotExpired",
  "0xf4d678b8": "InsufficientBalance",
  "0xb34a0dcf": "NoActiveEndorsers",
  "0x6e5739af": "ReclaimDeadlineNotReached",
  "0x57ef322b": "AlreadyReclaimed",
  "0x648d0726": "CreatorCannotBid",
  "0xac738feb": "OneCandiatePerExpert",

  // ReputationManager
  "0x80528ef8": "ChangeTooLarge",
  "0x394ee657": "DecayAmountTooLarge",

  // RewardDistributor
  "0x3f072479": "ReputationManagerNotSet",
  "0x3ed58c7c": "NoRewardWeight",
  "0x10162d2d": "InsufficientTreasury",
  "0xaa0593b6": "DuplicateExpert",
  "0xb05e92fa": "InvalidMerkleProof",
  "0x75c3fad2": "AlreadyClaimedMerkle",
  "0x9f8a28f2": "MerkleRootNotSet",

  // SlashingManager
  "0xcc7b075c": "SlashingPercentageTooHigh",
  "0x1c0983f4": "NoActiveAppeal",
  "0xeae5f0e4": "NotSlashedExpert",
  "0x0eb66cf3": "AppealPeriodExpired",
  "0x4dcfa42d": "AlreadyAppealed",
  "0x6d5703c2": "AlreadyResolved",
  "0x576b1fcb": "AppealResolutionExpired",
  "0x0109dda7": "AppealResolutionNotExpired",
  "0x34f5151d": "InsufficientEscrowBalance",
  "0xe706b842": "AppealFeeRequired",

  // GuildRegistry
  "0x572d4e08": "GuildAlreadyExists",
  "0xd145e5b3": "GuildDoesNotExist",
  "0x477aa975": "GuildAlreadyInactive",
  "0x9c4c4f77": "GuildAlreadyActive",
  "0x4db8e461": "GuildNotActive",
  "0x810074be": "AlreadyMember",
  "0x291fc442": "NotMember",

  // VettingManager
  "0x46f25422": "SessionAlreadyExists",
  "0xae4a0906": "InvalidPanelSize",
  "0x23c61240": "InvalidSessionPhase",
  "0x1431024b": "ZeroSessionId",
  "0xc06789fa": "InvalidCommitment",
  "0x829fee26": "SessionDurationTooLong",
  "0x0ca5aa2a": "SessionDoesNotExist",
  "0x61345c49": "NotPanelMember",
  "0xbfec5558": "AlreadyCommitted",
  "0xa89ac151": "AlreadyRevealed",
  "0x15561365": "InvalidScore",
  "0xfe561238": "CommitPeriodEnded",
  "0x7f6c2066": "CommitPeriodNotEnded",
  "0x407f37a7": "RevealPeriodNotEnded",
  "0xf69697ac": "PanelSizeMismatch",
  "0x7a13be9a": "DuplicatePanelist",
  "0xfc9a60da": "DuplicateInResults",
  "0xfc1b3c2f": "PanelistDidNotReveal",
  "0xb90ea5c3": "NotAuthorizedToExpire",
  "0x7732bd95": "ExpireGracePeriodNotElapsed",
  "0x8e6fe82e": "InsufficientReveals",
  "0x874905c9": "NotAuthorizedRevealer",
  "0x7366ce42": "InsufficientPanelistStake",
};

/**
 * Decode a raw 4-byte error selector (from revert data) into a human-readable message.
 * Returns undefined if the selector is not recognized.
 */
export function decodeErrorSelector(data: string): string | undefined {
  const selector = data.slice(0, 10).toLowerCase();
  const errorName = ERROR_SELECTORS[selector];
  if (!errorName) return undefined;
  return formatContractError(errorName);
}

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
 * Walk a viem/wagmi error's cause chain looking for raw revert data.
 * Viem nests: BaseError → ContractFunctionRevertedError → (has .data or .signature)
 */
function extractRevertData(error: unknown): string | undefined {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const obj = current as Record<string, unknown>;

    // viem ContractFunctionRevertedError stores decoded info in .data
    // but when the error is unknown to the ABI, .data.errorName is "Error"
    // and the raw bytes are in .data.args or the error itself
    if (typeof obj.data === "string" && obj.data.startsWith("0x") && obj.data.length >= 10) {
      return obj.data;
    }

    // wagmi/viem sometimes puts the raw hex in cause.data
    if (typeof obj.data === "object" && obj.data !== null) {
      const d = obj.data as Record<string, unknown>;
      if (typeof d.data === "string" && d.data.startsWith("0x")) {
        return d.data;
      }
    }

    current = obj.cause;
  }
  return undefined;
}

/**
 * Extract the most useful error message from a viem/wagmi error.
 *
 * Priority:
 * 1. Named custom error match in shortMessage or message
 * 2. 4-byte selector decoded from raw revert data (cause chain or message)
 * 3. shortMessage from viem
 * 4. Error.message
 * 5. Provided fallback
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

  // 1. Try to extract a decoded custom error name from the short message
  // viem formats these as: "... reverted with the following reason: ErrorName()"
  // or "... reverted with custom error 'ErrorName()'"
  if (shortMessage) {
    for (const errorName of Object.keys(CONTRACT_ERROR_MESSAGES)) {
      if (shortMessage.includes(errorName)) {
        return CONTRACT_ERROR_MESSAGES[errorName];
      }
    }
  }

  // 2. Try to decode raw revert data from the error's cause chain
  const revertData = extractRevertData(error);
  if (revertData) {
    const decoded = decodeErrorSelector(revertData);
    if (decoded) return decoded;
  }

  // 3. If shortMessage exists but no custom error was found, check for hex selectors in it
  if (shortMessage) {
    const selectorMatch = shortMessage.match(/0x[a-fA-F0-9]{8,}/);
    if (selectorMatch) {
      const decoded = decodeErrorSelector(selectorMatch[0]);
      if (decoded) return decoded;
    }
    return shortMessage;
  }

  if (error instanceof Error) {
    // 4. Check the full message for custom error names
    for (const errorName of Object.keys(CONTRACT_ERROR_MESSAGES)) {
      if (error.message.includes(errorName)) {
        return CONTRACT_ERROR_MESSAGES[errorName];
      }
    }

    // 5. Try to decode a raw 4-byte selector from the message text
    const selectorMatch = error.message.match(/0x[a-fA-F0-9]{8,}/);
    if (selectorMatch) {
      const decoded = decodeErrorSelector(selectorMatch[0]);
      if (decoded) return decoded;
    }

    return error.message;
  }

  return fallback;
}
