"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { messagingApi } from "@/lib/api";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import type { Conversation } from "@/types";
import { Input } from "@/components/ui/input";
import { ConversationList } from "./ConversationList";
import { EmptyInbox } from "./EmptyInbox";
import { DataSection } from "@/lib/motion";

export default function CandidateMessagesInbox() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useFetch<Conversation[]>(
    () => messagingApi.getCandidateConversations(),
    {
      skip: !ready,
      onError: () => { toast.error("Failed to load conversations"); },
    }
  );

  const unreadCount = (conversations ?? []).filter(c => c.unreadCount > 0).length;

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations ?? [];
    const q = search.toLowerCase();
    return (conversations ?? []).filter(c =>
      c.companyName?.toLowerCase().includes(q) ||
      c.jobTitle?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const handleSelect = (conv: Conversation) => {
    router.push(`/candidate/messages/${conv.id}`);
  };

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header (static — always visible) */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Messages</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Conversations with companies about your applications
          </p>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <DataSection isLoading={isLoading} skeleton={null}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filteredConversations.length === 0 ? (
            <EmptyInbox variant="candidate" />
          ) : (
            <ConversationList
              conversations={filteredConversations}
              onSelect={handleSelect}
              variant="candidate"
            />
          )}
        </div>
        </DataSection>
      </div>
    </div>
  );
}
