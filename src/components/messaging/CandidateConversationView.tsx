"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useMessagePolling } from "@/lib/hooks/useMessagePolling";
import { useApi } from "@/lib/hooks/useFetch";
import type { Conversation, Message } from "@/types";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { ProposeNewTimeModal } from "./ProposeNewTimeModal";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";
import { DataSection } from "@/lib/motion";

export default function CandidateConversationView() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { ready } = useRequireAuth("candidate");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proposeModalMeetingId, setProposeModalMeetingId] = useState<string | null>(null);
  const { execute: executePropose, isLoading: isProposing } = useApi<Message>();

  const fetchConversation = useCallback(async () => {
    try {
      const { conversation: conv, messages: msgs } = await messagingApi.getConversation(conversationId);
      setConversation(conv);
      setMessages(msgs);
      await messagingApi.markAsRead(conversationId).catch((err: unknown) => {
        logger.warn("Failed to mark conversation as read", err);
      });
      window.dispatchEvent(new Event(MESSAGE_READ_EVENT));
    } catch (error) {
      logger.error("Error fetching conversation", error, { silent: true });
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useMessagePolling(fetchConversation, 5000);

  const handleSendMessage = async (content: string) => {
    try {
      const newMsg = await messagingApi.sendMessage(conversationId, content);
      setMessages((prev) => [...prev, newMsg]);
    } catch (error) {
      logger.error("Error sending message", error, { silent: true });
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
      logger.error("Error responding to meeting", error, { silent: true });
      toast.error("Failed to respond to meeting. Please try again.");
    }
  };

  const handleProposeNewTime = (meetingId: string) => {
    setProposeModalMeetingId(meetingId);
  };

  const handleSubmitProposedTime = async (proposedTime: string, note?: string) => {
    if (!proposeModalMeetingId) return;
    await executePropose(
      () => messagingApi.respondToMeeting(
        conversationId,
        proposeModalMeetingId,
        { status: "new_time_proposed", proposedTime, proposedNote: note }
      ),
      {
        onSuccess: async (result) => {
          if (result) {
            setMessages((prev) => [...prev, result]);
          }
          setProposeModalMeetingId(null);
          await fetchConversation();
        },
        onError: (errorMsg) => {
          logger.error("Error proposing new time", errorMsg, { silent: true });
          toast.error("Failed to propose new time. Please try again.");
        },
      }
    );
  };

  if (!ready) return null;

  if (!isLoading && !conversation) {
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
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-page-enter">
      {/* Header (static — always visible with back button) */}
      <div className="px-4 py-3 border-b border-border dark:border-border flex items-center gap-3 bg-card">
        <button
          onClick={() => router.push("/candidate/messages")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {conversation && (
          <>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-medium text-xs">
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
          </>
        )}
      </div>

      {/* Messages */}
      <DataSection isLoading={isLoading} skeleton={null} className="flex-1 flex flex-col min-h-0">
      {conversation && (
      <>
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
      </>
      )}
      </DataSection>
    </div>
  );
}
