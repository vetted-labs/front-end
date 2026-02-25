"use client";

import { useState } from "react";
import { X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: {
    title: string;
    scheduledAt: string;
    duration: number;
    provider: "google_meet" | "calendly" | "custom";
    meetingUrl: string;
  }) => void;
  candidateName: string;
  isSubmitting?: boolean;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

const PROVIDER_TABS = [
  { value: "google_meet" as const, label: "Google Meet" },
  { value: "calendly" as const, label: "Calendly" },
  { value: "custom" as const, label: "Custom Link" },
];

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSchedule,
  candidateName,
  isSubmitting,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState(`Interview - ${candidateName}`);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(45);
  const [provider, setProvider] = useState<"google_meet" | "calendly" | "custom">("google_meet");
  const [meetingUrl, setMeetingUrl] = useState("");

  if (!isOpen) return null;

  const canSubmit = title.trim() && scheduledAt && meetingUrl.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSchedule({ title: title.trim(), scheduledAt, duration, provider, meetingUrl: meetingUrl.trim() });
  };

  const placeholders: Record<string, string> = {
    google_meet: "https://meet.google.com/abc-defg-hij",
    calendly: "https://calendly.com/your-name/meeting",
    custom: "https://your-meeting-link.com/...",
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
              <Video className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Schedule Meeting</h3>
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
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Meeting Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Tabs */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Meeting Provider
              </label>
              <div className="flex rounded-lg border border-border/60 dark:border-white/[0.08] overflow-hidden">
                {PROVIDER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setProvider(tab.value)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                      provider === tab.value
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting URL */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Meeting URL
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={placeholders[provider]}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
