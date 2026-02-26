"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useRequireWallet } from "@/lib/hooks/useRequireWallet";
import { governanceApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ScrollText,
  FileText,
  Settings2,
  Clock,
  Coins,
  Wallet,
  Crown,
  ArrowRight,
  Shield,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useGuilds } from "@/lib/hooks/useGuilds";
import {
  useAppealStaking,
  useTransactionConfirmation,
} from "@/lib/hooks/useVettedContracts";
import { TransactionModal } from "@/components/dashboard/TransactionModal";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";

type SubmitStep = "idle" | "approving" | "staking" | "confirming" | "creating";

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

const VOTING_DURATIONS = [
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];

// Types that require a guild selection
const GUILD_REQUIRED_TYPES = [
  "guild_policy",
  "guild_master_election",
  "guild_creation",
];

export function CreateProposalForm() {
  const router = useRouter();
  const { address } = useAccount();
  const { ready } = useRequireWallet();
  const { guilds: guildRecords } = useGuilds();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("guild_policy");
  const [guildId, setGuildId] = useState("");
  const [stakeAmount, setStakeAmount] = useState("100");
  const [votingDuration, setVotingDuration] = useState("7");
  const [parameterName, setParameterName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [nomineeWallet, setNomineeWallet] = useState("");
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");

  // On-chain transaction tracking
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txModalStatus, setTxModalStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [txErrorMessage, setTxErrorMessage] = useState("");

  const needsGuild = GUILD_REQUIRED_TYPES.includes(proposalType);
  const { approveTokens, stakeForAppeal, needsApproval } = useAppealStaking(
    guildId || undefined
  );
  const {
    isSuccess: txConfirmed,
    isError: txError,
    error: txErrorDetails,
  } = useTransactionConfirmation(txHash || undefined);

  const isSubmitting = submitStep !== "idle";

  const buttonLabel = (() => {
    switch (submitStep) {
      case "approving":
        return "Approving Tokens...";
      case "staking":
        return "Staking VETD...";
      case "confirming":
        return "Confirming On-Chain...";
      case "creating":
        return "Creating Proposal...";
      default:
        return `Stake ${stakeAmount} VETD & Create Proposal`;
    }
  })();

  // Build the proposal data object
  const buildProposalData = useCallback(() => {
    const data: Record<string, unknown> = {
      title,
      description,
      proposalType,
      stakeAmount: parseFloat(stakeAmount),
      votingDurationDays: parseInt(votingDuration),
    };

    if (guildId) data.targetGuildId = guildId;
    if (txHash) data.txHash = txHash;

    if (proposalType === "parameter_change") {
      data.targetParameter = parameterName;
      data.currentValue = currentValue;
      data.proposedValue = proposedValue;
    }

    if (proposalType === "guild_master_election") {
      data.nomineeExpertId = nomineeWallet;
      if (guildId) data.targetGuildId = guildId;
    }

    return data;
  }, [
    title,
    description,
    proposalType,
    stakeAmount,
    votingDuration,
    guildId,
    txHash,
    parameterName,
    currentValue,
    proposedValue,
    nomineeWallet,
  ]);

  // When on-chain tx confirms, create the backend proposal
  useEffect(() => {
    if (txConfirmed && txHash && submitStep === "confirming") {
      const createBackendProposal = async () => {
        try {
          setSubmitStep("creating");
          await governanceApi.createProposal(buildProposalData(), address!);
          setTxModalStatus("success");
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to create proposal";
          toast.error(message);
          setTxModalStatus("error");
          setTxErrorMessage(message);
        }
      };
      createBackendProposal();
    }
  }, [txConfirmed, txHash, submitStep, buildProposalData, address]);

  // Handle on-chain tx error
  useEffect(() => {
    if (txError && txHash && submitStep === "confirming") {
      const errorMessage =
        (txErrorDetails as Error)?.message || "Transaction failed on blockchain";
      setTxModalStatus("error");
      setTxErrorMessage(errorMessage);
      setSubmitStep("idle");
    }
  }, [txError, txHash, submitStep, txErrorDetails]);

  if (!ready) {
    return <WalletRequiredState message="Please connect your wallet to create governance proposals" />;
  }

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

    if (needsGuild && !guildId) {
      toast.error("Please select a guild for this proposal type");
      return;
    }

    try {
      if (guildId) {
        // Guild-related proposal: approve → stake → wait for confirmation → create
        if (needsApproval(stakeAmount)) {
          setSubmitStep("approving");
          await approveTokens(stakeAmount);
        }

        setSubmitStep("staking");
        const hash = await stakeForAppeal(stakeAmount);
        setTxHash(hash);
        setSubmitStep("confirming");
        setShowTxModal(true);
        setTxModalStatus("pending");
        // The useEffect above handles the rest after on-chain confirmation
      } else {
        // Non-guild proposal: skip on-chain staking, create directly
        setSubmitStep("creating");
        setShowTxModal(true);
        setTxModalStatus("pending");

        await governanceApi.createProposal(buildProposalData(), address);

        setTxModalStatus("success");
      }
    } catch (error: unknown) {
      const isUserRejection =
        error instanceof Error &&
        (error.message.includes("User rejected") ||
          error.message.includes("User denied"));

      if (isUserRejection) {
        toast.error("Transaction rejected");
        setShowTxModal(false);
      } else if (submitStep === "approving") {
        toast.error("Token approval failed");
        setShowTxModal(false);
      } else if (submitStep === "staking") {
        toast.error("On-chain staking failed. No proposal was created.");
        setShowTxModal(false);
      } else {
        const message =
          error instanceof Error ? error.message : "Failed to create proposal";
        setTxModalStatus("error");
        setTxErrorMessage(message);
      }
      setSubmitStep("idle");
    }
  };

  const handleTxModalClose = () => {
    const wasSuccess = txModalStatus === "success";
    setShowTxModal(false);
    setTxHash(null);
    setTxModalStatus("pending");
    setTxErrorMessage("");
    setSubmitStep("idle");

    if (wasSuccess) {
      toast.success("Governance proposal created!");
      router.push("/expert/governance");
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
        <form onSubmit={handleSubmit}>
          {/* Section 1: Proposal Details */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Proposal Details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Describe the change you want to propose
                </p>
              </div>
            </div>

            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A concise title for your proposal"
            />

            <Textarea
              label="Description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proposal in detail. What change do you propose and why?"
              rows={5}
              showCounter
              minLength={20}
              maxLength={2000}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* Section 2: Proposal Type */}
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
                    onClick={() => setProposalType(type.value)}
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
                  onChange={(e) => setParameterName(e.target.value)}
                  placeholder="e.g., minimum_stake_amount"
                />
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                  <Input
                    label="Current Value"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="100"
                  />
                  <div className="hidden sm:flex items-center justify-center h-10">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    label="Proposed Value"
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
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
                  onChange={(e) => setNomineeWallet(e.target.value)}
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
          </div>

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* Section 3: Voting Parameters */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="w-10 h-10 bg-green-600/10 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
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
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 100 VETD — staked tokens are returned after voting
                  concludes
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Voting Duration
                </label>
                <Select
                  value={votingDuration}
                  onValueChange={setVotingDuration}
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

          {/* Submit Section */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-primary/5 to-accent/5 border-t border-border/40">
            {!address && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5">
                <Wallet className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Wallet not connected
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your wallet to create a governance proposal.
                  </p>
                </div>
              </div>
            )}

            {/* Transaction step indicator */}
            {isSubmitting && (
              <div className="mb-5 rounded-xl border border-border/40 bg-card/60 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Transaction Progress
                </p>
                <div className="space-y-2.5">
                  {guildId && (
                    <>
                      <StepIndicator
                        label="Approve VETD token transfer"
                        status={
                          submitStep === "approving"
                            ? "active"
                            : submitStep === "staking" ||
                                submitStep === "confirming" ||
                                submitStep === "creating"
                              ? "done"
                              : "pending"
                        }
                      />
                      <StepIndicator
                        label="Stake VETD on-chain"
                        status={
                          submitStep === "staking"
                            ? "active"
                            : submitStep === "confirming" ||
                                submitStep === "creating"
                              ? "done"
                              : "pending"
                        }
                      />
                      <StepIndicator
                        label="Confirm on blockchain"
                        status={
                          submitStep === "confirming"
                            ? "active"
                            : submitStep === "creating"
                              ? "done"
                              : "pending"
                        }
                      />
                    </>
                  )}
                  <StepIndicator
                    label="Create governance proposal"
                    status={submitStep === "creating" ? "active" : "pending"}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !address}
                className="sm:flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {buttonLabel}
                  </>
                ) : (
                  buttonLabel
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Transaction Status Modal */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={handleTxModalClose}
        status={txModalStatus}
        txHash={txHash || undefined}
        actionType="stake"
        amount={stakeAmount}
        errorMessage={txErrorMessage}
      />
    </>
  );
}

function StepIndicator({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-2.5">
      {status === "done" ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : status === "active" ? (
        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      )}
      <span
        className={`text-sm ${
          status === "done"
            ? "text-green-600 dark:text-green-400"
            : status === "active"
              ? "text-foreground font-medium"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
