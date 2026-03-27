"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Scale } from "lucide-react";
import { formatDeadline } from "@/lib/utils";
import { VotingPowerBar } from "./VotingPowerBar";
import { GOVERNANCE_THRESHOLDS, DEFAULT_GOVERNANCE_THRESHOLD } from "@/config/constants";
import { getProposalTypeColors } from "@/config/colors";

interface GovernanceProposalCardProps {
  proposal: {
    id: string;
    title: string;
    description: string;
    proposal_type: string;
    status: string;
    voting_deadline: string;
    votes_for: number;
    votes_against: number;
    votes_abstain: number;
    total_voting_power: number;
    quorum_required: number;
    voter_count?: number;
  };
  onClick?: () => void;
}

const typeLeftBorder: Record<string, string> = {
  parameter_change: "border-l-info-blue",
  guild_master_election: "border-l-warning",
  guild_creation: "border-l-positive",
  general: "border-l-info-blue",
};

const typeLabels: Record<string, string> = {
  parameter_change: "Parameter Change",
  guild_master_election: "Election",
  guild_creation: "Guild Creation",
  general: "General",
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default" as const;
    case "passed":
      return "default" as const;
    case "rejected":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

export function GovernanceProposalCard({
  proposal,
  onClick,
}: GovernanceProposalCardProps) {
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPercent = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? (proposal.votes_abstain / totalVotes) * 100 : 0;
  const borderColor = typeLeftBorder[proposal.proposal_type] || "border-l-info-blue";
  const typeColors = getProposalTypeColors(proposal.proposal_type);
  const threshold = GOVERNANCE_THRESHOLDS[proposal.proposal_type] ?? DEFAULT_GOVERNANCE_THRESHOLD;

  return (
    <Card
      className={`border-l-4 ${borderColor} hover:border-primary/50 transition-all cursor-pointer`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">{proposal.title}</h3>
              <Badge
                variant="outline"
                className={typeColors.badge}
              >
                {typeLabels[proposal.proposal_type] || proposal.proposal_type}
              </Badge>
              <Badge variant={statusBadgeVariant(proposal.status)}>
                {proposal.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {proposal.description}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <VotingPowerBar
            forPercent={forPercent}
            againstPercent={againstPercent}
            abstainPercent={abstainPercent}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {proposal.voter_count || 0} voters
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDeadline(proposal.voting_deadline)}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs">
            <Scale className="w-3 h-3" />
            {threshold.threshold}% to pass
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
