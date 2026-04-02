"use client";
import { use } from "react";
import { redirect } from "next/navigation";

export default function LegacyApplicationReviewPage({
  params,
}: {
  params: Promise<{ guildId: string; applicationId: string }>;
}) {
  const { guildId, applicationId } = use(params);
  redirect(`/expert/guild/${guildId}?tab=membershipApplications&applicationId=${applicationId}`);
}
