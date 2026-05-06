"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";
import { PendingExpertShell } from "@/components/layout/PendingExpertShell";
import {
  expertSidebarConfig,
  restrictedExpertSidebarConfig,
} from "@/components/layout/sidebar-config";
import { ExpertSetupGuide } from "@/components/expert/onboarding/ExpertSetupGuide";
import { ExpertStoryLabDriver } from "@/components/expert/story-lab/ExpertStoryLabDriver";
import { StoryLabLeakDetector } from "@/components/expert/story-lab/StoryLabLeakDetector";
import { expertApi } from "@/lib/api";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useExpertOnboardingTour } from "@/lib/hooks/useExpertOnboardingTour";
import {
  getStoryLabLaunchRoute,
  isExpertStoryLabCompletionSearchParams,
  isExpertStoryLabSearchParams,
} from "@/components/expert/story-lab/storyLabData";
import {
  EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME,
  getExpertOnboardingChecklistEventFromEvent,
  getExpertOnboardingEventForRoute,
  hasExpertProfileVerificationError,
  isApprovedExpertForOnboarding,
  resolveVerifiedExpertIdForOnboarding,
  resolveVerifiedExpertStatusForShell,
} from "@/lib/expert-onboarding-route-markers";
import { useAuthContext } from "@/hooks/useAuthContext";
import { isRecentExplicitLogout } from "@/contexts/AuthContext";
import type { ExpertStatus } from "@/types";
import {
  buildExpertOnboardingStorageKey,
  getExpertOnboardingState,
  type ExpertOnboardingState,
} from "@/lib/expert-onboarding-tour";


/** Routes a restricted expert (pending / rejected) is allowed to visit */
const RESTRICTED_ALLOWED_PREFIXES = [
  "/expert/application-pending",
  "/expert/apply",
  "/guilds",
];

/**
 * Dispatched by the apply-submit handler with the new expert profile from the
 * apply response payload, so the layout can seed `profileVerification` without
 * an immediate refetch (avoids replica-lag / read-after-write races).
 */
const EXPERT_PROFILE_SEED_EVENT = "vetted:expert-profile-seed";

interface ExpertProfileSeedDetail {
  walletAddress: string;
  expertId: string;
  status: ExpertStatus;
}

/**
 * Routes that render a full-screen chromeless shell (no sidebar). This is
 * reserved for the onboarding application form itself — every other expert
 * route uses the sidebar layout, including the status page for
 * pending / rejected users.
 */
const CHROMELESS_PREFIXES = ["/expert/apply"];

function isAllowedForRestricted(pathname: string) {
  return RESTRICTED_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isChromelessRoute(pathname: string) {
  return CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function hasCompletedOnboardingHint({
  expertId,
  walletAddress,
}: {
  expertId?: string | null;
  walletAddress?: string | null;
}): boolean {
  if (typeof window === "undefined") return false;

  const localStorageExpertId = window.localStorage.getItem("expertId");
  const keys = new Set(
    [
      buildExpertOnboardingStorageKey({ expertId, walletAddress }),
      buildExpertOnboardingStorageKey({
        expertId: localStorageExpertId,
        walletAddress,
      }),
      buildExpertOnboardingStorageKey({ walletAddress }),
    ].filter((key): key is string => Boolean(key))
  );

  for (const key of keys) {
    if (getExpertOnboardingState(window.localStorage, key).completed) return true;
  }

  return false;
}

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isE2E = process.env.NEXT_PUBLIC_E2E_MODE === "true";
  const isStoryLabPreview = isExpertStoryLabSearchParams(searchParams);
  const isStoryLabCompletionReturn = isExpertStoryLabCompletionSearchParams(searchParams);
  const isStoryLabRoute = isStoryLabPreview || isStoryLabCompletionReturn;
  const canUseLocalStoryLabPreview =
    isStoryLabRoute && (isE2E || process.env.NODE_ENV !== "production");
  const { address: wagmiAddress, isConnected, status } = useAccount();
  const auth = useAuthContext();
  const authExpertId = auth.userId;
  // In E2E mode, fall back to localStorage wallet address when wagmi isn't connected
  const canUseLocalStorageWalletFallback = isE2E || process.env.NODE_ENV !== "production";
  const storedExpertWallet =
    canUseLocalStorageWalletFallback &&
    typeof window !== "undefined" &&
    localStorage.getItem("userType") === "expert"
      ? localStorage.getItem("walletAddress") ?? undefined
      : undefined;
  const hasExpertSessionWallet =
    auth.userType === "expert" && (!!auth.walletAddress || !!storedExpertWallet);
  const expertSessionWallet = auth.walletAddress || storedExpertWallet;
  const address =
    wagmiAddress ||
    ((isE2E || hasExpertSessionWallet) ? expertSessionWallet : undefined);
  const hasCompletedOnboardingFastHint = hasCompletedOnboardingHint({
    expertId: authExpertId,
    walletAddress: address,
  });
  const { expertStatus, isHydrated, setExpertStatus, clearExpertStatus } = useExpertStatus();
  const [profileVerification, setProfileVerification] = useState<{
    address: string | null;
    loaded: boolean;
    found?: boolean | null;
    expertId?: string | null;
    status?: ExpertStatus | null;
    onboardingState?: ExpertOnboardingState | null;
    error?: boolean;
  }>({
    address: null,
    loaded: false,
    found: null,
    expertId: null,
    status: null,
    onboardingState: null,
    error: false,
  });
  const canUseUnauthenticatedStoryLabPreview =
    canUseLocalStoryLabPreview && !address;
  const profileVerificationLoaded =
    canUseUnauthenticatedStoryLabPreview ||
    isE2E ||
    (profileVerification.loaded && profileVerification.address === (address ?? null));
  const verifiedExpertStatus = resolveVerifiedExpertStatusForShell({
    isE2E,
    expertStatus,
    expertStatusHydrated: isHydrated,
    profileLoaded: profileVerificationLoaded,
    profileStatus: canUseUnauthenticatedStoryLabPreview || isE2E ? undefined : profileVerification.status,
  });
  const verifiedExpertId = resolveVerifiedExpertIdForOnboarding({
    isE2E,
    authExpertId,
    profileLoaded: profileVerificationLoaded,
    profileExpertId: profileVerification.expertId,
  });
  const hasMalformedProfileVerification = hasExpertProfileVerificationError({
    isE2E,
    profileLoaded: profileVerificationLoaded,
    profileFound: profileVerification.found,
    profileStatus: profileVerification.status,
    profileExpertId: profileVerification.expertId,
  });
  const isApprovedForOnboardingProgress = isApprovedExpertForOnboarding({
    profileLoaded: profileVerificationLoaded,
    profileStatus: canUseUnauthenticatedStoryLabPreview || isE2E ? undefined : profileVerification.status,
    expertStatus,
    expertStatusHydrated: isHydrated,
    requireSyncedExpertStatus: !canUseLocalStoryLabPreview && !isE2E,
  });
  const persistOnboardingState = useCallback(
    async (state: ExpertOnboardingState) => {
      const persistedState = await expertApi.updateOnboardingState(state, address);
      setProfileVerification((current) =>
        current.address === (address ?? null)
          ? { ...current, onboardingState: persistedState }
          : current
      );
      return persistedState;
    },
    [address]
  );
  const onboardingProgress = useExpertOnboardingTour({
    expertId: hasMalformedProfileVerification ? null : verifiedExpertId,
    walletAddress: address,
    isApprovedExpert:
      !isStoryLabRoute &&
      isApprovedForOnboardingProgress &&
      (isE2E || verifiedExpertId !== null) &&
      !hasMalformedProfileVerification,
    isDashboardRoute: false,
    profileLoaded: profileVerificationLoaded,
    serverState: profileVerification.onboardingState ?? null,
    onStateChange: isStoryLabPreview ? undefined : persistOnboardingState,
  });
  const { markChecklistEvent: markOnboardingChecklistEvent } = onboardingProgress;

  // Both "pending" and "rejected" experts are restricted — they can only see
  // the status page, apply flow, and guild browsing. Anything else (dashboard,
  // voting, rewards, etc.) redirects back to the status page.
  const isRestrictedStatus =
    verifiedExpertStatus === "pending" || verifiedExpertStatus === "rejected";
  const shouldEnforceRestrictedStatus = profileVerificationLoaded && isRestrictedStatus;

  // Resolve checked synchronously when possible to avoid an extra render cycle.
  // If hydrated + wallet connected + not restricted → show children immediately.
  const canShow = isHydrated && (isE2E || status !== "reconnecting" && status !== "connecting")
    && (isE2E ? !!address : (isConnected || status === "disconnected"))
    && !shouldEnforceRestrictedStatus;
  const [checked, setChecked] = useState(canShow);
  const verifiedRef = useRef(false);
  const [verificationTick, setVerificationTick] = useState(0);
  const profileStatusRef = useRef<ExpertStatus | null | undefined>(profileVerification.status);
  // eslint-disable-next-line no-restricted-syntax -- keeps stable status reference for cross-tab event handlers
  useEffect(() => {
    profileStatusRef.current = profileVerification.status;
  }, [profileVerification.status]);

  // Auth guard — redirect disconnected wallets or restricted experts
  // eslint-disable-next-line no-restricted-syntax -- guards route access based on wagmi + expert status
  useEffect(() => {
    if (!isHydrated) return;
    if (status === "reconnecting" || status === "connecting") return;

    if (!isConnected && !address && !isE2E) {
      // If the user just clicked a logout/disconnect button, skip the debounce
      // and trust the navigation already in flight from that handler.
      if (isRecentExplicitLogout()) return;

      const timer = setTimeout(() => {
        setChecked(false);
        router.replace(`/auth/login?type=expert&redirect=${encodeURIComponent(pathname)}`);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (shouldEnforceRestrictedStatus && !isAllowedForRestricted(pathname)) {
      router.replace("/expert/application-pending");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auth guard releases the shell after wallet/status checks settle
      setChecked(true);
    }
  }, [pathname, router, shouldEnforceRestrictedStatus, isHydrated, status, isConnected, address, isE2E]);

  // Reset verification when wallet address changes
  // eslint-disable-next-line no-restricted-syntax -- resets verification when wallet changes
  useEffect(() => {
    verifiedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset cached backend verification when the wallet identity changes
    setProfileVerification({
      address: address ?? null,
      loaded: false,
      found: null,
      expertId: null,
      status: null,
      onboardingState: null,
      error: false,
    });
  }, [address]);

  // Write-through cache: the apply-submit handler dispatches this event with
  // the new expert profile from the apply response. Same DB transaction that
  // wrote the row, so there is no race vs. an immediate getProfile refetch.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to cross-component DOM event
  useEffect(() => {
    if (!address) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ExpertProfileSeedDetail>).detail;
      if (!detail || detail.walletAddress?.toLowerCase() !== address.toLowerCase()) return;
      verifiedRef.current = true;
      profileStatusRef.current = detail.status;
      setProfileVerification({
        address,
        loaded: true,
        found: true,
        expertId: detail.expertId,
        status: detail.status,
        onboardingState: null,
        error: false,
      });
    };
    window.addEventListener(EXPERT_PROFILE_SEED_EVENT, handler);
    return () => window.removeEventListener(EXPERT_PROFILE_SEED_EVENT, handler);
  }, [address]);

  // Cross-tab and same-tab invalidation when expertStatus changes (apply,
  // withdraw, approve, dispute, etc.). Skipped when the new value matches our
  // current profile status to avoid looping with the verification effect's
  // own setExpertStatus call below.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to cross-tab storage and same-tab status events
  useEffect(() => {
    if (!address) return;
    const invalidate = () => {
      const next =
        typeof window === "undefined" ? null : window.localStorage.getItem("expertStatus");
      if (next === profileStatusRef.current) return;
      verifiedRef.current = false;
      setVerificationTick((t) => t + 1);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "expertStatus") invalidate();
    };
    window.addEventListener("expertStatusChange", invalidate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("expertStatusChange", invalidate);
      window.removeEventListener("storage", onStorage);
    };
  }, [address]);

  // Backend verification — source of truth, prevents localStorage tampering
  // Skip in E2E mode — tests use mocked APIs and fake wallet addresses
  // eslint-disable-next-line no-restricted-syntax -- verifies expert status against backend
  useEffect(() => {
    if (canUseUnauthenticatedStoryLabPreview || isE2E) return;
    if (!address) return;
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    let cancelled = false;

    Promise.all([
      expertApi.getProfile(address),
      expertApi.getOnboardingState(address).catch(() => null),
    ]).then(([result, onboardingState]) => {
      if (cancelled) return;
      const resolvedStatus = result?.status;
      setProfileVerification({
        address,
        loaded: true,
        found: true,
        expertId: result?.id ?? null,
        status: resolvedStatus ?? null,
        onboardingState: onboardingState ?? result?.onboardingState ?? null,
        error: false,
      });
      if (resolvedStatus) {
        setExpertStatus(resolvedStatus);
      }
    }).catch((err) => {
      if (cancelled) return;
      // No expert profile exists for this wallet — redirect to apply
      if (err?.status === 404) {
        setProfileVerification({
          address,
          loaded: true,
          found: false,
          expertId: null,
          status: null,
          onboardingState: null,
          error: false,
        });
        localStorage.removeItem("expertId");
        clearExpertStatus();
        router.replace("/expert/apply");
      } else {
        verifiedRef.current = false;
        setProfileVerification({
          address,
          loaded: true,
          found: null,
          expertId: null,
          status: null,
          onboardingState: null,
          error: true,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address, authExpertId, router, setExpertStatus, clearExpertStatus, canUseUnauthenticatedStoryLabPreview, isE2E, verificationTick]);

  // eslint-disable-next-line no-restricted-syntax -- redirects restricted verified expert profiles after route changes
  useEffect(() => {
    if (!profileVerificationLoaded) return;
    if (
      shouldEnforceRestrictedStatus &&
      (profileVerification.status === "pending" || profileVerification.status === "rejected") &&
      !isAllowedForRestricted(pathname)
    ) {
      router.replace("/expert/application-pending");
    }
  }, [pathname, profileVerification.status, profileVerificationLoaded, router, shouldEnforceRestrictedStatus]);

  // eslint-disable-next-line no-restricted-syntax -- records durable onboarding progress from expert route visits
  useEffect(() => {
    if (
      isStoryLabPreview ||
      !isApprovedForOnboardingProgress ||
      hasMalformedProfileVerification ||
      (!isE2E && verifiedExpertId === null)
    ) return;

    const event = getExpertOnboardingEventForRoute(pathname, searchParams);
    if (!event) return;

    markOnboardingChecklistEvent(event);
  }, [
    hasMalformedProfileVerification,
    isApprovedForOnboardingProgress,
    isE2E,
    isStoryLabPreview,
    markOnboardingChecklistEvent,
    pathname,
    searchParams,
    verifiedExpertId,
  ]);

  // eslint-disable-next-line no-restricted-syntax -- records checklist progress only after review UIs prove they opened
  useEffect(() => {
    if (
      isStoryLabPreview ||
      !isApprovedForOnboardingProgress ||
      hasMalformedProfileVerification ||
      (!isE2E && verifiedExpertId === null)
    ) return;

    const handleChecklistEvent = (event: Event) => {
      const checklistEvent = getExpertOnboardingChecklistEventFromEvent(event);
      if (!checklistEvent) return;
      markOnboardingChecklistEvent(checklistEvent);
    };

    window.addEventListener(
      EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME,
      handleChecklistEvent
    );

    return () => {
      window.removeEventListener(
        EXPERT_ONBOARDING_CHECKLIST_EVENT_NAME,
        handleChecklistEvent
      );
    };
  }, [
    hasMalformedProfileVerification,
    isApprovedForOnboardingProgress,
    isE2E,
    isStoryLabPreview,
    markOnboardingChecklistEvent,
    verifiedExpertId,
  ]);

  const shouldForceExpertStoryStart =
    !isStoryLabPreview &&
    !isStoryLabCompletionReturn &&
    isApprovedForOnboardingProgress &&
    onboardingProgress.isHydrated &&
    !hasMalformedProfileVerification &&
    profileVerificationLoaded &&
    (isE2E || verifiedExpertId !== null) &&
    !onboardingProgress.hasCompletedSetup;
  const shouldSuppressStoryLabDriver =
    isStoryLabPreview &&
    !canUseUnauthenticatedStoryLabPreview &&
    (hasCompletedOnboardingFastHint ||
      !profileVerificationLoaded ||
      profileVerification.onboardingState?.completed === true);

  // eslint-disable-next-line no-restricted-syntax -- first-run experts must complete story mode before using deep-linked expert pages
  useEffect(() => {
    if (!shouldForceExpertStoryStart) return;
    if (isChromelessRoute(pathname)) return;
    router.replace(getStoryLabLaunchRoute());
  }, [pathname, router, shouldForceExpertStoryStart]);

   
  useLayoutEffect(() => {
    if (!isStoryLabPreview || canUseUnauthenticatedStoryLabPreview) return;
    if (hasCompletedOnboardingFastHint) {
      router.replace("/expert/dashboard", { scroll: false });
      return;
    }
    if (!profileVerificationLoaded) return;
    if (profileVerification.onboardingState?.completed !== true) return;
    router.replace("/expert/dashboard", { scroll: false });
  }, [
    canUseUnauthenticatedStoryLabPreview,
    hasCompletedOnboardingFastHint,
    isStoryLabPreview,
    profileVerification.onboardingState,
    profileVerificationLoaded,
    router,
  ]);

  // /expert/apply is a full-screen onboarding form with its own chrome.
  // Render it without the sidebar, regardless of expert status.
  if (isChromelessRoute(pathname)) {
    if (profileVerification.error || hasMalformedProfileVerification) {
      return (
        <PendingExpertShell>
          <div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted-foreground">
            We could not verify your expert profile. Refresh the page to try again.
          </div>
        </PendingExpertShell>
      );
    }
    return <PendingExpertShell>{children}</PendingExpertShell>;
  }

  // Synchronous route-access check — runs on every render, NOT inside a
  // useEffect. This is what prevents the "dashboard flashes before redirect"
  // bug: if a restricted user is on a forbidden route, we render the shell
  // but suppress children until the useEffect redirect lands them on the
  // status page. React never commits the forbidden page to the DOM.
  const isForbiddenRoute =
    shouldEnforceRestrictedStatus && !isAllowedForRestricted(pathname);
  const isAwaitingWalletAuth =
    !isE2E &&
    (status === "reconnecting" ||
      status === "connecting" ||
      (!isConnected && !address));
  const isAwaitingProfileVerification =
    !isE2E &&
    Boolean(address) &&
    !profileVerificationLoaded;

  // While the wallet is reconnecting or the auth guard hasn't settled, keep
  // the shell mounted. Only confirmed pending/rejected experts suppress
  // protected children.
  const isWaitingForAuth =
    !checked ||
    isAwaitingWalletAuth ||
    isAwaitingProfileVerification;

  // Suppress children if:
  //  1. The user is in a restricted status on a forbidden route (redirect
  //     is being handled by the useEffect above), OR
  //  2. We haven't finished verifying auth yet and localStorage status is
  //     unknown — avoids rendering any privileged page content speculatively.
  const shouldSuppressChildren =
    isForbiddenRoute ||
    isAwaitingWalletAuth ||
    isAwaitingProfileVerification ||
    (isWaitingForAuth && shouldEnforceRestrictedStatus);

  const activeConfig = shouldEnforceRestrictedStatus
    ? restrictedExpertSidebarConfig
    : expertSidebarConfig;
  return (
    <AppShell config={activeConfig}>
      {shouldSuppressChildren ? null : children}
      {!shouldSuppressStoryLabDriver && <ExpertStoryLabDriver />}
      <StoryLabLeakDetector />
      <ExpertSetupGuide
        enabled={false}
        checklistEvents={onboardingProgress.checklistEvents}
        markChecklistEvent={markOnboardingChecklistEvent}
      />
    </AppShell>
  );
}
