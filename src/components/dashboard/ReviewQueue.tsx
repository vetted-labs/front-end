"use client";

import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import {
  STORY_LAB_GUILD,
  STORY_LAB_REVIEW_APPLICATION_ID,
} from "@/components/expert/story-lab/storyLabFixtures";
import type { GuildApplication } from "@/types";

interface ReviewQueueProps {
  applications: GuildApplication[];
}

const STORY_LAB_QUEUE_ROW: GuildApplication = {
  id: STORY_LAB_REVIEW_APPLICATION_ID,
  candidate_name: "Maya Chen",
  candidate_email: "maya.chen@example.com",
  guild_id: STORY_LAB_GUILD.id,
  guild_name: STORY_LAB_GUILD.name,
  required_stake: 100,
  status: "active",
  created_at: "2026-04-27T12:00:00.000Z",
  voting_deadline: "2026-05-02T12:00:00.000Z",
  vote_count: 1,
  finalized: false,
  is_assigned_reviewer: true,
  has_voted: false,
  item_type: "expert_application",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getReviewUrl(app: GuildApplication): string {
  const base = `/expert/guild/${app.guild_id}`;
  if (app.item_type === "guild_application") {
    return `${base}?tab=membershipApplications&candidateApplicationId=${app.id}`;
  }
  if (app.item_type === "expert_application") {
    return `${base}?tab=applications&applicationId=${app.id}`;
  }
  return `${base}?tab=membershipApplications&applicationId=${app.id}`;
}

export function ReviewQueue({ applications }: ReviewQueueProps) {
  const router = useRouter();
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const effectiveApplications =
    isStoryLabPreview && applications.length === 0
      ? [STORY_LAB_QUEUE_ROW]
      : applications;
  const displayed = effectiveApplications.slice(0, 5);
  const hasMore = effectiveApplications.length > 5;

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-foreground">
          Review Queue
        </span>
        {effectiveApplications.length > 0 && (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS.warning.badge}`}>
            {effectiveApplications.length} pending
          </span>
        )}
      </div>

      {/* Candidate rows */}
      {displayed.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-4">
          No pending reviews
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((app, index) => {
            const isFirst = index === 0;
            const name = app.candidate_name || "Application";
            return (
              <button
                key={`${app.item_type ?? "proposal"}-${app.id}`}
                onClick={() => router.push(getReviewUrl(app))}
                {...(isStoryLabPreview
                  ? { "data-story-lab-review-url": getReviewUrl(app) }
                  : {})}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isFirst
                    ? `${STATUS_COLORS.warning.bgSubtle} border ${STATUS_COLORS.warning.border} hover:bg-warning/[0.08]`
                    : "bg-muted/30 border border-border hover:bg-muted/50"
                }`}
              >
                {/* Avatar */}
                <img
                  src={getPersonAvatar(name)}
                  alt={name}
                  className="w-[34px] h-[34px] rounded-lg object-cover shrink-0 bg-muted"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {app.guild_name || "Guild"}
                    {app.created_at && ` · ${formatTimeAgo(app.created_at)}`}
                  </div>
                </div>

                {/* Action */}
                <span className="shrink-0 px-3 py-1.5 bg-muted/30 border border-border text-muted-foreground rounded-[7px] text-xs font-medium">
                  Review →
                </span>
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => router.push("/expert/applications")}
              className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              View all assigned →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
