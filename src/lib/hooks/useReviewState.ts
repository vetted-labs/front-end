"use client";

import { useFetch } from "./useFetch";
import { reviewsApi, type ReviewStateResponse } from "@/lib/api";

export type ReviewState = ReviewStateResponse;

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
 */
export function useReviewState(
  flow: "proposal" | "guildApplication",
  id: string,
  options?: { skip?: boolean }
) {
  const api = flow === "proposal" ? reviewsApi.proposal : reviewsApi.guildApplication;
  return useFetch<ReviewState>(() => api.getState(id), {
    skip: options?.skip,
  });
}
