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
  // ExpertStaking
  ZeroAmount: "Amount must be greater than zero",
  ZeroAddress: "Invalid address provided",
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

  // EndorsementBidding
  InvalidJob: "This job has not been initialized on-chain",
  InvalidCandidate: "Invalid candidate identifier",
  BidAlreadyExists: "You already have an active bid for this candidate",
  BidIsActive: "Cannot withdraw — bid is still active",
  NoBidToWithdraw: "No bid available to withdraw",
  JobClosed: "This job is no longer accepting endorsements",
  Unauthorized: "You are not authorized for this action",
  SlashPercentageTooHigh: "Slash percentage exceeds the allowed maximum",
  AlreadySlashed: "This bid has already been slashed",
  AlreadyDistributed: "Rewards have already been distributed",

  // ERC20Permit
  ERC2612ExpiredSignature: "Permit signature has expired — please try again",
  ERC2612InvalidSigner: "Invalid permit signature — please reconnect your wallet",

  // RewardDistributor
  ArrayLengthMismatch: "Input arrays must have the same length",
  InsufficientTreasury: "Insufficient funds in the treasury",
  NoRewardWeight: "No reward weight assigned — earn reputation first",
  BatchTooLarge: "Batch size exceeds the maximum allowed",
  DuplicateExpert: "Duplicate expert in the batch",
  ReputationManagerNotSet: "Reputation manager contract is not configured",
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
