"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Info,
  ChevronDown,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import type { VettedIconName } from "@/components/ui/vetted-icon";
import { STATUS_COLORS } from "@/config/colors";
import { HelpLink } from "@/components/ui/HelpLink";
import { DOC_LINKS } from "@/config/docLinks";

function SectionIcon({ icon }: { icon: React.ElementType | VettedIconName }) {
  if (typeof icon === "string") {
    return <VettedIcon name={icon as VettedIconName} className="w-4 h-4 text-muted-foreground" />;
  }
  const Icon = icon;
  return <Icon className="w-4 h-4 text-muted-foreground" />;
}

function Section({ icon, title, children }: { icon: React.ElementType | VettedIconName; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <SectionIcon icon={icon} />
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

export function HowReputationWorks() {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <div className="flex w-full items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold">How Reputation Works</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <HelpLink href={DOC_LINKS.reputation} variant="subtle" size="sm">
          Full guide
        </HelpLink>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            <Section icon="voting" title="Vetting">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <Bullet>Review candidates and submit your score</Bullet>
                <Bullet>Scores are compared to <strong className="text-foreground/80">IQR-based consensus</strong> after finalization</Bullet>
                <Bullet>The closer your score to consensus, the more reputation you earn</Bullet>
              </ul>
            </Section>

            <Section icon="endorsement" title="Endorsements">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <Bullet>Stake on candidates you believe in</Bullet>
                <Bullet>Earn <strong className="text-foreground/80">+20 reputation</strong> when your endorsed candidate gets hired</Bullet>
                <Bullet>Failed endorsements have no reputation penalty</Bullet>
              </ul>
            </Section>

            <Section icon={"voting" as VettedIconName} title="Governance">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <Bullet>Vote on guild proposals and governance decisions</Bullet>
                <Bullet>Earn <strong className="text-foreground/80">+5 to +10 reputation</strong> per vote</Bullet>
                <Bullet>Active participation builds reputation over time</Bullet>
              </ul>
            </Section>

            <Section icon={"staking" as VettedIconName} title="Slashing Risk">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <Bullet>Scores far from consensus trigger stake slashing</Bullet>
                <Bullet>Up to <strong className="text-foreground/80">25% of staked VETD</strong> may be slashed</Bullet>
                <Bullet>Inactivity decays <strong className="text-foreground/80">-10 reputation</strong> per cycle</Bullet>
              </ul>
            </Section>

            {/* Alignment Calculation — full width */}
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <VettedIcon name="consensus" className="w-4 h-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold">How Alignment Is Calculated</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                After a vetting round finalizes, the consensus score is calculated using <strong className="text-foreground/80">IQR-based filtering</strong> (statistical outlier removal). Your deviation is measured as a multiple of the IQR distance from the median.
              </p>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-medium">Deviation</th>
                      <th className="text-center px-3 py-2 font-medium">Reputation</th>
                      <th className="text-center px-3 py-2 font-medium">Slash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    <tr>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">Aligned</span>
                        <span className="text-muted-foreground/60 text-xs ml-1.5">within IQR</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.positive.badge} px-2 py-0.5 rounded`}>+10</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-mono text-xs text-muted-foreground/50">0%</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">Mild</span>
                        <span className="text-muted-foreground/60 text-xs ml-1.5">1 &ndash; 1.5x IQR</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.warning.badge} px-2 py-0.5 rounded`}>-5</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.warning.text}`}>5%</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">Moderate</span>
                        <span className="text-muted-foreground/60 text-xs ml-1.5">1.5 &ndash; 2x IQR</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.negative.badge} px-2 py-0.5 rounded`}>-10</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.negative.text}`}>15%</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">Severe</span>
                        <span className="text-muted-foreground/60 text-xs ml-1.5">&gt; 2x IQR</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.negative.badge} px-2 py-0.5 rounded`}>-20</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-xs font-medium ${STATUS_COLORS.negative.text}`}>25%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Section icon="reputation" title="Reward Tiers">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Foundation <span className="text-muted-foreground/50 text-xs">0 &ndash; 999</span></span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.0x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Established <span className="text-muted-foreground/50 text-xs">1,000 &ndash; 1,999</span></span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.25x</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Authority <span className="text-muted-foreground/50 text-xs">2,000+</span></span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">1.50x</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/60 mt-2.5">Higher tiers earn a larger share of every vetting reward pool</p>
            </Section>

            <Section icon={"earnings" as VettedIconName} title="Pool Distribution">
              <div className="bg-background/60 rounded-lg px-3.5 py-2.5 border border-border font-mono text-xs text-center text-muted-foreground leading-relaxed">
                Reward = (Your Weight / Total Aligned Weights) &times; Pool
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
                The pool is fixed per round &mdash; higher tiers earn more by proportion, not by inflating the pool
              </p>
            </Section>
          </div>
        </div>
      )}
    </Card>
  );
}
