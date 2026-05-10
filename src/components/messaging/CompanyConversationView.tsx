"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useMessagePolling } from "@/lib/hooks/useMessagePolling";
import { useApi } from "@/lib/hooks/useFetch";
import type { Conversation, Message } from "@/types";
import { ConversationThread } from "./ConversationThread";
import { MessageInput } from "./MessageInput";
import { CandidateInfoSidebar } from "./CandidateInfoSidebar";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { MESSAGE_READ_EVENT } from "@/lib/hooks/useMessageCount";
import { DataSection } from "@/lib/motion";
import { getPersonAvatar } from "@/lib/avatars";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";

export default function CompanyConversationView() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { ready } = useRequireAuth("company");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { execute: executeSchedule, isLoading: isScheduling } =
    useApi<Message>();

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
      const result = await messagingApi.companyRespondToMeeting(
        conversationId,
        meetingId,
        { status },
      );
      if (result) setMessages((prev) => [...prev, result]);
      fetchConversation();
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
    await executeSchedule(
      () => messagingApi.scheduleMeeting(conversationId, data),
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

  if (!ready) return null;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="h-16 animate-pulse border-b border-border bg-card" />
        <div className="flex-1 space-y-4 p-6">
          <div className="ml-auto h-10 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />
          <div className="ml-auto h-10 w-36 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-16 animate-pulse border-t border-border bg-card" />
      </div>
    );
  }

  if (!isLoading && !conversation) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Conversation not found
          </p>
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
            onClick={() => router.push("/dashboard/messages")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {conversation && (
            <>
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
        <div className="flex items-center gap-2">
          {conversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/candidates?candidateId=${conversation.candidateId}`,
                )
              }
            >
              <User className="mr-1 h-4 w-4" />
              View profile
            </Button>
          )}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule meeting
          </button>
        </div>
      </div>

      {/* Messages + sidebar */}
      <DataSection
        isLoading={isLoading}
        skeleton={null}
        className="flex min-h-0 flex-1"
      >
        {conversation && (
          <>
            <div className="flex h-full min-h-0">
              <div className="flex min-w-0 flex-1 flex-col">
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
          </>
        )}
      </DataSection>
    </div>
  );
}
