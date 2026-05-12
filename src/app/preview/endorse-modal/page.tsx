"use client";

import { useState } from "react";
import { EndorseCandidateModal } from "@/components/endorsements/endorse/EndorseCandidateModal";
import { STORY_LAB_ENDORSEMENT_APPLICATION } from "@/components/expert/story-lab/storyLabFixtures";
import type { TransactionStep } from "@/lib/hooks/useEndorsementTransaction";

const TX_STATES: Array<{ key: TransactionStep; label: string }> = [
  { key: "idle", label: "Idle (default)" },
  { key: "signing", label: "Signing permit" },
  { key: "bidding", label: "Placing bid" },
  { key: "success", label: "Success" },
  { key: "error", label: "Error" },
];

/**
 * Dev-only preview surface for the endorse-candidate modal.
 *
 *   /preview/endorse-modal
 *
 * Mounts the modal with the story-lab Riley Park fixture and lets you flip
 * between modes / transaction states without needing wallet auth or backend
 * data. Useful for visual regression and quick smoke tests.
 */
export default function EndorseModalPreviewPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"endorse" | "view">("endorse");
  const [initialStep, setInitialStep] = useState<1 | 2 | 3 | 4>(1);
  const [txStep, setTxStep] = useState<TransactionStep>("idle");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Dev preview
          </p>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Endorse Candidate Modal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Renders <code>EndorseCandidateModal</code> with the story-lab Riley
            Park fixture. No wallet, no backend required.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Mode
            </label>
            <div className="flex gap-2">
              {(["endorse", "view"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Initial step
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInitialStep(s)}
                  disabled={mode === "view" && s === 4}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    initialStep === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Transaction state
            </label>
            <div className="flex flex-wrap gap-2">
              {TX_STATES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setTxStep(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    txStep === s.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors"
          >
            Open modal
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Notes</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>The stake action is wired to a no-op promise for previewing.</li>
            <li>Real flow uses <code>useEndorsementTransaction</code> in the marketplace.</li>
            <li>
              In <code>view</code> mode the stake step is hidden and the
              snapshot shows the existing bid.
            </li>
          </ul>
        </div>
      </div>

      <EndorseCandidateModal
        application={STORY_LAB_ENDORSEMENT_APPLICATION}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode={mode}
        initialStep={initialStep}
        userBalance="1200.00"
        userStake="50.00"
        minimumBid="10"
        onPlaceEndorsement={async () => {
          await new Promise((r) => setTimeout(r, 600));
        }}
        txStep={txStep}
        txError={txStep === "error" ? "Transaction rejected by user (preview)" : null}
        existingBid={mode === "view" ? "75" : undefined}
      />
    </div>
  );
}
