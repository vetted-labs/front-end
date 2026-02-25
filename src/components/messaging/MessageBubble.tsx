"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { MeetingMessage } from "./MeetingMessage";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserType?: "company" | "candidate";
  onRespondToMeeting?: (meetingId: string, status: "accepted" | "declined") => void;
  onProposeNewTime?: (meetingId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  currentUserType,
  onRespondToMeeting,
  onProposeNewTime,
}: MessageBubbleProps) {
  if (message.type === "meeting_scheduled" && message.meetingDetails) {
    return (
      <MeetingMessage
        message={message}
        currentUserType={currentUserType}
        onRespond={onRespondToMeeting}
        onProposeNewTime={onProposeNewTime}
      />
    );
  }

  if (message.type === "meeting_response") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message.content}</span>
      </div>
    );
  }

  if (message.type === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message.content}</span>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex animate-message-in", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-4 py-2.5",
          isOwn
            ? "bg-gradient-to-br from-primary/90 to-primary text-white rounded-2xl rounded-br-sm shadow-md shadow-primary/10"
            : "bg-muted/50 dark:bg-white/[0.08] text-foreground rounded-2xl rounded-bl-sm shadow-sm"
        )}
      >
        {!isOwn && (
          <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
            {message.senderName}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={cn(
            "text-[11px] mt-1",
            isOwn ? "text-white/60 text-right" : "text-muted-foreground/60"
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
