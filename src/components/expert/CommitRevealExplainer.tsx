"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export function CommitRevealExplainer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
        aria-expanded={expanded}
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        Why does voting have two steps?
        {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>
      {expanded && (
        <p className="text-sm text-muted-foreground mt-2 pl-6">
          Blind voting prevents experts from copying each other&apos;s scores. First, you <strong>commit</strong> an
          encrypted version of your vote. Once all experts have committed, you <strong>reveal</strong> your actual
          score. This ensures each review is independent and honest.
        </p>
      )}
    </div>
  );
}
