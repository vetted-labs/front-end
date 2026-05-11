"use client";
import { use } from "react";
import { redirect } from "next/navigation";

/**
 * Legacy URL → review modal redirect. The previous target
 * (`/expert/guild/[id]?tab=membershipApplications&applicationId=...`) pointed
 * at a tab name the workspace page no longer recognizes, so the route
 * silently fell back to the Queue tab and the modal never opened — one of
 * the entry points reported by the bug bounty.
 *
 * The new target is `/expert/voting?reviewAppId=...&reviewType=expert&guildId=...`
 * which `ApplicationsPage` consumes and uses to auto-open the review modal
 * once the matching application has hydrated.
 */
export default function LegacyApplicationReviewPage({
  params,
}: {
  params: Promise<{ guildId: string; applicationId: string }>;
}) {
  const { guildId, applicationId } = use(params);
  redirect(
    `/expert/voting?reviewAppId=${encodeURIComponent(applicationId)}&reviewType=expert&guildId=${encodeURIComponent(guildId)}`
  );
}
