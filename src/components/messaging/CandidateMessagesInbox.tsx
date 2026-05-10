"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Search, X } from "lucide-react";
import { messagingApi } from "@/lib/api";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useMessagePolling } from "@/lib/hooks/useMessagePolling";
import { logger } from "@/lib/logger";
import type { Conversation, Message } from "@/types";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { ProposeNewTimeModal } from "./ProposeNewTimeModal";
import { EmptyInbox } from "./EmptyInbox";
import { DataSection } from "@/lib/motion";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";
import { getCompanyAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import {
  MessagesHero,
  ConversationListPanel,
  EmptyConversationPane,
} from "./shared/MessageHelpers";

export default function CandidateMessagesInbox() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [proposeModalMeetingId, setProposeModalMeetingId] = useState<
    string | null
  >(null);
  const { execute: executePropose, isLoading: isProposing } = useApi<Message>();

  const { isLoading } = useFetch<Conversation[]>(
    () => messagingApi.getCandidateConversations(),
    {
      skip: !ready,
      onSuccess: (data) => {
        setConversations(data);
      },
      onError: () => {
        toast.error("Failed to load conversations");
      },
    },
  );

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { conversation: conv, messages: msgs } =
        await messagingApi.getConversation(conversationId);
      setSelectedConversation(conv);
      setMessages(msgs || []);
      await messagingApi.markAsRead(conversationId).catch((err: unknown) => {
        logger.warn("Failed to mark conversation as read", err);
      });
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    } catch (error) {
      logger.error("Error fetching messages", error, { silent: true });
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Poll while a conversation is open in the right pane
  useMessagePolling(
    () => fetchMessages(selectedConversation!.id),
    5000,
    !!selectedConversation,
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    let out = conversations;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(q) ||
          c.jobTitle?.toLowerCase().includes(q),
      );
    }
    if (unreadOnly) out = out.filter((c) => c.unreadCount > 0);
    return out;
  }, [conversations, search, unreadOnly]);

  const handleSelect = (conv: Conversation) => {
    // On mobile, navigate to the standalone view; on lg+ render in the right pane.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      router.push(`/candidate/messages/${conv.id}`);
      return;
    }
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    try {
      const newMsg = await messagingApi.sendMessage(
        selectedConversation.id,
        content,
      );
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessage: {
                  content,
                  senderType: "candidate",
                  createdAt: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
    } catch (error) {
      logger.error("Error sending message", error, { silent: true });
      toast.error("Failed to send message");
    }
  };

  const handleRespondToMeeting = async (
    meetingId: string,
    status: "accepted" | "declined",
  ) => {
    if (!selectedConversation) return;
    try {
      const result = await messagingApi.respondToMeeting(
        selectedConversation.id,
        meetingId,
        { status },
      );
      if (result) setMessages((prev) => [...prev, result]);
      await fetchMessages(selectedConversation.id);
    } catch (error) {
      logger.error("Error responding to meeting", error, { silent: true });
      toast.error("Failed to respond to meeting. Please try again.");
    }
  };

  const handleSubmitProposedTime = async (
    proposedTime: string,
    note?: string,
  ) => {
    if (!proposeModalMeetingId || !selectedConversation) return;
    await executePropose(
      () =>
        messagingApi.respondToMeeting(
          selectedConversation.id,
          proposeModalMeetingId,
          {
            status: "new_time_proposed",
            proposedTime,
            proposedNote: note,
          },
        ),
      {
        onSuccess: async (result) => {
          if (result) setMessages((prev) => [...prev, result]);
          setProposeModalMeetingId(null);
          if (selectedConversation) {
            await fetchMessages(selectedConversation.id);
          }
        },
        onError: (errorMsg) => {
          logger.error("Error proposing new time", errorMsg, { silent: true });
          toast.error("Failed to propose new time. Please try again.");
        },
      },
    );
  };

  const activeFilterCount = (search ? 1 : 0) + (unreadOnly ? 1 : 0);

  if (!ready) return null;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <MessagesHero
          eyebrow="Messages"
          title="Your conversations"
          subtitle="Threads with companies about roles you've applied to."
          unreadCount={totalUnread}
        />

        {/* Toolbar */}
        <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by company or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                  unreadOnly
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                Unread only
              </button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setUnreadOnly(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workspace */}
        <DataSection isLoading={isLoading} skeleton={null}>
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start min-h-[640px]">
            {/* Left list */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
                <h2 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Inbox
                </h2>
                <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                  {filteredConversations.length}
                </span>
              </div>
              <ConversationListPanel
                conversations={filteredConversations}
                variant="candidate"
                selectedId={selectedConversation?.id}
                onSelect={handleSelect}
                emptySlot={<EmptyInbox variant="candidate" />}
              />
            </div>

            {/* Right pane (lg+) */}
            <div className="hidden rounded-xl border border-border bg-card overflow-hidden lg:sticky lg:top-6 lg:block">
              {selectedConversation ? (
                <CandidateConversationPanel
                  conversation={selectedConversation}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  onSend={handleSendMessage}
                  onRespondToMeeting={handleRespondToMeeting}
                  onProposeNewTime={(id) => setProposeModalMeetingId(id)}
                />
              ) : (
                <EmptyConversationPane
                  icon={<MessageSquare className="h-6 w-6" />}
                  title="Select a conversation"
                  subtitle="Pick a thread on the left to read and reply."
                />
              )}
            </div>
          </div>
        </DataSection>
      </div>

      <ProposeNewTimeModal
        isOpen={proposeModalMeetingId !== null}
        onClose={() => setProposeModalMeetingId(null)}
        onSubmit={handleSubmitProposedTime}
        isSubmitting={isProposing}
      />
    </div>
  );
}

/* ── Inline conversation panel (lg+ workspace) ───────────────────────── */

function CandidateConversationPanel({
  conversation,
  messages,
  messagesLoading,
  onSend,
  onRespondToMeeting,
  onProposeNewTime,
}: {
  conversation: Conversation;
  messages: Message[];
  messagesLoading: boolean;
  onSend: (content: string) => Promise<void>;
  onRespondToMeeting: (
    meetingId: string,
    status: "accepted" | "declined",
  ) => Promise<void>;
  onProposeNewTime: (meetingId: string) => void;
}) {
  return (
    <div className="flex h-full min-h-[640px] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar service */}
          <img
            src={getCompanyAvatar(conversation.companyName)}
            alt={conversation.companyName}
            className="h-9 w-9 flex-shrink-0 rounded-full border border-border bg-white p-1 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {conversation.companyName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {conversation.jobTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {messagesLoading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ConversationThread
            messages={messages}
            currentUserType="candidate"
            onRespondToMeeting={onRespondToMeeting}
            onProposeNewTime={onProposeNewTime}
          />
        )}
        <MessageInput onSend={onSend} />
      </div>
    </div>
  );
}
