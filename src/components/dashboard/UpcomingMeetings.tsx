"use client";

import { useRouter } from "next/navigation";
import { Video, Calendar, ArrowRight, ChevronRight } from "lucide-react";
import { messagingApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import type { UpcomingMeeting, MeetingStatus } from "@/types";

interface UpcomingMeetingsProps {
  userType: "candidate" | "company";
}

const STATUS_STYLES: Record<MeetingStatus, { color: string; iconColor: string }> = {
  pending: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", iconColor: "text-amber-500" },
  accepted: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", iconColor: "text-emerald-500" },
  declined: { color: "text-red-500 bg-red-500/10 border-red-500/20", iconColor: "text-red-500" },
  new_time_proposed: { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", iconColor: "text-blue-500" },
};

function formatMeetingTime(scheduledAt: string): string {
  const now = new Date();
  const meeting = new Date(scheduledAt);
  const diffMs = meeting.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);

  if (diffMs < 0) return "Past";
  if (diffMin < 60) return `In ${diffMin} min`;
  if (diffHours < 24) return `In ${diffHours} hr${diffHours !== 1 ? "s" : ""}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    meeting.getDate() === tomorrow.getDate() &&
    meeting.getMonth() === tomorrow.getMonth() &&
    meeting.getFullYear() === tomorrow.getFullYear();

  const timeStr = meeting.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isTomorrow) return `Tomorrow at ${timeStr}`;

  return meeting.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + ` at ${timeStr}`;
}

export function UpcomingMeetings({ userType }: UpcomingMeetingsProps) {
  const router = useRouter();

  const { data: meetingsData, isLoading } = useFetch(
    () => messagingApi.getUpcomingMeetings({ limit: 5 })
  );

  const meetings: UpcomingMeeting[] = meetingsData
    ? (Array.isArray(meetingsData) ? meetingsData : (meetingsData as { meetings?: UpcomingMeeting[] })?.meetings || [])
    : [];

  const getConversationPath = (conversationId: string) =>
    userType === "candidate"
      ? `/candidate/messages?conversation=${conversationId}`
      : `/dashboard/messages?conversation=${conversationId}`;

  const messagesPath = userType === "candidate" ? "/candidate/messages" : "/dashboard/messages";

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Upcoming Meetings
        </h2>
        {meetings.length > 0 && (
          <button
            onClick={() => router.push(messagesPath)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center py-10 px-6">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No upcoming meetings</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {meetings.map((meeting) => {
            const style = STATUS_STYLES[meeting.status] || STATUS_STYLES.pending;
            return (
              <button
                key={meeting.id}
                onClick={() => router.push(getConversationPath(meeting.conversationId))}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-left hover:bg-muted/30 transition-colors group"
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-card/60 border border-border/40 flex items-center justify-center`}>
                  <Video className={`w-4 h-4 ${style.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {meeting.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {meeting.counterpartyName} &middot; {meeting.jobTitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {formatMeetingTime(meeting.scheduledAt)}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${style.color}`}
                >
                  {meeting.status === "new_time_proposed" ? "New Time" : meeting.status}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
