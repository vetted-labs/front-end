import { Card } from "@/components/ui/card";
import { Shield, TrendingUp, TrendingDown, Target } from "lucide-react";
import { STAT_ICON, STATUS_COLORS } from "@/config/colors";

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
          <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.positive.bgSubtle} flex items-center justify-center`}>
            <TrendingUp className={`w-5 h-5 ${STATUS_COLORS.positive.text}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gained</p>
            <p className={`text-2xl font-bold tabular-nums ${STATUS_COLORS.positive.text}`}>+{totalGains}</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.negative.bgSubtle} flex items-center justify-center`}>
            <TrendingDown className={`w-5 h-5 ${STATUS_COLORS.negative.text}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lost</p>
            <p className={`text-2xl font-bold tabular-nums ${STATUS_COLORS.negative.text}`}>{totalLosses || 0}</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${STAT_ICON.bg} flex items-center justify-center`}>
            <Target className={`w-5 h-5 ${STAT_ICON.text}`} />
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
