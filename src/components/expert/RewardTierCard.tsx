import { Card } from "@/components/ui/card";
import { getRewardTierProgress, REWARD_TIERS } from "@/types";

interface RewardTierCardProps {
  reputation: number;
}

const tierColors: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  Foundation: {
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    border: "border-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    bar: "bg-slate-500",
  },
  Established: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  Authority: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
};

export function RewardTierCard({ reputation }: RewardTierCardProps) {
  const { tier, nextTier, progress } = getRewardTierProgress(reputation);
  const colors = tierColors[tier.name];

  return (
    <Card padding="none">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reward Tier</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg font-bold ${colors.text}`}>{tier.name}</span>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
                {tier.rewardWeight}x rewards
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Reputation</p>
            <p className="text-lg font-bold tabular-nums">{reputation}</p>
          </div>
        </div>

        {nextTier ? (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress to {nextTier.name} ({nextTier.rewardWeight}x)</span>
              <span className="tabular-nums">{reputation} / {nextTier.minReputation}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              {nextTier.minReputation - reputation} more reputation needed
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Maximum tier reached — you earn the highest reward multiplier.
          </p>
        )}

        {/* All tiers reference */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <div className="grid grid-cols-3 gap-2">
            {REWARD_TIERS.map((t) => {
              const isActive = t.name === tier.name;
              const tc = tierColors[t.name];
              return (
                <div
                  key={t.name}
                  className={`rounded-lg px-3 py-2 border transition-all ${
                    isActive
                      ? `${tc.bg} ${tc.border} ring-1 ring-offset-1 ring-offset-background ${tc.border}`
                      : "bg-muted/30 dark:bg-white/[0.02] border-border/40"
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${isActive ? tc.text : "text-muted-foreground"}`}>
                    {t.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {t.maxReputation ? `${t.minReputation}–${t.maxReputation}` : `${t.minReputation}+`} rep
                  </p>
                  <p className={`text-xs font-semibold tabular-nums mt-0.5 ${isActive ? tc.text : "text-muted-foreground"}`}>
                    {t.rewardWeight}x
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
