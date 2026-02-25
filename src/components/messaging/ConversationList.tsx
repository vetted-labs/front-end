"use client";

import type { Conversation } from "@/types";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  variant: "company" | "candidate";
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  variant,
}: ConversationListProps) {
  if (conversations.length === 0) return null;

  return (
    <div className="overflow-y-auto flex-1">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onClick={() => onSelect(conv)}
          variant={variant}
        />
      ))}
    </div>
  );
}
