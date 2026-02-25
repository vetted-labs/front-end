"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/hooks/useAuthContext";

/**
 * Hook that guards a page for authenticated users of a specific type.
 * Redirects to login if not authenticated. Returns the auth context.
 *
 * @param userType - "candidate" or "company"
 * @returns auth context + a `ready` boolean indicating the guard check passed
 */
export function useRequireAuth(userType: "candidate" | "company") {
  const auth = useAuthContext();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;

    if (!auth.isAuthenticated) {
      redirected.current = true;
      router.push(`/auth/login?type=${userType}`);
      return;
    }

    // If the user is the wrong type, redirect to their dashboard
    if (auth.userType && auth.userType !== userType) {
      redirected.current = true;
      const target = auth.userType === "company" ? "/dashboard" : "/candidate/dashboard";
      router.push(target);
    }
  }, [auth.isAuthenticated, auth.userType, router, userType]);

  const ready = auth.isAuthenticated && (!auth.userType || auth.userType === userType);

  return { auth, ready };
}
