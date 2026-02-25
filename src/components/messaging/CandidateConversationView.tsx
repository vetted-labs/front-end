"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import type { Conversation, Message } from "@/types";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { ProposeNewTimeModal } from "./ProposeNewTimeModal";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";

export default function CandidateConversationView() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { ready } = useRequireAuth("candidate");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proposeModalMeetingId, setProposeModalMeetingId] = useState<string | null>(null);
  const [isProposing, setIsProposing] = useState(false);

  const fetchConversation = useCallback(async () => {
    try {
      const data = await messagingApi.getConversation(conversationId);
      setConversation(data?.conversation || data);
      setMessages(data?.messages || []);
      await messagingApi.markAsRead(conversationId).catch(() => {});
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
    } catch (error) {
      console.error("Error fetching conversation:", error);
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
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleRespondToMeeting = async (
    meetingId: string,
    status: "accepted" | "declined"
  ) => {
    try {
      const result = await messagingApi.respondToMeeting(
        conversationId,
        meetingId,
        { status }
      );
      // If the API returns a new message, append it
      if (result) {
        setMessages((prev) => [...prev, result]);
      }
      // Refetch to get updated meeting statuses
      await fetchConversation();
    } catch (error) {
      console.error("Error responding to meeting:", error);
      toast.error("Failed to respond to meeting. Please try again.");
    }
  };

  const handleProposeNewTime = (meetingId: string) => {
    setProposeModalMeetingId(meetingId);
  };

  const handleSubmitProposedTime = async (proposedTime: string, note?: string) => {
    if (!proposeModalMeetingId) return;
    setIsProposing(true);
    try {
      const result = await messagingApi.respondToMeeting(
        conversationId,
        proposeModalMeetingId,
        { status: "new_time_proposed", proposedTime, proposedNote: note }
      );
      if (result) {
        setMessages((prev) => [...prev, result]);
      }
      setProposeModalMeetingId(null);
      await fetchConversation();
    } catch (error) {
      console.error("Error proposing new time:", error);
      toast.error("Failed to propose new time. Please try again.");
    } finally {
      setIsProposing(false);
    }
  };

  if (!ready) return null;

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Conversation not found</p>
          <button
            onClick={() => router.push("/candidate/messages")}
            className="text-sm text-primary hover:underline"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 dark:border-white/[0.04] flex items-center gap-3 bg-card/30 dark:bg-card/15">
        <button
          onClick={() => router.push("/candidate/messages")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-semibold text-xs">
            {conversation.companyName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {conversation.companyName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.jobTitle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ConversationThread
        messages={messages}
        currentUserType="candidate"
        onRespondToMeeting={handleRespondToMeeting}
        onProposeNewTime={handleProposeNewTime}
      />
      <MessageInput onSend={handleSendMessage} />

      <ProposeNewTimeModal
        isOpen={proposeModalMeetingId !== null}
        onClose={() => setProposeModalMeetingId(null)}
        onSubmit={handleSubmitProposedTime}
        isSubmitting={isProposing}
      />
    </div>
  );
}
