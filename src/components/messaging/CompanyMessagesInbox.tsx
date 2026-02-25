"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";

import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import type { Conversation, Message } from "@/types";
import { toast } from "sonner";
import { ConversationList } from "./ConversationList";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { CandidateInfoSidebar } from "./CandidateInfoSidebar";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { EmptyInbox } from "./EmptyInbox";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";
import { Calendar } from "lucide-react";

export default function CompanyMessagesInbox() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetchConversations();
  }, [ready]);

  const fetchConversations = async () => {
    try {
      const data = await messagingApi.getCompanyConversations();
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const data = await messagingApi.getConversation(conversationId);
      setMessages(data?.messages || []);
      // Mark as read
      await messagingApi.markAsRead(conversationId).catch(() => {});
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Poll for new messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation.id);
    const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    try {
      const newMsg = await messagingApi.sendMessage(selectedConversation.id, content);
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
            : c
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
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
    setIsScheduling(true);
    try {
      const result = await messagingApi.scheduleMeeting(selectedConversation.id, data);
      if (result) setMessages((prev) => [...prev, result]);
      setShowScheduleModal(false);
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      toast.error("Failed to schedule meeting");
    } finally {
      setIsScheduling(false);
    }
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

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />

      <div className="relative h-[calc(100vh-4rem)]">
        {/* Page header — visible on mobile when no conversation selected */}
        <div className="px-6 py-4 border-b border-border/40 dark:border-white/[0.04] md:hidden">
          {selectedConversation ? (
            <button
              onClick={() => setSelectedConversation(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <h1 className="text-lg font-semibold text-foreground">Messages</h1>
          )}
        </div>

        <div className="flex h-full">
          {/* Conversation list panel */}
          <div
            className={`w-full md:w-80 md:border-r border-border/40 dark:border-white/[0.06] flex flex-col bg-card/20 dark:bg-card/10 ${
              selectedConversation ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="px-4 py-3 border-b border-border/40 dark:border-white/[0.04] hidden md:block">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Messages
                </h1>
                {conversations.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-muted/60 dark:bg-white/[0.06] text-[10px] font-medium text-muted-foreground tabular-nums">
                    {conversations.length}
                  </span>
                )}
              </div>
            </div>
            <ConversationFilters
              search={search}
              onSearchChange={setSearch}
              jobFilter={jobFilter}
              onJobFilterChange={setJobFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              unreadOnly={unreadOnly}
              onUnreadOnlyChange={setUnreadOnly}
              jobs={uniqueJobs}
            />
            {filteredConversations.length === 0 ? (
              <EmptyInbox variant="company" />
            ) : (
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
                variant="company"
              />
            )}
          </div>

          {/* Conversation view panel */}
          <div
            className={`flex-1 flex flex-col ${
              selectedConversation ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedConversation ? (
              <>
                {/* Conversation header */}
                <div className="px-4 py-3 border-b border-border/40 dark:border-white/[0.04] flex items-center justify-between gap-3 bg-card/30 dark:bg-card/15">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-xs">
                        {selectedConversation.candidateName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {selectedConversation.candidateName}
                        </p>
                        <span className="text-muted-foreground/40 text-xs">&middot;</span>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedConversation.jobTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border/60 dark:border-white/[0.08] bg-card/60 dark:bg-card/30 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule Meeting
                  </button>
                </div>

                {/* Messages + sidebar */}
                <div className="flex flex-1 min-h-0">
                  <div className="flex-1 flex flex-col min-w-0">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ConversationThread
                        messages={messages}
                        currentUserType="company"
                      />
                    )}
                    <MessageInput onSend={handleSendMessage} />
                  </div>
                  <CandidateInfoSidebar conversation={selectedConversation} />
                </div>

                {/* Schedule modal */}
                <ScheduleMeetingModal
                  isOpen={showScheduleModal}
                  onClose={() => setShowScheduleModal(false)}
                  onSchedule={handleScheduleMeeting}
                  candidateName={selectedConversation.candidateName}
                  isSubmitting={isScheduling}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
