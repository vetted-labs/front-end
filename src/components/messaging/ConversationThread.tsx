"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/types";

interface ConversationThreadProps {
  messages: Message[];
  currentUserType: "company" | "candidate";
  onRespondToMeeting?: (meetingId: string, status: "accepted" | "declined") => void;
  onProposeNewTime?: (meetingId: string) => void;
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const dateStr = new Date(msg.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.date === dateStr) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateStr, messages: [msg] });
    }
  }
  return groups;
}

export function ConversationThread({
  messages,
  currentUserType,
  onRespondToMeeting,
  onProposeNewTime,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const groups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {groups.map((group) => (
        <div key={group.date} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/30 dark:bg-white/[0.06]" />
            <span className="text-xs font-medium text-muted-foreground/70 flex-shrink-0">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-border/30 dark:bg-white/[0.06]" />
          </div>
          {group.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderType === currentUserType}
              currentUserType={currentUserType}
              onRespondToMeeting={onRespondToMeeting}
              onProposeNewTime={onProposeNewTime}
            />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
