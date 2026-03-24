import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Settings2,
  Crown,
  Shield,
  Coins,
  ArrowRight,
  Scale,
} from "lucide-react";
import { GOVERNANCE_THRESHOLDS, DEFAULT_GOVERNANCE_THRESHOLD } from "@/config/constants";
import type { GuildRecord } from "@/types";

const PROPOSAL_TYPES = [
  {
    value: "guild_policy",
    label: "Guild Policy",
    description: "Propose a guild governance policy change",
    icon: FileText,
  },
  {
    value: "parameter_change",
    label: "Parameter Change",
    description: "Modify a specific protocol parameter",
    icon: Settings2,
  },
  {
    value: "guild_master_election",
    label: "Guild Master Election",
    description: "Nominate a new guild master",
    icon: Crown,
  },
  {
    value: "guild_creation",
    label: "Guild Creation",
    description: "Propose creating a new guild",
    icon: Shield,
  },
  {
    value: "treasury_spend",
    label: "Treasury Spend",
    description: "Propose allocation of treasury funds",
    icon: Coins,
  },
  {
    value: "protocol_upgrade",
    label: "Protocol Upgrade",
    description: "Propose an upgrade to the protocol",
    icon: ArrowRight,
  },
];

/** Types that require a guild selection */
export const GUILD_REQUIRED_TYPES = [
  "guild_policy",
  "guild_master_election",
  "guild_creation",
];

interface ProposalTypeSectionProps {
  proposalType: string;
  onProposalTypeChange: (value: string) => void;
  // Parameter change fields
  parameterName: string;
  onParameterNameChange: (value: string) => void;
  currentValue: string;
  onCurrentValueChange: (value: string) => void;
  proposedValue: string;
  onProposedValueChange: (value: string) => void;
  // Election fields
  nomineeWallet: string;
  onNomineeWalletChange: (value: string) => void;
  // Guild selection
  guildId: string;
  onGuildIdChange: (value: string) => void;
  guilds: GuildRecord[];
}

export function ProposalTypeSection({
  proposalType,
  onProposalTypeChange,
  parameterName,
  onParameterNameChange,
  currentValue,
  onCurrentValueChange,
  proposedValue,
  onProposedValueChange,
  nomineeWallet,
  onNomineeWalletChange,
  guildId,
  onGuildIdChange,
  guilds,
}: ProposalTypeSectionProps) {
  const needsGuild = GUILD_REQUIRED_TYPES.includes(proposalType);
  const threshold =
    GOVERNANCE_THRESHOLDS[proposalType] ?? DEFAULT_GOVERNANCE_THRESHOLD;

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Proposal Type
          </h3>
          <p className="text-sm text-muted-foreground">
            Select the category that best fits your proposal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROPOSAL_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = proposalType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onProposalTypeChange(type.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:border-primary/30 hover:bg-accent/5"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary/15" : "bg-muted/50"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isSelected ? "text-foreground" : "text-foreground/80"
                  }`}
                >
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {type.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Threshold info based on selected type */}
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 flex items-center gap-3 text-sm">
        <Scale className="w-4 h-4 text-primary shrink-0" />
        <span className="text-muted-foreground">
          This proposal type requires{" "}
          <span className="font-semibold text-foreground">
            {threshold.threshold}% approval
          </span>{" "}
          to pass
          {threshold.threshold > 51 &&
            " (major change \u2014 higher threshold)"}
          . Voting power is merit-weighted based on reputation.
        </span>
      </div>

      {/* Conditional: Parameter Change Details */}
      {proposalType === "parameter_change" && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Parameter Change Details
            </p>
          </div>
          <Input
            label="Parameter Name"
            value={parameterName}
            onChange={(e) => onParameterNameChange(e.target.value)}
            placeholder="e.g., minimum_stake_amount"
          />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <Input
              label="Current Value"
              value={currentValue}
              onChange={(e) => onCurrentValueChange(e.target.value)}
              placeholder="100"
            />
            <div className="hidden sm:flex items-center justify-center h-10">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              label="Proposed Value"
              value={proposedValue}
              onChange={(e) => onProposedValueChange(e.target.value)}
              placeholder="200"
            />
          </div>
        </div>
      )}

      {/* Conditional: Election Details */}
      {proposalType === "guild_master_election" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Election Details
            </p>
          </div>
          <Input
            label="Nominee Wallet Address"
            value={nomineeWallet}
            onChange={(e) => onNomineeWalletChange(e.target.value)}
            placeholder="0x..."
          />
        </div>
      )}

      {/* Guild Selection — shown for guild-related types */}
      {needsGuild && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Guild <span className="text-destructive">*</span>
          </label>
          <Select value={guildId} onValueChange={onGuildIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a guild" />
            </SelectTrigger>
            <SelectContent>
              {guilds.map((guild) => (
                <SelectItem key={guild.id} value={guild.id}>
                  {guild.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
