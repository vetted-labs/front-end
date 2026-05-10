"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
import { getCompanyAvatar } from "@/lib/avatars";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";

export default function CandidateConversationView() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { ready } = useRequireAuth("candidate");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proposeModalMeetingId, setProposeModalMeetingId] = useState<
    string | null
  >(null);
  const { execute: executePropose, isLoading: isProposing } = useApi<Message>();

  const fetchConversation = useCallback(async () => {
    try {
      const { conversation: conv, messages: msgs } =
        await messagingApi.getConversation(conversationId);
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
    status: "accepted" | "declined",
  ) => {
    try {
      const result = await messagingApi.respondToMeeting(
        conversationId,
        meetingId,
        { status },
      );
      if (result) {
        setMessages((prev) => [...prev, result]);
      }
      await fetchConversation();
    } catch (error) {
      logger.error("Error responding to meeting", error, { silent: true });
      toast.error("Failed to respond to meeting. Please try again.");
    }
  };

  const handleProposeNewTime = (meetingId: string) => {
    setProposeModalMeetingId(meetingId);
  };

  const handleSubmitProposedTime = async (
    proposedTime: string,
    note?: string,
  ) => {
    if (!proposeModalMeetingId) return;
    await executePropose(
      () =>
        messagingApi.respondToMeeting(conversationId, proposeModalMeetingId, {
          status: "new_time_proposed",
          proposedTime,
          proposedNote: note,
        }),
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
      },
    );
  };

  if (!ready) return null;

  if (!isLoading && !conversation) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Conversation not found
          </p>
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

  const status = conversation
    ? APPLICATION_STATUS_CONFIG[conversation.applicationStatus] ||
      APPLICATION_STATUS_CONFIG.pending
    : null;

  return (
    <div className="flex h-full flex-col animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push("/candidate/messages")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {conversation && (
            <>
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
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{conversation.jobTitle}</span>
                  {conversation.applicationStatus && status && (
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
            </>
          )}
        </div>
        {conversation && (
          <button
            onClick={() => router.push(`/browse/jobs/${conversation.jobId}`)}
            className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View role
          </button>
        )}
      </div>

      {/* Messages */}
      <DataSection
        isLoading={isLoading}
        skeleton={null}
        className="flex min-h-0 flex-1 flex-col"
      >
        {conversation && (
          <div className="flex h-full min-h-0 flex-col">
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
        )}
      </DataSection>
    </div>
  );
}
