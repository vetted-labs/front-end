"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
  browseSidebarConfig,
  candidateSidebarConfig,
  companySidebarConfig,
  expertSidebarConfig,
  type SidebarConfig,
} from "@/components/layout/sidebar-config";

function resolveConfig(
  isAuthenticated: boolean,
  userType: string | null,
  override?: SidebarConfig
): SidebarConfig {
  if (override) return override;
  if (!isAuthenticated) return browseSidebarConfig;

  switch (userType) {
    case "candidate":
      return candidateSidebarConfig;
    case "company":
      return companySidebarConfig;
    case "expert":
      return expertSidebarConfig;
    default:
      return browseSidebarConfig;
  }
}

/**
 * Returns the correct sidebar config based on auth state.
 * Pass an `override` to lock a layout to a specific config
 * (used for role-specific routes like /candidate/*).
 *
 * Defers auth-aware selection until after mount to avoid
 * hydration mismatches (server has no localStorage).
 */
export function useSidebarConfig(override?: SidebarConfig): SidebarConfig {
  const { isAuthenticated, userType } = useAuthContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return override ?? browseSidebarConfig;

  return resolveConfig(isAuthenticated, userType, override);
}
