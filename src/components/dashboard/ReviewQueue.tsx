"use client";

import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import type { GuildApplication } from "@/types";

interface ReviewQueueProps {
  applications: GuildApplication[];
}

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
  const displayed = applications.slice(0, 5);
  const hasMore = applications.length > 5;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-semibold text-zinc-200">
          Review Queue
        </span>
        {applications.length > 0 && (
          <span className="px-2.5 py-0.5 bg-amber-500/[0.12] text-amber-300 rounded-full text-[11px] font-semibold">
            {applications.length} pending
          </span>
        )}
      </div>

      {/* Candidate rows */}
      {displayed.length === 0 ? (
        <p className="text-center text-[12px] text-zinc-600 py-4">
          No pending reviews
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displayed.map((app, index) => {
            const isFirst = index === 0;
            const name = app.candidate_name || "Application";
            return (
              <button
                key={`${app.item_type ?? "proposal"}-${app.id}`}
                onClick={() => router.push(getReviewUrl(app))}
                className={`flex items-center gap-3 p-3 rounded-[10px] text-left transition-colors ${
                  isFirst
                    ? "bg-amber-500/[0.05] border border-amber-500/[0.10] hover:bg-amber-500/[0.08]"
                    : "bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    isFirst
                      ? "bg-amber-500/[0.12] text-amber-400"
                      : "bg-indigo-500/[0.12] text-indigo-300"
                  }`}
                >
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-200 truncate">
                    {name}
                  </div>
                  <div className="text-[11px] text-zinc-600 truncate">
                    {app.guild_name || "Guild"}
                    {app.created_at && ` · ${formatTimeAgo(app.created_at)}`}
                  </div>
                </div>

                {/* Action */}
                <span className="shrink-0 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] text-zinc-400 rounded-[7px] text-[11px] font-medium">
                  Review →
                </span>
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => router.push("/expert/applications")}
              className="text-center text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              View all assigned →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
