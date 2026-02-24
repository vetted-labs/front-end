"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useGuilds } from "@/lib/hooks/useGuilds";

const PROPOSAL_TYPES = [
  { value: "general", label: "General Proposal" },
  { value: "parameter_change", label: "Parameter Change" },
  { value: "guild_master_election", label: "Guild Master Election" },
  { value: "guild_creation", label: "Guild Creation" },
];

const VOTING_DURATIONS = [
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days (Recommended)" },
  { value: "14", label: "14 days" },
];

export default function CreateGovernanceProposalPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { guilds: guildRecords } = useGuilds();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("general");
  const [guildId, setGuildId] = useState("");
  const [stakeAmount, setStakeAmount] = useState("100");
  const [votingDuration, setVotingDuration] = useState("7");
  // Parameter change fields
  const [parameterName, setParameterName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  // Election fields
  const [nomineeWallet, setNomineeWallet] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    if (parseFloat(stakeAmount) < 100) {
      toast.error("Minimum stake is 100 VETD");
      return;
    }

    try {
      setIsSubmitting(true);

      const data: Record<string, unknown> = {
        title,
        description,
        proposalType,
        stakeAmount: parseFloat(stakeAmount),
        votingDurationDays: parseInt(votingDuration),
      };

      if (guildId) data.guildId = guildId;

      if (proposalType === "parameter_change") {
        data.parameterName = parameterName;
        data.currentValue = currentValue;
        data.proposedValue = proposedValue;
      }

      if (proposalType === "guild_master_election") {
        data.nomineeWallet = nomineeWallet;
        if (guildId) data.guildId = guildId;
      }

      await governanceApi.createProposal(data, address);

      toast.success("Governance proposal created!");
      router.push("/expert/governance");
    } catch (error: any) {
      console.error("Error creating proposal:", error);
      toast.error(error.message || "Failed to create proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full">

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Governance
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Governance Proposal</CardTitle>
            <CardDescription>
              Submit a proposal for the community to vote on. You must stake a minimum of 100 VETD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A concise title for your proposal"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your proposal in detail. What change do you propose and why?"
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Proposal Type</label>
                <Select value={proposalType} onValueChange={setProposalType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional fields based on type */}
              {proposalType === "parameter_change" && (
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm font-medium text-blue-600">Parameter Change Details</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Parameter Name</label>
                      <Input
                        value={parameterName}
                        onChange={(e) => setParameterName(e.target.value)}
                        placeholder="e.g., minimum_stake_amount"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current Value</label>
                        <Input
                          value={currentValue}
                          onChange={(e) => setCurrentValue(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Proposed Value</label>
                        <Input
                          value={proposedValue}
                          onChange={(e) => setProposedValue(e.target.value)}
                          placeholder="200"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {proposalType === "guild_master_election" && (
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm font-medium text-amber-600">Election Details</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nominee Wallet Address</label>
                      <Input
                        value={nomineeWallet}
                        onChange={(e) => setNomineeWallet(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {(proposalType === "guild_master_election" || proposalType === "guild_creation") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Guild</label>
                  <Select value={guildId} onValueChange={setGuildId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a guild" />
                    </SelectTrigger>
                    <SelectContent>
                      {guildRecords.map((guild) => (
                        <SelectItem key={guild.id} value={guild.id}>
                          {guild.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stake Amount (VETD)</label>
                  <Input
                    type="number"
                    min="100"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 100 VETD</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voting Duration</label>
                  <Select value={votingDuration} onValueChange={setVotingDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOTING_DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!address && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Please connect your wallet to create a governance proposal.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !address}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Proposal"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
