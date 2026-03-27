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

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
      {children}
    </li>
  );
}

export function HowEarningsWork() {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold">How Earnings Work</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            <Section icon={Vote} title="Vetting Rewards">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <Bullet>Review candidates and submit your score</Bullet>
                <Bullet>Earn VETD when your score <strong className="text-foreground/80">aligns with consensus</strong></Bullet>
                <Bullet>Closer alignment = bigger reward</Bullet>
              </ul>
            </Section>

            <Section icon={TrendingUp} title="Tier Multipliers">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Foundation</span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.0x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Established</span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.25x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Authority</span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.50x</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/60 mt-2.5">Higher tiers earn a larger share of every pool</p>
            </Section>

            <Section icon={Award} title="Endorsement Rewards">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <Bullet>Endorse a candidate you believe in</Bullet>
                <Bullet>If they get hired, you <strong className="text-foreground/80">share the reward pool</strong></Bullet>
                <Bullet>Paid in $VETD per guild config</Bullet>
              </ul>
            </Section>

            <Section icon={ArrowDownToLine} title="Claiming Rewards">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <Bullet>VETD accumulates in the smart contract</Bullet>
                <Bullet>Click <strong className="text-foreground/80">&quot;Claim Rewards&quot;</strong> to withdraw to your wallet</Bullet>
                <Bullet>Requires one blockchain transaction to confirm</Bullet>
              </ul>
            </Section>

            <Section icon={ShieldAlert} title="Slashing Risk">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <Bullet>Scores far from consensus can trigger slashing</Bullet>
                <Bullet>Up to <strong className="text-foreground/80">25% of staked VETD</strong> may be slashed</Bullet>
                <Bullet>Stay aligned with consensus to protect your stake</Bullet>
              </ul>
            </Section>

            <Section icon={Calculator} title="Reward Formula">
              <div className="bg-background/60 rounded-lg px-3.5 py-2.5 border border-border font-mono text-xs text-center text-muted-foreground leading-relaxed">
                Reward = (Your Weight / Total Aligned Weights) &times; Pool
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
                Authority (1.50x) always earns 50% more than Foundation (1.0x) in the same round
              </p>
            </Section>
          </div>
        </div>
      )}
    </Card>
  );
}
