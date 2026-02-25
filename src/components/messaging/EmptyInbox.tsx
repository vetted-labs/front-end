"use client";

import { MessageSquare, Inbox } from "lucide-react";

interface EmptyInboxProps {
  variant: "company" | "candidate";
}

export function EmptyInbox({ variant }: EmptyInboxProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        {variant === "company" ? (
          <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
        ) : (
          <Inbox className="w-7 h-7 text-muted-foreground/40" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {variant === "company"
          ? "Start a conversation by messaging a candidate from their application."
          : "When a company reaches out about your application, it will appear here."}
      </p>
    </div>
  );
}
