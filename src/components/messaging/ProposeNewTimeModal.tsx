"use client";

import { useState } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposeNewTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposedTime: string, note?: string) => void;
  isSubmitting?: boolean;
}

export function ProposeNewTimeModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ProposeNewTimeModalProps) {
  const [proposedTime, setProposedTime] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const canSubmit = proposedTime.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(proposedTime, note.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md border border-border/60 dark:bg-card/60 dark:border-white/[0.08]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Propose New Time</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Proposed Date & Time
              </label>
              <input
                type="datetime-local"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Let them know why this time works better..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Proposing..." : "Propose Time"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
