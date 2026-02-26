"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Info, ChevronDown } from "lucide-react";

export function HowReputationWorks() {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">How Reputation Works</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/40">
          <div className="grid sm:grid-cols-2 gap-6 pt-4">
            {/* What is Reputation */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                What is Reputation?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reputation measures your standing as an expert within the Vetted protocol. It determines your guild rank, your reward tier, and your share of VETD rewards from each vetting pool.
              </p>
            </div>

            {/* How You Earn It */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                How You Earn Reputation
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reputation is gained through three activities: Vetting (+10 per aligned vote), Endorsements (+20 for successful hires), and Governance participation (+5 to +10 per vote). Deviating from consensus costs -20 points. Inactivity decays -10 per cycle.
              </p>
            </div>

            {/* Reputation Sources */}
            <div className="sm:col-span-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Reputation Sources
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Vetting</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Review candidates and align with guild consensus. The closer your score to the consensus after finalization, the more reputation you earn.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Endorsement</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Stake on candidates you believe in. Successful endorsements (candidate gets hired) earn reputation and rewards.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Governance Participation</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Participate in guild governance by voting on proposals. Active governance participation earns reputation over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Alignment Scoring
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                After a vetting is finalized, the consensus score is calculated using IQR-based filtering (statistical outlier removal). Your &quot;distance&quot; is how far your score was from this consensus. Lower distance = better alignment.
              </p>
            </div>

            {/* Reward Tiers */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Reward Tiers
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your reputation determines your reward tier: Foundation (0–999, 1.0x), Established (1,000–1,999, 1.25x), and Authority (2,000+, 1.50x). Higher tiers earn a proportionally larger share of every vetting reward pool.
              </p>
            </div>

            {/* Ranks */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Guild Ranks
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reputation also unlocks guild ranks: Recruit, Apprentice (50+), Craftsman (150+), Officer (300+), and Guild Master (500+). Higher ranks grant governance influence and endorsement eligibility.
              </p>
            </div>

            {/* Pool Distribution */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Pool Distribution Formula
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each vetting round has a fixed reward pool. Your share is calculated as: Your Tier Weight / Sum of All Aligned Experts&apos; Weights &times; Pool. The pool total never changes — higher-tier experts earn more by receiving a larger proportion, not by inflating the pool.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
