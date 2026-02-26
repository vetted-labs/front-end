import { Card } from "@/components/ui/card";
import { Shield, TrendingUp, TrendingDown, Target } from "lucide-react";

interface ReputationScoreCardsProps {
  reputation: number;
  totalGains: number;
  totalLosses: number;
  alignedCount: number;
  deviationCount: number;
}

export function ReputationScoreCards({
  reputation,
  totalGains,
  totalLosses,
  alignedCount,
  deviationCount,
}: ReputationScoreCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</p>
            <p className="text-2xl font-bold tabular-nums">{reputation}</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gained</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{totalGains}</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lost</p>
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{totalLosses || 0}</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alignment</p>
            <p className="text-2xl font-bold tabular-nums">
              {alignedCount + deviationCount > 0
                ? Math.round((alignedCount / (alignedCount + deviationCount)) * 100)
                : 100}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
