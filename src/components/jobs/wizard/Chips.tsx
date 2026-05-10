"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

/**
 * Pill-style chip group used by the wizard for single-select choices like
 * experience level, employment type, and work model.
 */
export interface ChipGroupOption<V extends string = string> {
  value: V;
  label: string;
}

interface ChipGroupProps<V extends string> {
  value: V | undefined;
  options: ReadonlyArray<ChipGroupOption<V>>;
  onChange: (value: V) => void;
  ariaLabel?: string;
  /** When the field is invalid we tint the inactive chips' border to destructive. */
  invalid?: boolean;
}

export function ChipGroup<V extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  invalid,
}: ChipGroupProps<V>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
              active
                ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                : "bg-muted text-muted-foreground border-border hover:text-foreground",
              invalid && !active && "border-destructive/40"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipMultiSelectProps {
  values: string[];
  /** Suggestions shown in the autocomplete dropdown — full universe of options. */
  suggestions: ReadonlyArray<string>;
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Inclusive cap. UI also surfaces the count "x of max". */
  max?: number;
  invalid?: boolean;
}

/**
 * Chip multi-select with autocomplete used for top skills. Pulls suggestions
 * from a static list; users may also press Enter to add a free-form value.
 */
export function ChipMultiSelect({
  values,
  suggestions,
  onChange,
  placeholder = "Type to search…",
  max = 8,
  invalid,
}: ChipMultiSelectProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  useClickOutside(shellRef, () => setOpen(false));

  const filteredSuggestions = useMemo(() => {
    const lower = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !values.includes(s))
      .filter((s) => (lower ? s.toLowerCase().includes(lower) : true))
      .slice(0, 8);
  }, [input, suggestions, values]);

  const addValue = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;
    if (values.length >= max) return;
    onChange([...values, v]);
    setInput("");
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue(input);
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  const atCap = values.length >= max;

  return (
    <div ref={shellRef} className="relative">
      <div
        className={cn(
          "rounded-lg border bg-muted px-3 py-2 flex flex-wrap gap-2 items-center min-h-[50px] transition-colors",
          open
            ? "border-primary/40 ring-4 ring-primary/10"
            : "border-border",
          invalid && "border-destructive/60"
        )}
        onClick={() => setOpen(true)}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs font-semibold px-2.5 py-1"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                removeValue(v);
              }}
              className="grid place-items-center w-3.5 h-3.5 rounded-full bg-primary/20 text-primary"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={atCap ? "Limit reached" : placeholder}
          disabled={atCap}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/70 px-1 py-1"
        />
      </div>

      {open && filteredSuggestions.length > 0 && !atCap && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-10 rounded-lg border border-border bg-card shadow-lg p-1.5">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                addValue(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChipListInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  invalid?: boolean;
}

/**
 * Free-form chip input — Enter / comma adds a chip. Backspace on an empty
 * input removes the last chip. Used for the requirements list in step 3.
 */
export function ChipListInput({
  values,
  onChange,
  placeholder = "Add and press Enter…",
  max = 12,
  invalid,
}: ChipListInputProps) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.length >= max) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setInput("");
  };
  const remove = (v: string) =>
    onChange(values.filter((x) => x !== v));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      remove(values[values.length - 1]);
    }
  };

  const atCap = values.length >= max;

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted px-3 py-2 flex flex-wrap gap-2 items-center min-h-[50px] focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 transition-colors",
        invalid ? "border-destructive/60" : "border-border"
      )}
    >
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border text-foreground text-sm px-2.5 py-1"
        >
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => remove(v)}
            className="grid place-items-center w-3.5 h-3.5 rounded bg-muted text-muted-foreground"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={atCap ? "Limit reached" : placeholder}
        disabled={atCap}
        className="flex-1 min-w-[200px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/70 px-1 py-1"
      />
    </div>
  );
}
