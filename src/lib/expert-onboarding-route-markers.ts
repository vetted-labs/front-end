import type { ExpertStatus } from "@/types";
import {
  EXPERT_ONBOARDING_CHECKLIST_EVENTS,
  type ExpertOnboardingChecklistEvent,
} from "@/lib/expert-onboarding-tour";

export const EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME =
  "vetted:expert-onboarding-checklist-event";
export const EXPERT_SETUP_GUIDE_EVENT_NAME =
  "vetted:expert-setup-guide-start";

interface ExpertOnboardingApprovalOptions {
  profileLoaded: boolean;
  profileStatus?: ExpertStatus | null;
  expertStatus?: string | null;
  expertStatusHydrated: boolean;
  requireSyncedExpertStatus?: boolean;
}

interface ExpertShellStatusOptions {
  isE2E: boolean;
  expertStatus?: string | null;
  expertStatusHydrated: boolean;
  profileLoaded: boolean;
  profileStatus?: ExpertStatus | null;
}

interface ExpertOnboardingIdentityOptions {
  isE2E: boolean;
  authExpertId?: string | null;
  profileLoaded: boolean;
  profileExpertId?: string | null;
}

interface ExpertProfileVerificationErrorOptions {
  isE2E: boolean;
  profileLoaded: boolean;
  profileFound?: boolean | null;
  profileStatus?: ExpertStatus | null;
  profileExpertId?: string | null;
}

function isExpertOnboardingChecklistEvent(
  value: unknown
): value is ExpertOnboardingChecklistEvent {
  return (
    typeof value === "string" &&
    (EXPERT_ONBOARDING_CHECKLIST_EVENTS as readonly string[]).includes(value)
  );
}

export function isApprovedExpertForOnboarding({
  profileLoaded,
  profileStatus,
  expertStatus,
  expertStatusHydrated,
  requireSyncedExpertStatus = false,
}: ExpertOnboardingApprovalOptions): boolean {
  if (!profileLoaded) return false;

  if (profileStatus === "approved") {
    return requireSyncedExpertStatus
      ? expertStatusHydrated && expertStatus === "approved"
      : true;
  }

  if (requireSyncedExpertStatus || profileStatus != null) return false;

  return expertStatusHydrated && expertStatus === "approved";
}

export function getExpertOnboardingEventForRoute(
  pathname: string,
  _search?: Pick<URLSearchParams, "has"> | string
): ExpertOnboardingChecklistEvent | null {
  void _search;

  if (
    pathname === "/expert/voting" ||
    pathname.startsWith("/expert/voting/")
  ) {
    return "applicationsVisited";
  }

  if (
    pathname === "/expert/guilds" ||
    pathname.startsWith("/expert/guilds/") ||
    pathname.startsWith("/expert/guild/")
  ) {
    return "guildsVisited";
  }

  if (
    pathname === "/expert/endorsements" ||
    pathname.startsWith("/expert/endorsements/")
  ) {
    return "endorsementsVisited";
  }

  if (
    pathname === "/expert/governance" ||
    pathname.startsWith("/expert/governance/")
  ) {
    return "governanceVisited";
  }

  if (
    pathname === "/expert/earnings" ||
    pathname.startsWith("/expert/earnings/")
  ) {
    return "rewardsVisited";
  }

  if (
    pathname === "/expert/reputation" ||
    pathname.startsWith("/expert/reputation/")
  ) {
    return "reputationVisited";
  }

  if (
    pathname === "/expert/withdrawals" ||
    pathname.startsWith("/expert/withdrawals/")
  ) {
    return "stakingExplanationViewed";
  }

  if (
    pathname === "/expert/notifications" ||
    pathname.startsWith("/expert/notifications/")
  ) {
    return "notificationsVisited";
  }

  return null;
}

export function resolveVerifiedExpertIdForOnboarding({
  isE2E,
  authExpertId,
  profileLoaded,
  profileExpertId,
}: ExpertOnboardingIdentityOptions): string | null {
  if (isE2E) return authExpertId?.trim() || null;
  if (!profileLoaded) return null;
  return profileExpertId?.trim() || null;
}

export function hasExpertProfileVerificationError({
  isE2E,
  profileLoaded,
  profileFound = true,
  profileStatus,
  profileExpertId,
}: ExpertProfileVerificationErrorOptions): boolean {
  if (isE2E || !profileLoaded) return false;
  if (profileFound === false) return false;
  return !profileStatus || !profileExpertId?.trim();
}

export function dispatchExpertOnboardingChecklistEvent(
  event: ExpertOnboardingChecklistEvent
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME, {
      detail: { event },
    })
  );
}

export function dispatchExpertSetupGuideStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EXPERT_SETUP_GUIDE_EVENT_NAME));
}

export function getExpertOnboardingChecklistEventFromEvent(
  event: Event
): ExpertOnboardingChecklistEvent | null {
  const detail = (event as CustomEvent<{ event?: unknown }>).detail;
  return isExpertOnboardingChecklistEvent(detail?.event) ? detail.event : null;
}

export function resolveVerifiedExpertStatusForShell({
  isE2E,
  expertStatus,
  expertStatusHydrated,
  profileLoaded,
  profileStatus,
}: ExpertShellStatusOptions): string | null {
  if (!expertStatusHydrated) return null;
  if (isE2E) return expertStatus ?? null;
  if (!profileLoaded) return null;
  return profileStatus ?? null;
}
