"use client";

import { useMemo } from "react";
import { useFetch } from "./useFetch";
import { reviewsApi, type ReviewStateResponse } from "@/lib/api";

/**
 * Legacy discriminated-union response shape. `useReviewState` still returns
 * this directly so existing call sites keep working, but new consumers should
 * read from the `envelope` it derives — that pulls additional fields (assigned
 * status, voting phase, on-chain tx hash, draft body+timestamp) which the
 * wave-1 BE drafts agent added on top of `getState`. Older deployments that
 * don't return the extras still parse fine; the envelope just falls back to
 * derived defaults.
 */
export type ReviewState = ReviewStateResponse;

/**
 * Server-side review-state envelope used by the resilient review modal. The
 * BE response is additive on top of the original `ReviewStateResponse` —
 * older fields (`kind`, `txHash`, `commitHash`, `body`) are still present;
 * new fields are optional so we don't break existing consumers if the BE
 * hasn't been redeployed yet.
 */
export interface ReviewStateEnvelope {
  /** Whether the BE has a saved draft for this reviewer + application. */
  hasDraft: boolean;
  /** Draft body (mirrors `kind: "draft"` legacy shape). Empty when no draft. */
  draftBody: Record<string, unknown> | null;
  /** ISO timestamp of the most recent draft write. */
  draftLastModified: string | null;
  /** Whether the reviewer has already submitted an on-chain commit. */
  hasCommittedReview: boolean;
  /** On-chain commit tx hash, if `hasCommittedReview`. */
  onChainCommitTxHash: string | null;
  /** Voting phase reported alongside the state for convenience. */
  votingPhase: string | null;
  /**
   * Whether the current viewer is on the panel for this application. Only
   * trustworthy when the BE actually populated it; treat `null` as "unknown"
   * and fall back to other UI gates.
   */
  isAssignedReviewer: boolean | null;
}

/**
 * Internal: lift a legacy `ReviewStateResponse` (or the same response with
 * additional envelope fields the BE returned) into a uniform envelope.
 * Reads optional fields off the loose record without changing types in
 * `lib/api.ts` — the BE is allowed to be ahead of the FE typings.
 */
function toEnvelope(state: ReviewStateResponse | null): ReviewStateEnvelope {
  // Treat `null` as "still loading" but return a sane skeleton so callers
  // don't have to pre-check.
  if (!state) {
    return {
      hasDraft: false,
      draftBody: null,
      draftLastModified: null,
      hasCommittedReview: false,
      onChainCommitTxHash: null,
      votingPhase: null,
      isAssignedReviewer: null,
    };
  }
  // Spread to read additive fields without coercing the discriminated union.
  const raw = state as ReviewStateResponse & {
    hasDraft?: boolean;
    draftBody?: Record<string, unknown> | null;
    draftLastModified?: string | null;
    hasCommittedReview?: boolean;
    onChainCommitTxHash?: string | null;
    votingPhase?: string | null;
    isAssignedReviewer?: boolean | null;
  };

  // Legacy → envelope synthesis: derive booleans from `kind` so the modal can
  // make a single decision regardless of which BE version is live.
  const legacyDraftBody = state.kind === "draft" ? state.body : null;
  const legacyCommitTxHash = state.kind === "committed" ? state.txHash : null;

  return {
    hasDraft: raw.hasDraft ?? state.kind === "draft",
    draftBody: raw.draftBody ?? legacyDraftBody,
    draftLastModified: raw.draftLastModified ?? null,
    hasCommittedReview: raw.hasCommittedReview ?? state.kind === "committed",
    onChainCommitTxHash: raw.onChainCommitTxHash ?? legacyCommitTxHash,
    votingPhase: raw.votingPhase ?? null,
    isAssignedReviewer: raw.isAssignedReviewer ?? null,
  };
}

/**
 * Fetches the canonical server-side review state for the current reviewer:
 *   - `committed`: vote was submitted on-chain and verified server-side.
 *   - `draft`:     an in-progress draft body exists.
 *   - `empty`:     no draft, no commit yet.
 *
 * Used by review forms to gate the UI between editable / read-only modes.
 *
 * Pass `skip: true` to disable the fetch (e.g. when the host modal is in
 * practice/story mode and the id is synthetic).
 *
 * Returns the legacy `ReviewState` (back-compat) plus a memoized `envelope`
 * with the additional fields the wave-1 BE drafts agent added (assigned
 * status, voting phase, draft last-modified, etc.) and a `refetch` callback
 * the consumer can fire on re-open or after a commit.
 */
export function useReviewState(
  flow: "proposal" | "guildApplication",
  id: string,
  options?: { skip?: boolean },
) {
  const api = flow === "proposal" ? reviewsApi.proposal : reviewsApi.guildApplication;
  const fetch = useFetch<ReviewState>(() => api.getState(id), {
    skip: options?.skip,
  });

  // Memoize so the modal can put `envelope` into useMemo deps without
  // re-running on every render. The synthesized object identity tracks the
  // raw `data` reference, which only changes on refetch.
  const envelope = useMemo(() => toEnvelope(fetch.data), [fetch.data]);

  return {
    ...fetch,
    envelope,
  };
}
