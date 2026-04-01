import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins, Clock } from "lucide-react";

const VOTING_DURATIONS = [
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];

interface VotingParametersSectionProps {
  stakeAmount: string;
  onStakeAmountChange: (value: string) => void;
  votingDuration: string;
  onVotingDurationChange: (value: string) => void;
  onBlur?: (field: string, value: string) => void;
  fieldErrors?: Record<string, string>;
}

export function VotingParametersSection({
  stakeAmount,
  onStakeAmountChange,
  votingDuration,
  onVotingDurationChange,
  onBlur,
  fieldErrors = {},
}: VotingParametersSectionProps) {
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-positive/10 rounded-lg flex items-center justify-center">
          <Coins className="w-5 h-5 text-positive" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Voting Parameters
          </h3>
          <p className="text-sm text-muted-foreground">
            Set the stake and duration for community voting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Stake Amount (VETD){" "}
            <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="100"
            value={stakeAmount}
            onChange={(e) => onStakeAmountChange(e.target.value)}
            onBlur={(e) => onBlur?.("stakeAmount", e.target.value)}
            error={fieldErrors.stakeAmount}
          />
          {!fieldErrors.stakeAmount && (
            <p className="text-xs text-muted-foreground">
              Minimum 100 VETD — staked tokens are returned after voting
              concludes
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Voting Duration
          </label>
          <Select
            value={votingDuration}
            onValueChange={onVotingDurationChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOTING_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{d.label}</span>
                    {d.value === "7" && (
                      <span className="text-xs text-primary font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
