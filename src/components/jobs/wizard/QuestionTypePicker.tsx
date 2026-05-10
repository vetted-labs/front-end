"use client";

import {
  AlignLeft,
  CircleDot,
  Link2,
  ListChecks,
  Type,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { ApplicationQuestionType } from "@/types";
import { MAX_APPLICATION_QUESTIONS } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionTypeOption {
  type: ApplicationQuestionType;
  name: string;
  description: string;
  icon: LucideIcon;
}

const TYPES: QuestionTypeOption[] = [
  {
    type: "short_text",
    name: "Short text",
    description: "One-line answer. Names, links, numbers.",
    icon: Type,
  },
  {
    type: "long_text",
    name: "Long text",
    description: "Multi-line. Stories, write-ups.",
    icon: AlignLeft,
  },
  {
    type: "single_choice",
    name: "Single choice",
    description: "Pick one option. Buckets, levels.",
    icon: CircleDot,
  },
  {
    type: "multi_choice",
    name: "Multi-choice",
    description: "Pick any. Skills, tools, frameworks.",
    icon: ListChecks,
  },
  {
    type: "file_upload",
    name: "File upload",
    description: "CV, portfolio PDF, work samples.",
    icon: Upload,
  },
  {
    type: "url",
    name: "URL / link",
    description: "Validated link. Portfolio, repo.",
    icon: Link2,
  },
];

interface QuestionTypePickerProps {
  count: number;
  onPick: (type: ApplicationQuestionType) => void;
}

export function QuestionTypePicker({ count, onPick }: QuestionTypePickerProps) {
  const atLimit = count >= MAX_APPLICATION_QUESTIONS;

  if (atLimit) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
        <p className="text-sm font-semibold text-foreground">
          You&apos;ve reached the {MAX_APPLICATION_QUESTIONS} question limit
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Remove a question above to add another type.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
          Add a question — pick a type
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count} / {MAX_APPLICATION_QUESTIONS}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TYPES.map(({ type, name, description, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className={cn(
              "group flex flex-col gap-1.5 p-3.5 rounded-lg border border-border",
              "bg-muted text-left transition-all",
              "hover:border-primary/40 hover:bg-accent hover:-translate-y-px"
            )}
          >
            <span className="w-[30px] h-[30px] rounded-md border border-border bg-card grid place-items-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:bg-primary/10 transition-colors">
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[13px] font-semibold text-foreground tracking-tight">
              {name}
            </span>
            <span className="text-[11.5px] text-muted-foreground leading-snug">
              {description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
