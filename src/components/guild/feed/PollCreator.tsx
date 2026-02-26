"use client";

import { useState } from "react";
import { BarChart3, Plus, X } from "lucide-react";
import type { CreatePollPayload, PollChoiceMode } from "@/types";

interface PollCreatorProps {
  poll: CreatePollPayload | null;
  onChange: (poll: CreatePollPayload | null) => void;
}

const EXPIRY_OPTIONS = [
  { value: 0, label: "No expiry" },
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 24, label: "1 day" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
];

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

export function PollCreator({ poll, onChange }: PollCreatorProps) {
  const [isOpen, setIsOpen] = useState(!!poll);

  const handleToggle = () => {
    if (isOpen) {
      onChange(null);
      setIsOpen(false);
    } else {
      onChange({
        choiceMode: "single",
        options: ["", ""],
      });
      setIsOpen(true);
    }
  };

  const handleChoiceMode = (mode: PollChoiceMode) => {
    if (!poll) return;
    onChange({ ...poll, choiceMode: mode });
  };

  const handleOptionChange = (index: number, value: string) => {
    if (!poll) return;
    const next = [...poll.options];
    next[index] = value;
    onChange({ ...poll, options: next });
  };

  const handleAddOption = () => {
    if (!poll || poll.options.length >= MAX_OPTIONS) return;
    onChange({ ...poll, options: [...poll.options, ""] });
  };

  const handleRemoveOption = (index: number) => {
    if (!poll || poll.options.length <= MIN_OPTIONS) return;
    onChange({ ...poll, options: poll.options.filter((_, i) => i !== index) });
  };

  const handleExpiry = (hours: number) => {
    if (!poll) return;
    onChange({
      ...poll,
      expiresInHours: hours > 0 ? hours : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
          isOpen
            ? "bg-primary/15 text-primary border-primary/30"
            : "text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
        }`}
      >
        <BarChart3 className="w-4 h-4" />
        {isOpen ? "Remove Poll" : "Add Poll"}
      </button>

      {isOpen && poll && (
        <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
          {/* Choice Mode */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Voting type
            </label>
            <div className="flex gap-2">
              {(["single", "multiple"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleChoiceMode(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    poll.choiceMode === mode
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {mode === "single" ? "Single choice" : "Multiple choice"}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Options ({poll.options.length}/{MAX_OPTIONS})
            </label>
            {poll.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                />
                {poll.options.length > MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {poll.options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add option
              </button>
            )}
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Expires after
            </label>
            <select
              value={poll.expiresInHours ?? 0}
              onChange={(e) => handleExpiry(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg text-sm border border-border bg-card text-foreground"
            >
              {EXPIRY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
