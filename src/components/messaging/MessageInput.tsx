"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attachment) || disabled) return;

    if (attachment) {
      toast.info("File attachments will be available in a future update");
      setAttachment(null);
    }

    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border/30 dark:border-border bg-card">
      {attachment && (
        <div className="flex items-center gap-2 px-3 py-1.5 mx-3 mt-2 bg-muted/50 rounded-lg text-sm border">
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{attachment.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {(attachment.size / 1024).toFixed(0)}KB
          </span>
          <button onClick={() => setAttachment(null)} className="p-0.5 hover:bg-muted rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-3 p-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border-transparent bg-muted/30 dark:bg-muted/30 px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size <= 10 * 1024 * 1024) {
              setAttachment(file);
            } else if (file) {
              toast.error("File must be under 10MB");
            }
            e.target.value = "";
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !attachment)}
          className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
