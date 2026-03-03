import type { ApplicationStatus } from "@/types";

/** Allowed forward transitions from each status. Mirrors backend ALLOWED_TRANSITIONS. */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending: ["reviewing", "rejected"],
  reviewing: ["interviewed", "rejected"],
  interviewed: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

/** The linear pipeline stages (excluding rejected, which is a branch-off). */
export const PIPELINE_STAGES: ApplicationStatus[] = [
  "pending",
  "reviewing",
  "interviewed",
  "accepted",
];

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(
  current: ApplicationStatus,
): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return status === "accepted" || status === "rejected";
}
