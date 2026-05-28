"use client";

import { type RefObject } from "react";
import {
  Bold,
  Italic,
  Code,
  Code2,
  Link as LinkIcon,
  List,
  Quote,
  Eye,
  Pencil,
} from "lucide-react";

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  /** Current preview state — owned by parent so it can swap the textarea for `<MarkdownBody>`. */
  isPreviewing: boolean;
  onTogglePreview: () => void;
}

type Wrap = { before: string; after: string };
type LinePrefix = { prefix: string };

/**
 * Apply a Markdown transformation to the current selection in the textarea
 * without using the deprecated `document.execCommand`. We compute the new
 * value + cursor position from `selectionStart` / `selectionEnd` and call
 * `onChange` so the parent retains controlled-input semantics.
 */
function applyWrap(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  { before, after }: Wrap,
  placeholder = ""
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  onChange(next);
  // Restore the selection on the newly-wrapped text so chained edits feel natural.
  requestAnimationFrame(() => {
    textarea.focus();
    const selStart = start + before.length;
    const selEnd = selStart + selected.length;
    textarea.setSelectionRange(selStart, selEnd);
  });
}

function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  { prefix }: LinePrefix
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  // Expand selection to whole lines so the prefix applies cleanly across multi-line ranges.
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const sliceEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, sliceEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.length === 0 ? `${prefix}` : `${prefix}${line}`))
    .join("\n");
  const next = `${value.slice(0, lineStart)}${prefixed}${value.slice(sliceEnd)}`;
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + prefixed.length);
  });
}

function applyLink(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || "link text";
  const insertion = `[${selected}](https://)`;
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    // Drop the cursor right after `https://` so the user can paste their URL.
    const urlStart = start + selected.length + 4; // `[selected](`
    const urlEnd = urlStart + "https://".length;
    textarea.setSelectionRange(urlStart, urlEnd);
  });
}

function applyCodeBlock(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || "code";
  // Add surrounding newlines only when not already on a fresh line so the
  // fenced block renders correctly inside flowing prose.
  const needsLeadingNewline = start > 0 && value[start - 1] !== "\n";
  const needsTrailingNewline = end < value.length && value[end] !== "\n";
  const leading = needsLeadingNewline ? "\n" : "";
  const trailing = needsTrailingNewline ? "\n" : "";
  const insertion = `${leading}\`\`\`\n${selected}\n\`\`\`${trailing}`;
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const selStart = start + leading.length + 4; // ```\n
    const selEnd = selStart + selected.length;
    textarea.setSelectionRange(selStart, selEnd);
  });
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ label, onClick, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  );
}

export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
  isPreviewing,
  onTogglePreview,
}: MarkdownToolbarProps) {
  const run = (fn: (ta: HTMLTextAreaElement) => void) => {
    const ta = textareaRef.current;
    if (!ta) return;
    fn(ta);
  };

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1 rounded-t-lg border border-b-0 border-border bg-muted/30"
      data-testid="markdown-toolbar"
    >
      <ToolbarButton
        label="Bold"
        disabled={isPreviewing}
        onClick={() =>
          run((ta) =>
            applyWrap(ta, value, onChange, { before: "**", after: "**" }, "bold text")
          )
        }
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        disabled={isPreviewing}
        onClick={() =>
          run((ta) =>
            applyWrap(ta, value, onChange, { before: "*", after: "*" }, "italic text")
          )
        }
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        disabled={isPreviewing}
        onClick={() =>
          run((ta) => applyWrap(ta, value, onChange, { before: "`", after: "`" }, "code"))
        }
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        disabled={isPreviewing}
        onClick={() => run((ta) => applyCodeBlock(ta, value, onChange))}
      >
        <Code2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        disabled={isPreviewing}
        onClick={() => run((ta) => applyLink(ta, value, onChange))}
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bulleted list"
        disabled={isPreviewing}
        onClick={() => run((ta) => applyLinePrefix(ta, value, onChange, { prefix: "- " }))}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        disabled={isPreviewing}
        onClick={() => run((ta) => applyLinePrefix(ta, value, onChange, { prefix: "> " }))}
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <div className="ml-auto">
        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={isPreviewing}
          data-testid="markdown-preview-toggle"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {isPreviewing ? (
            <>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Preview
            </>
          )}
        </button>
      </div>
    </div>
  );
}
