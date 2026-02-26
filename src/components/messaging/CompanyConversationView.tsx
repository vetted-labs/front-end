"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";

import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import type { Conversation, Message } from "@/types";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { CandidateInfoSidebar } from "./CandidateInfoSidebar";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";

export default function CompanyConversationView() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { ready } = useRequireAuth("company");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchConversation = useCallback(async () => {
    try {
      const data = await messagingApi.getConversation(conversationId);
      setConversation(data?.conversation || data);
      setMessages(data?.messages || []);
      await messagingApi.markAsRead(conversationId).catch(() => {});
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
    } catch (error) {
      logger.error("Error fetching conversation", error, { silent: true });
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  const handleSendMessage = async (content: string) => {
    try {
      const newMsg = await messagingApi.sendMessage(conversationId, content);
      setMessages((prev) => [...prev, newMsg]);
    } catch (error) {
      logger.error("Error sending message", error, { silent: true });
      toast.error("Failed to send message");
    }
  };

  const handleRespondToMeeting = async (meetingId: string, status: "accepted" | "declined") => {
    try {
      const result = await messagingApi.companyRespondToMeeting(conversationId, meetingId, { status });
      if (result) setMessages((prev) => [...prev, result]);
      fetchConversation(); // Refresh to get updated meeting status
    } catch (error) {
      logger.error("Error responding to meeting", error, { silent: true });
      toast.error("Failed to respond to meeting");
    }
  };

  const handleScheduleMeeting = async (data: {
    title: string;
    scheduledAt: string;
    duration: number;
    provider: "google_meet" | "calendly" | "custom";
    meetingUrl: string;
  }) => {
    setIsScheduling(true);
    try {
      const result = await messagingApi.scheduleMeeting(conversationId, data);
      if (result) setMessages((prev) => [...prev, result]);
      setShowScheduleModal(false);
    } catch (error) {
      logger.error("Error scheduling meeting", error, { silent: true });
      toast.error("Failed to schedule meeting");
    } finally {
      setIsScheduling(false);
    }
  };

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  if (!conversation) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Conversation not found</p>
          <button
            onClick={() => router.push("/dashboard/messages")}
            className="text-sm text-primary hover:underline"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-page-enter">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 dark:border-white/[0.04] flex items-center justify-between gap-3 bg-card/30 dark:bg-card/15">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/dashboard/messages")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold text-xs">
              {conversation.candidateName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {conversation.candidateName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{conversation.jobTitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 dark:border-white/[0.08] bg-card/60 dark:bg-card/30 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          Schedule Meeting
        </button>
      </div>

      {/* Messages + sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <ConversationThread
            messages={messages}
            currentUserType="company"
            onRespondToMeeting={handleRespondToMeeting}
          />
          <MessageInput onSend={handleSendMessage} />
        </div>
        <CandidateInfoSidebar conversation={conversation} />
      </div>

      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleScheduleMeeting}
        candidateName={conversation.candidateName}
        isSubmitting={isScheduling}
      />
    </div>
  );
}
