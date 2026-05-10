"use client";

import { useState } from "react";
import {
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ApplicationQuestion, ApplicationQuestionType } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<ApplicationQuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multi_choice: "Multi choice",
  file_upload: "File upload",
  url: "URL",
};

const ALLOWED_FILE_TYPES = ["pdf", "doc", "docx", "png", "jpg"] as const;

const DEFAULT_MAX_LENGTH: Partial<Record<ApplicationQuestionType, number>> = {
  short_text: 200,
  long_text: 800,
};

interface QuestionCardProps {
  question: ApplicationQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (q: ApplicationQuestion) => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function QuestionCard({
  question,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDuplicate,
  onRemove,
}: QuestionCardProps) {
  // Working copy used while the card is in editing mode. We don't pipe every
  // keystroke up so that "Cancel" cleanly reverts.
  const [draft, setDraft] = useState<ApplicationQuestion>(question);

  const updateDraft = <K extends keyof ApplicationQuestion>(
    key: K,
    value: ApplicationQuestion[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    const labelTrimmed = draft.label.trim();
    if (!labelTrimmed) return;
    onSave({ ...draft, label: labelTrimmed });
  };

  const handleCancel = () => {
    setDraft(question);
    onCancel();
  };

  const numLabel = String(index + 1).padStart(2, "0");

  if (!isEditing) {
    return (
      <div className="group rounded-xl border border-border bg-muted/60 grid grid-cols-[32px_1fr] overflow-hidden hover:border-border/80 transition-colors">
        <button
          type="button"
          aria-label="Drag to reorder (coming soon)"
          // TODO(reorder): wire up @dnd-kit/sortable once it's a dependency
          className="bg-card border-r border-border grid place-items-center text-muted-foreground cursor-grab"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground tabular-nums w-5">
                {numLabel}
              </span>
              <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                {question.label || <em className="text-muted-foreground">Untitled question</em>}
                {question.required && (
                  <span className="text-primary font-bold ml-0.5">*</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span className="text-[10.5px] tracking-wider uppercase text-muted-foreground font-semibold px-2 py-1 bg-card border border-border rounded-md whitespace-nowrap">
                {TYPE_LABEL[question.type]}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Edit"
                  className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent grid place-items-center"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDuplicate}
                  aria-label="Duplicate"
                  className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent grid place-items-center"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label="Remove"
                  className="w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 grid place-items-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {question.helpText && (
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug pl-7">
              {question.helpText}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-card grid grid-cols-[32px_1fr] overflow-hidden shadow-[0_0_0_1px_rgba(255,122,26,0.35),0_16px_32px_-20px_rgba(0,0,0,0.6)]">
      <div className="bg-muted border-r border-border grid place-items-center text-muted-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground tabular-nums w-5">
              {numLabel}
            </span>
            <span className="text-sm font-semibold text-primary tracking-tight">
              Editing question
            </span>
          </div>
          <span className="text-[10.5px] tracking-wider uppercase text-primary font-semibold px-2 py-1 bg-primary/10 border border-primary/40 rounded-md whitespace-nowrap">
            {TYPE_LABEL[draft.type]}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
          {/* Label */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
              Question label
            </span>
            <input
              type="text"
              value={draft.label}
              onChange={(e) => updateDraft("label", e.target.value)}
              maxLength={200}
              placeholder="What do you want to ask?"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* Help text */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
              Help text · optional
            </span>
            <input
              type="text"
              value={draft.helpText ?? ""}
              onChange={(e) =>
                updateDraft("helpText", e.target.value || undefined)
              }
              maxLength={300}
              placeholder="Shown beneath the question to candidates"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* Type-specific config */}
          {(draft.type === "single_choice" || draft.type === "multi_choice") && (
            <OptionsEditor
              value={draft.options ?? ["", ""]}
              onChange={(options) => updateDraft("options", options)}
              kind={draft.type}
            />
          )}

          {(draft.type === "short_text" || draft.type === "long_text") && (
            <MaxLengthEditor
              value={draft.maxLength ?? DEFAULT_MAX_LENGTH[draft.type] ?? 200}
              onChange={(n) => updateDraft("maxLength", n)}
            />
          )}

          {draft.type === "file_upload" && (
            <FileTypesEditor
              value={
                draft.allowedFileTypes ?? Array.from(ALLOWED_FILE_TYPES.slice(0, 3))
              }
              onChange={(types) => updateDraft("allowedFileTypes", types)}
            />
          )}

          {/* Required toggle */}
          <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 bg-muted border border-border rounded-lg">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-foreground">
                Required answer
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                Candidates can&apos;t submit without filling this in.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.required}
              onClick={() => updateDraft("required", !draft.required)}
              className={cn(
                "relative w-9 h-5 rounded-full border transition-colors flex-shrink-0",
                draft.required
                  ? "bg-primary/20 border-primary/40"
                  : "bg-card border-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-[2px] w-3.5 h-3.5 rounded-full transition-all",
                  draft.required
                    ? "left-[18px] bg-primary"
                    : "left-[2px] bg-muted-foreground"
                )}
              />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border pt-3.5">
            <button
              type="button"
              onClick={onRemove}
              className="text-[12.5px] font-semibold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors"
            >
              Delete question
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!draft.label.trim()}
              >
                Save question
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Options editor (single / multi choice)
// ---------------------------------------------------------------------------

interface OptionsEditorProps {
  value: string[];
  onChange: (options: string[]) => void;
  kind: "single_choice" | "multi_choice";
}

function OptionsEditor({ value, onChange, kind }: OptionsEditorProps) {
  const update = (idx: number, text: string) => {
    onChange(value.map((o, i) => (i === idx ? text : o)));
  };
  const remove = (idx: number) => {
    if (value.length <= 2) return; // min 2
    onChange(value.filter((_, i) => i !== idx));
  };
  const add = () => {
    if (value.length >= 10) return; // max 10
    onChange([...value, ""]);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
        Answer options
      </span>
      <div className="flex flex-col gap-2">
        {value.map((opt, i) => (
          <div
            key={i}
            className="grid grid-cols-[18px_1fr_28px] items-center gap-2.5"
          >
            <span
              className={cn(
                "w-3.5 h-3.5 border-[1.5px] border-muted-foreground",
                kind === "multi_choice" ? "rounded-sm" : "rounded-full"
              )}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="bg-muted border border-border rounded-md px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={value.length <= 2}
              aria-label={`Remove option ${i + 1}`}
              className="w-6 h-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={value.length >= 10}
        className="self-start mt-1 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
      >
        <Plus className="w-3 h-3" />
        Add option
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Max-length editor (short_text / long_text)
// ---------------------------------------------------------------------------

interface MaxLengthEditorProps {
  value: number;
  onChange: (n: number) => void;
}

function MaxLengthEditor({ value, onChange }: MaxLengthEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
        Max length (characters)
      </span>
      <input
        type="number"
        min={1}
        max={10000}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || n <= 0) return;
          onChange(Math.floor(n));
        }}
        className="w-32 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none tabular-nums"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Allowed file types editor (file_upload)
// ---------------------------------------------------------------------------

interface FileTypesEditorProps {
  value: string[];
  onChange: (types: string[]) => void;
}

function FileTypesEditor({ value, onChange }: FileTypesEditorProps) {
  const toggle = (t: string) => {
    if (value.includes(t)) {
      onChange(value.filter((v) => v !== t));
    } else {
      onChange([...value, t]);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
        Allowed file types
      </span>
      <div className="flex flex-wrap gap-2">
        {ALLOWED_FILE_TYPES.map((t) => {
          const active = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors",
                active
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              )}
            >
              .{t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
