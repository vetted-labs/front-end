"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackState = "idle" | "positive" | "negative";

/**
 * "Was this page helpful?" widget. Client-only for v1 — records state
 * locally so the user sees an acknowledgement. A real endpoint can be
 * wired up later without changing call sites.
 */
export function DocsFeedback() {
  const [state, setState] = useState<FeedbackState>("idle");

  return (
    <aside className="mt-14 rounded-xl ring-1 ring-border bg-muted/30 p-5">
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Was this page helpful?
      </p>
      {state === "idle" ? (
        <div className="mt-3 flex items-center gap-2">
          <FeedbackButton
            icon={<ThumbsUp className="h-4 w-4" />}
            label="Yes"
            onClick={() => setState("positive")}
          />
          <FeedbackButton
            icon={<ThumbsDown className="h-4 w-4" />}
            label="No"
            onClick={() => setState("negative")}
          />
          <Link
            href="/docs/faq"
            className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Still have questions?
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-foreground">
          {state === "positive"
            ? "Thanks — glad it helped."
            : "Thanks for the signal. We use it to prioritise which pages to improve next."}
        </p>
      )}
    </aside>
  );
}

function FeedbackButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-[13px] font-medium text-foreground ring-1 ring-border transition-colors hover:ring-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
