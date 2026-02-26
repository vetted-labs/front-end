"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  Vote,
  Award,
  ArrowDownToLine,
  Info,
  TrendingUp,
  ShieldAlert,
  Calculator,
} from "lucide-react";

export function HowEarningsWork() {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">How Earnings Work</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/40">
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            {/* Vetting Rewards */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Vote className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="text-sm font-semibold">Vetting Rewards</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                  Review candidates and submit your score
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                  Earn VETD when your score <strong className="text-foreground/80">aligns with consensus</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                  Closer alignment = bigger reward
                </li>
              </ul>
            </div>

            {/* Tier Multipliers */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <h4 className="text-sm font-semibold">Tier Multipliers</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Foundation</span>
                  <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded">1.0x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Established</span>
                  <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">1.25x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Authority</span>
                  <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">1.50x</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/60 mt-2.5">Higher tiers earn a larger share of every pool</p>
            </div>

            {/* Endorsement Rewards */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.03] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-purple-500" />
                </div>
                <h4 className="text-sm font-semibold">Endorsement Rewards</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-purple-500" />
                  Endorse a candidate you believe in
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-purple-500" />
                  If they get hired, you <strong className="text-foreground/80">share the reward pool</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-purple-500" />
                  Paid in stablecoins or $VETD per guild config
                </li>
              </ul>
            </div>

            {/* Claiming */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                </div>
                <h4 className="text-sm font-semibold">Claiming Rewards</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-emerald-500" />
                  VETD accumulates in the smart contract
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-emerald-500" />
                  Click <strong className="text-foreground/80">&quot;Claim Rewards&quot;</strong> to withdraw to your wallet
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-emerald-500" />
                  Requires one blockchain transaction to confirm
                </li>
              </ul>
            </div>

            {/* Slashing Risk */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <h4 className="text-sm font-semibold">Slashing Risk</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-red-500" />
                  Scores far from consensus can trigger slashing
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-red-500" />
                  Up to <strong className="text-foreground/80">25% of staked VETD</strong> may be slashed
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-red-500" />
                  Stay aligned with consensus to protect your stake
                </li>
              </ul>
            </div>

            {/* Reward Formula */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-4 h-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold">Reward Formula</h4>
              </div>
              <div className="bg-background/60 rounded-lg px-3.5 py-2.5 border border-border/40 font-mono text-xs text-center text-muted-foreground leading-relaxed">
                Reward = (Your Weight / Total Aligned Weights) &times; Pool
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
                Authority (1.50x) always earns 50% more than Foundation (1.0x) in the same round
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
