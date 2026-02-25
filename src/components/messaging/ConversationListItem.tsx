"use client";

import { cn, formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { Conversation } from "@/types";

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onClick: () => void;
  variant: "company" | "candidate";
}

export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
  variant,
}: ConversationListItemProps) {
  const status = APPLICATION_STATUS_CONFIG[conversation.applicationStatus] || APPLICATION_STATUS_CONFIG.pending;
  const hasUnread = conversation.unreadCount > 0;

  const displayName =
    variant === "company" ? conversation.candidateName : conversation.companyName;
  const subtitle =
    variant === "company"
      ? conversation.jobTitle
      : `${conversation.jobTitle} at ${conversation.companyName}`;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-colors border-b border-border/20 dark:border-white/[0.03]",
        isSelected
          ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary"
          : "hover:bg-muted/50 dark:hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0",
            isSelected && "ring-2 ring-primary/30"
          )}
        >
          <span className="text-primary font-semibold text-sm">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className={cn(
                "text-sm truncate",
                hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
              )}
            >
              {displayName}
            </span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
              {conversation.lastMessage && formatTimeAgo(conversation.lastMessage.createdAt)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1">{subtitle}</p>
          <div className="flex items-center justify-between gap-2">
            {conversation.lastMessage ? (
              <p
                className={cn(
                  "text-xs truncate flex-1",
                  hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {conversation.lastMessage.content}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground italic">No messages</span>
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${status.className}`}
              >
                {status.label}
              </span>
              {hasUnread && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
