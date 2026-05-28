"use client";

import { useState, useRef, useCallback, useEffect, type RefObject } from "react";
import { expertApi } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface MentionAutocompleteProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}

interface ExpertOption {
  id: string;
  fullName: string;
  walletAddress: string;
}

/**
 * Trigger pattern: the user types `@<` and then a partial query. We capture
 * everything between the `@<` and the caret (until whitespace or a `>`) and
 * use it as the search query. On select we replace the trigger + partial
 * with the canonical `@<0x...wallet...>` token the backend MENTION_REGEX
 * already parses into a notification fire.
 */
const TRIGGER_REGEX = /@<([^\s>]*)$/;

function findActiveTrigger(value: string, caret: number): { start: number; query: string } | null {
  const upToCaret = value.slice(0, caret);
  const match = TRIGGER_REGEX.exec(upToCaret);
  if (!match) return null;
  return { start: match.index, query: match[1] ?? "" };
}

export function MentionAutocomplete({ textareaRef, value, onChange }: MentionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [results, setResults] = useState<ExpertOption[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const reset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setTriggerStart(null);
    setResults([]);
    setHighlight(0);
  }, []);

  // Position the popover near the caret. textarea selection coords aren't
  // directly measurable, so we anchor below the textarea's bottom-left as a
  // pragmatic fallback — good enough for a small dropdown above the rest of
  // the form. Avoids pulling in a measuring library for this scope.
  const updateCoords = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const parentRect = ta.offsetParent?.getBoundingClientRect();
    if (!parentRect) {
      setCoords({ top: rect.bottom, left: rect.left });
      return;
    }
    setCoords({
      top: rect.bottom - parentRect.top + 4,
      left: rect.left - parentRect.left,
    });
  }, [textareaRef]);

  // Watch for trigger pattern as the user types. We re-evaluate on every
  // `value` change (parent-controlled) plus on caret movement (keyup).
  // eslint-disable-next-line no-restricted-syntax -- DOM-keyed effect: must subscribe to caret/keyup on a ref'd textarea owned by the parent
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const evaluate = () => {
      const caret = ta.selectionStart;
      const trigger = findActiveTrigger(value, caret);
      if (!trigger) {
        if (open) reset();
        return;
      }
      setTriggerStart(trigger.start);
      setQuery(trigger.query);
      setOpen(true);
      updateCoords();
    };

    evaluate();

    const handleKey = () => evaluate();
    ta.addEventListener("keyup", handleKey);
    ta.addEventListener("click", handleKey);
    return () => {
      ta.removeEventListener("keyup", handleKey);
      ta.removeEventListener("click", handleKey);
    };
  }, [value, textareaRef, open, reset, updateCoords]);

  // Fetch matching experts when the debounced query changes (only while open).
  // eslint-disable-next-line no-restricted-syntax -- imperative search keyed on debounced input; the abstraction is the autocomplete itself
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    expertApi
      .search(debouncedQuery, { limit: 8 })
      .then((list) => {
        if (cancelled) return;
        setResults(Array.isArray(list) ? list : []);
        setHighlight(0);
      })
      .catch((err) => {
        // Silent failure on autocomplete — the user can still type the raw
        // `@<wallet>` token. Log so we notice if the endpoint regresses.
        logger.warn("[MentionAutocomplete] search failed", err);
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const insertMention = useCallback(
    (expert: ExpertOption) => {
      const ta = textareaRef.current;
      if (!ta || triggerStart === null) return;
      const caret = ta.selectionStart;
      const token = `@<${expert.walletAddress}>`;
      const next = `${value.slice(0, triggerStart)}${token}${value.slice(caret)}`;
      onChange(next);
      reset();
      requestAnimationFrame(() => {
        ta.focus();
        const cursor = triggerStart + token.length;
        ta.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, triggerStart, value, onChange, reset]
  );

  // Keyboard nav inside the textarea while the popover is open: arrows move
  // the highlight, Enter selects, Escape closes. We attach to the textarea
  // itself (not document) so other inputs in the modal aren't affected.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to textarea keydown only while popover is open
  useEffect(() => {
    if (!open || results.length === 0) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + results.length) % results.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        const chosen = results[highlight];
        if (chosen) {
          e.preventDefault();
          insertMention(chosen);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        reset();
      }
    };
    ta.addEventListener("keydown", onKeyDown);
    return () => ta.removeEventListener("keydown", onKeyDown);
  }, [open, results, highlight, insertMention, reset, textareaRef]);

  if (!open || results.length === 0) return null;

  return (
    <div
      ref={popoverRef}
      role="listbox"
      data-testid="mention-autocomplete"
      style={{ position: "absolute", top: coords.top, left: coords.left, minWidth: 260, maxWidth: 360 }}
      className="z-30 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
    >
      <ul className="py-1 max-h-56 overflow-auto">
        {results.map((expert, idx) => (
          <li key={expert.id}>
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent the textarea blur fight — the click should not
                // steal focus before our insertion runs.
                e.preventDefault();
                insertMention(expert);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                idx === highlight
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              data-testid={`mention-option-${expert.walletAddress}`}
            >
              <span className="font-medium">{expert.fullName || "Unnamed expert"}</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {expert.walletAddress.slice(0, 6)}...{expert.walletAddress.slice(-4)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
