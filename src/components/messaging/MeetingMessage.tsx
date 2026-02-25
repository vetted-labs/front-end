"use client";

import { useState } from "react";
import { Calendar, Clock, ExternalLink, Video, Check, X, CalendarClock } from "lucide-react";
import type { Message, MeetingStatus } from "@/types";

interface MeetingMessageProps {
  message: Message;
  currentUserType?: "company" | "candidate";
  onRespond?: (meetingId: string, status: "accepted" | "declined") => void;
  onProposeNewTime?: (meetingId: string) => void;
}

const providerLabels: Record<string, string> = {
  google_meet: "Google Meet",
  calendly: "Calendly",
  custom: "Meeting Link",
};

const STATUS_STYLES: Record<MeetingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  accepted: { label: "Accepted", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  declined: { label: "Declined", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
  new_time_proposed: { label: "New Time Proposed", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
};

export function MeetingMessage({
  message,
  currentUserType,
  onRespond,
  onProposeNewTime,
}: MeetingMessageProps) {
  const meeting = message.meetingDetails;
  const [isResponding, setIsResponding] = useState(false);

  if (!meeting) return null;

  // Normalize meeting ID — backend may return _id (MongoDB) instead of id
  const meetingId =
    meeting.id ||
    (meeting as Record<string, unknown>)._id as string | undefined ||
    message.id; // fallback to message ID

  const status: MeetingStatus = meeting.status ?? "pending";
  const statusStyle = STATUS_STYLES[status];
  // Show response buttons when:
  // - Candidate: meeting is pending (accept/decline/propose new time)
  // - Company: meeting has new_time_proposed (accept/decline the proposed time)
  const canRespond =
    !!meetingId &&
    !!onRespond &&
    ((status === "pending" && currentUserType === "candidate") ||
     (status === "new_time_proposed" && currentUserType === "company"));

  const date = new Date(meeting.scheduledAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleRespond = async (responseStatus: "accepted" | "declined") => {
    if (!meetingId || !onRespond) return;
    setIsResponding(true);
    try {
      await onRespond(meetingId, responseStatus);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="flex justify-center py-2">
      <div className="w-full max-w-sm rounded-xl border border-border/40 dark:border-white/[0.10] bg-card/60 dark:bg-card/30 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 dark:border-white/[0.04] bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Meeting Scheduled
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.color}`}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{meeting.title}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate} at {formattedTime}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {meeting.duration} min
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {providerLabels[meeting.provider] || meeting.provider}
          </p>

          {/* Proposed new time info */}
          {meeting.response?.proposedTime && (
            <div className="mt-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs font-medium text-blue-500 flex items-center gap-1 mb-1">
                <CalendarClock className="w-3 h-3" />
                Proposed New Time
              </p>
              <p className="text-xs text-foreground">
                {new Date(meeting.response.proposedTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(meeting.response.proposedTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {meeting.response.proposedNote && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  &ldquo;{meeting.response.proposedNote}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/40 dark:border-white/[0.04]">
          {canRespond ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRespond("accepted")}
                disabled={isResponding}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                Accept
              </button>
              <button
                onClick={() => handleRespond("declined")}
                disabled={isResponding}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 dark:border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-red-500/40 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                Decline
              </button>
              {onProposeNewTime && meetingId && currentUserType === "candidate" && (
                <button
                  onClick={() => onProposeNewTime(meetingId)}
                  disabled={isResponding}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 dark:border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-blue-500/40 transition-colors disabled:opacity-50"
                >
                  <CalendarClock className="w-3 h-3" />
                  New Time
                </button>
              )}
            </div>
          ) : status !== "declined" ? (
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              Join Meeting
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Meeting declined
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
