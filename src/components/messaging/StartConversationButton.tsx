"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { messagingApi } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

interface StartConversationButtonProps {
  applicationId: string;
  candidateName: string;
  size?: "sm" | "md";
}

export function StartConversationButton({
  applicationId,
  candidateName,
  size = "sm",
}: StartConversationButtonProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsChecking(true);
    try {
      const existing = await messagingApi.getConversationByApplication(applicationId);
      if (existing?.id) {
        router.push(`/dashboard/messages/${existing.id}`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setShowCompose(true);
        setIsChecking(false);
        return;
      }
    }
    setShowCompose(true);
    setIsChecking(false);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await messagingApi.startConversation({
        applicationId,
        message: message.trim(),
      });
      toast.success("Message sent!");
      router.push(`/dashboard/messages/${result.id}`);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Failed to send — messaging is not available yet`
        : "Failed to send message";
      setError(msg);
      toast.error(msg);
      setIsSending(false);
    }
  };

  if (showCompose) {
    return (
      <div className="w-full space-y-3">
        {/* Message input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write a message to ${candidateName}...`}
          rows={4}
          className="w-full px-4 py-3 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {message.trim() ? `${message.trim().length} chars` : "Ctrl+Enter to send"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCompose(false);
                setMessage("");
                setError(null);
              }}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isChecking}
      className={`inline-flex items-center gap-1.5 font-medium text-primary hover:underline disabled:opacity-50 ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      {isChecking ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <MessageSquare className="w-3.5 h-3.5" />
      )}
      Message
    </button>
  );
}
