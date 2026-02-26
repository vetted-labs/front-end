import type { ExpertRole, FeedPrivileges } from "@/types";

const ROLE_RANK: Record<ExpertRole, number> = {
  recruit: 0,
  apprentice: 1,
  craftsman: 2,
  officer: 3,
  master: 4,
};

/**
 * Compute feed privileges from the user's type, expert role, and guild membership.
 *
 * - Candidates: reply only
 * - Recruits: reply only
 * - Apprentice+: can create posts
 * - Craftsman+: can edit others, mark duplicates
 * - Officer+: pin/unpin, close/reopen, accept answers on behalf
 * - Master: full delete/moderation
 */
export function getFeedPrivileges(
  userType?: "candidate" | "company" | "expert" | null,
  expertRole?: ExpertRole,
  isMember?: boolean
): FeedPrivileges {
  const none: FeedPrivileges = {
    canPost: false,
    canReply: false,
    canEditOthers: false,
    canMarkDuplicate: false,
    canPinUnpin: false,
    canCloseReopen: false,
    canAcceptOnBehalf: false,
    canDelete: false,
  };

  if (!isMember || !userType) return none;

  // Candidates can only reply
  if (userType === "candidate") {
    return { ...none, canReply: true };
  }

  // Companies have no feed privileges
  if (userType === "company") return none;

  // Expert privileges depend on role rank
  const rank = expertRole ? ROLE_RANK[expertRole] : -1;

  return {
    canReply: rank >= 0,
    canPost: rank >= ROLE_RANK.apprentice,
    canEditOthers: rank >= ROLE_RANK.craftsman,
    canMarkDuplicate: rank >= ROLE_RANK.craftsman,
    canPinUnpin: rank >= ROLE_RANK.officer,
    canCloseReopen: rank >= ROLE_RANK.officer,
    canAcceptOnBehalf: rank >= ROLE_RANK.officer,
    canDelete: rank >= ROLE_RANK.master,
  };
}
