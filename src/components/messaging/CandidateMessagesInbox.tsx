"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import type { Conversation } from "@/types";
import { ConversationList } from "./ConversationList";
import { EmptyInbox } from "./EmptyInbox";

export default function CandidateMessagesInbox() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    fetchConversations();
  }, [ready]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messagingApi.getCandidateConversations();
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = (conv: Conversation) => {
    router.push(`/candidate/messages/${conv.id}`);
  };

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversations with companies about your applications
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 dark:border-white/[0.06] bg-card/40 dark:bg-card/30 backdrop-blur-md overflow-hidden">
          {conversations.length === 0 ? (
            <EmptyInbox variant="candidate" />
          ) : (
            <ConversationList
              conversations={conversations}
              onSelect={handleSelect}
              variant="candidate"
            />
          )}
        </div>
      </div>
    </div>
  );
}
