"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";

import { logger } from "@/lib/logger";
import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useMessagePolling } from "@/lib/hooks/useMessagePolling";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import type { Conversation, Message } from "@/types";
import { toast } from "sonner";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { CandidateInfoSidebar } from "./CandidateInfoSidebar";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { EmptyInbox } from "./EmptyInbox";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";
import { DataSection } from "@/lib/motion";
import { getPersonAvatar } from "@/lib/avatars";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";
import {
  MessagesHero,
  ConversationListPanel,
  EmptyConversationPane,
} from "./shared/MessageHelpers";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "interviewed", label: "Interviewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

export default function CompanyMessagesInbox() {
  const { ready } = useRequireAuth("company");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { execute: executeSchedule, isLoading: isScheduling } =
    useApi<Message>();

  const { isLoading } = useFetch<Conversation[]>(
    () => messagingApi.getCompanyConversations(),
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
      const { messages: msgs } =
        await messagingApi.getConversation(conversationId);
      setMessages(msgs || []);
      // Mark as read
      await messagingApi.markAsRead(conversationId).catch((err: unknown) => {
        logger.warn("Failed to mark conversation as read", err);
      });
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
      // Update local unread count
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

  // Poll for new messages when a conversation is selected
  useMessagePolling(
    () => fetchMessages(selectedConversation!.id),
    5000,
    !!selectedConversation,
  );

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    try {
      const newMsg = await messagingApi.sendMessage(
        selectedConversation.id,
        content,
      );
      setMessages((prev) => [...prev, newMsg]);
      // Update last message in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessage: {
                  content,
                  senderType: "company",
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

  const handleScheduleMeeting = async (data: {
    title: string;
    scheduledAt: string;
    duration: number;
    provider: "google_meet" | "calendly" | "custom";
    meetingUrl: string;
  }) => {
    if (!selectedConversation) return;
    await executeSchedule(
      () => messagingApi.scheduleMeeting(selectedConversation.id, data),
      {
        onSuccess: (result) => {
          if (result) setMessages((prev) => [...prev, result]);
          setShowScheduleModal(false);
        },
        onError: (errorMsg) => {
          logger.error("Error scheduling meeting", errorMsg, { silent: true });
          toast.error("Failed to schedule meeting");
        },
      },
    );
  };

  // Derive unique jobs for filter dropdown
  const uniqueJobs = useMemo(() => {
    const seen = new Map<string, string>();
    conversations.forEach((c) => {
      if (!seen.has(c.jobId)) seen.set(c.jobId, c.jobTitle);
    });
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [conversations]);

  // Apply filters
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.candidateName.toLowerCase().includes(q) &&
          !c.jobTitle.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (jobFilter && c.jobId !== jobFilter) return false;
      if (statusFilter && c.applicationStatus !== statusFilter) return false;
      if (unreadOnly && c.unreadCount === 0) return false;
      return true;
    });
  }, [conversations, search, jobFilter, statusFilter, unreadOnly]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const activeFilterCount =
    (jobFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (unreadOnly ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setJobFilter("");
    setStatusFilter("");
    setUnreadOnly(false);
  };

  if (!ready) return null;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <MessagesHero
          eyebrow="Workspace"
          title="Messages"
          subtitle="Conversations with candidates across all of your active job postings."
          unreadCount={totalUnread}
        />

        {/* Toolbar */}
        <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by candidate or job title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {uniqueJobs.length > 0 && (
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="cursor-pointer rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">All jobs</option>
                  {uniqueJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile back button when conversation is open */}
        {selectedConversation && (
          <button
            onClick={() => setSelectedConversation(null)}
            className="mb-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </button>
        )}

        {/* Workspace */}
        <DataSection isLoading={isLoading} skeleton={null}>
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start min-h-[640px]">
            {/* Left list */}
            <div
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden",
                selectedConversation ? "hidden lg:block" : "block",
              )}
            >
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
                variant="company"
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
                emptySlot={<EmptyInbox variant="company" />}
              />
            </div>

            {/* Right panel */}
            <div
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden lg:sticky lg:top-6",
                selectedConversation ? "block" : "hidden lg:block",
              )}
            >
              {selectedConversation ? (
                <CompanyConversationPanel
                  conversation={selectedConversation}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  onSend={handleSendMessage}
                  onSchedule={() => setShowScheduleModal(true)}
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

      {/* Schedule modal */}
      {selectedConversation && (
        <ScheduleMeetingModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleMeeting}
          candidateName={selectedConversation.candidateName}
          isSubmitting={isScheduling}
        />
      )}
    </div>
  );
}

/* ── Embedded conversation panel for the inbox right pane ─────────────── */

function CompanyConversationPanel({
  conversation,
  messages,
  messagesLoading,
  onSend,
  onSchedule,
}: {
  conversation: Conversation;
  messages: Message[];
  messagesLoading: boolean;
  onSend: (content: string) => Promise<void>;
  onSchedule: () => void;
}) {
  const status =
    APPLICATION_STATUS_CONFIG[conversation.applicationStatus] ||
    APPLICATION_STATUS_CONFIG.pending;

  return (
    <div className="flex h-full min-h-[640px] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar service */}
          <img
            src={getPersonAvatar(conversation.candidateName)}
            alt={conversation.candidateName}
            className="h-9 w-9 flex-shrink-0 rounded-full border border-border bg-muted object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {conversation.candidateName}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">{conversation.jobTitle}</span>
              {conversation.applicationStatus && (
                <>
                  <span aria-hidden className="opacity-50">
                    ·
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onSchedule}
          className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule meeting
        </button>
      </div>

      {/* Messages + sidebar */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {messagesLoading && messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConversationThread messages={messages} currentUserType="company" />
          )}
          <MessageInput onSend={onSend} />
        </div>
        <CandidateInfoSidebar conversation={conversation} />
      </div>
    </div>
  );
}
