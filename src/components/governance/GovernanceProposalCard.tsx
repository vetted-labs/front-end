"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { formatDeadline } from "@/lib/utils";
import { VotingPowerBar } from "./VotingPowerBar";

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

const typeColors: Record<string, string> = {
  parameter_change: "border-l-blue-500",
  guild_master_election: "border-l-amber-500",
  guild_creation: "border-l-green-500",
  general: "border-l-purple-500",
};

const typeBadgeColors: Record<string, string> = {
  parameter_change: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  guild_master_election: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  guild_creation: "bg-green-500/10 text-green-600 border-green-500/20",
  general: "bg-purple-500/10 text-purple-600 border-purple-500/20",
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
  const borderColor = typeColors[proposal.proposal_type] || "border-l-purple-500";

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
                className={typeBadgeColors[proposal.proposal_type] || ""}
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
          <span className="text-xs">
            Quorum: {proposal.total_voting_power}/{proposal.quorum_required}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
