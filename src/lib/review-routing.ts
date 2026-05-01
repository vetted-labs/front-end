import type { GuildApplication } from "@/types";

export type ReviewApplicantType = "expert" | "candidate";

export function getReviewApplicantType(app: Pick<GuildApplication, "item_type">): ReviewApplicantType {
  return app.item_type === "guild_application" ? "candidate" : "expert";
}

export function getGuildReviewUrl(guildId: string, applicationId: string, applicantType: ReviewApplicantType): string {
  const params = new URLSearchParams({
    tab: "membershipApplications",
    applicationId,
    applicantType,
  });
  return `/expert/guild/${encodeURIComponent(guildId)}?${params.toString()}`;
}

export function getReviewQueueUrl(app: GuildApplication): string {
  if (app.item_type === "expert_application" || app.item_type === "guild_application") {
    return getGuildReviewUrl(app.guild_id, app.id, getReviewApplicantType(app));
  }

  return `/expert/voting/applications/${encodeURIComponent(app.id)}`;
}
