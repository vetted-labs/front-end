"use client";

import { TeamManagement } from "@/components/company/TeamManagement";

/**
 * Wrapper for the existing TeamManagement component so the Settings page can
 * render it inside its left-rail layout. We deliberately don't tweak
 * TeamManagement itself — that component has its own card chrome.
 */
export function TeamSection() {
  return <TeamManagement />;
}
