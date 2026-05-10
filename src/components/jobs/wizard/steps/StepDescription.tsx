"use client";

import { useRef } from "react";
import {
  Bold,
  Code as CodeIcon,
  Heading,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChipListInput } from "../Chips";
import type { JobFormData } from "@/hooks/useJobWizard";

interface StepDescriptionProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  updateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => void;
}

const MAX_DESCRIPTION = 4000;
const MAX_REQUIREMENTS = 12;

type ToolbarAction =
  | "heading"
  | "bold"
  | "italic"
  | "bullet"
  | "ordered"
  | "link"
  | "code";

/** Step 3 — Markdown editor + live preview, plus chip-list requirements. */
export function StepDescription({
  formData,
  fieldErrors,
  updateField,
}: StepDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const description = formData.description ?? "";
  const requirements = formData.requirements ?? [];

  /**
   * Inserts markdown markers around the current selection (or at the caret
   * for line-prefix actions) without depending on a heavy editor library.
   */
  const applyAction = (action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const selected = value.slice(start, end);

    let next: string;
    let cursorPos: number;

    switch (action) {
      case "heading": {
        // Prefix the current line with `## `.
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        next =
          value.slice(0, lineStart) + "## " + value.slice(lineStart);
        cursorPos = end + 3;
        break;
      }
      case "bold": {
        next = value.slice(0, start) + `**${selected || "bold"}**` + value.slice(end);
        cursorPos = start + 2 + (selected ? selected.length : 4) + 2;
        break;
      }
      case "italic": {
        next = value.slice(0, start) + `_${selected || "italic"}_` + value.slice(end);
        cursorPos = start + 1 + (selected ? selected.length : 6) + 1;
        break;
      }
      case "bullet": {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        next = value.slice(0, lineStart) + "- " + value.slice(lineStart);
        cursorPos = end + 2;
        break;
      }
      case "ordered": {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        next = value.slice(0, lineStart) + "1. " + value.slice(lineStart);
        cursorPos = end + 3;
        break;
      }
      case "link": {
        const label = selected || "link text";
        const inserted = `[${label}](https://)`;
        next = value.slice(0, start) + inserted + value.slice(end);
        cursorPos = start + inserted.length;
        break;
      }
      case "code": {
        next =
          value.slice(0, start) + `\`${selected || "code"}\`` + value.slice(end);
        cursorPos = start + (selected ? selected.length : 4) + 2;
        break;
      }
    }

    if (next.length <= MAX_DESCRIPTION) {
      updateField("description", next);
      // Restore caret on the next tick.
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }
  };

  return (
    <div>
      <div className="mb-2 text-[11px] tracking-[0.2em] uppercase text-primary font-semibold">
        Step 03
      </div>
      <h2 className="text-[28px] font-bold tracking-[-0.025em] text-foreground mb-1.5">
        Tell candidates what they&apos;re walking into
      </h2>
      <p className="text-muted-foreground text-[14.5px] leading-[1.55] mb-8 max-w-xl">
        Write in Markdown — the preview on the right is what candidates and
        reviewing experts will see. Lead with the team, the work, and the bar.
        Save the perks for the end.
      </p>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border border-border rounded-xl overflow-hidden bg-muted min-h-[460px]">
        {/* Editor pane */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-border bg-muted">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80 font-semibold">
              Markdown
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {description.length > 0 ? "Auto-saving" : "Empty"}
            </span>
          </div>
          <Toolbar onAction={applyAction} />
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= MAX_DESCRIPTION) {
                updateField("description", e.target.value);
              }
            }}
            placeholder={`## About the role\n\nWe're looking for…`}
            className="flex-1 px-6 py-5 text-sm leading-[1.65] text-foreground bg-muted outline-none resize-none font-mono whitespace-pre-wrap"
            aria-invalid={!!fieldErrors.description}
          />
          <div className="border-t border-border px-3.5 py-2 flex justify-between items-center text-[11.5px] text-muted-foreground/80 bg-card">
            <span>
              Markdown supported · ## heading, **bold**, *italic*, [link](url)
            </span>
            <span
              className={
                description.length > MAX_DESCRIPTION
                  ? "text-destructive"
                  : ""
              }
            >
              {description.length.toLocaleString()} /{" "}
              {MAX_DESCRIPTION.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex flex-col bg-card">
          <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-border">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80 font-semibold">
              Candidate preview
            </span>
            <span className="text-[11px] text-muted-foreground/70">Live</span>
          </div>
          <div className="flex-1 px-7 py-6 overflow-auto prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground prose-ul:list-disc prose-ol:list-decimal">
            {description.trim() ? (
              <ReactMarkdown>{description}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground/60 italic">
                Your description preview will appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {fieldErrors.description && (
        <p className="text-xs text-destructive mt-2">
          {fieldErrors.description}
        </p>
      )}

      {/* Requirements */}
      <div className="mt-8">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground/80 font-semibold">
            Requirements <span className="text-primary ml-1">*</span>
          </span>
          <ChipListInput
            values={requirements}
            onChange={(v) => updateField("requirements", v)}
            placeholder="Add a requirement, press Enter…"
            max={MAX_REQUIREMENTS}
            invalid={!!fieldErrors.requirements}
          />
          <div className="flex justify-between text-xs text-muted-foreground/80">
            <span>
              {requirements.length} requirement
              {requirements.length === 1 ? "" : "s"} · listed as bullets on the
              job page
            </span>
            <span>Skills already captured in step 1</span>
          </div>
          {fieldErrors.requirements && (
            <span className="text-xs text-destructive">
              {fieldErrors.requirements}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Toolbar({ onAction }: { onAction: (a: ToolbarAction) => void }) {
  const btnClass =
    "w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors";
  const divider = "w-px bg-border my-1.5 mx-1";
  return (
    <div className="flex gap-0.5 px-2 py-1.5 bg-card border-b border-border">
      <button
        type="button"
        title="Heading"
        onClick={() => onAction("heading")}
        className={btnClass}
      >
        <Heading className="w-3.5 h-3.5" />
      </button>
      <span className={divider} />
      <button
        type="button"
        title="Bold"
        onClick={() => onAction("bold")}
        className={btnClass}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => onAction("italic")}
        className={btnClass}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <span className={divider} />
      <button
        type="button"
        title="Bullet list"
        onClick={() => onAction("bullet")}
        className={btnClass}
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Numbered list"
        onClick={() => onAction("ordered")}
        className={btnClass}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <span className={divider} />
      <button
        type="button"
        title="Link"
        onClick={() => onAction("link")}
        className={btnClass}
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Code"
        onClick={() => onAction("code")}
        className={btnClass}
      >
        <CodeIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
