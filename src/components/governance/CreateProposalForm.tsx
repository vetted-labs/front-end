"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useRequireWallet } from "@/lib/hooks/useRequireWallet";
import { governanceApi, extractApiError } from "@/lib/api";
import { toast } from "sonner";
import { isUserRejection, getTransactionErrorMessage } from "@/lib/blockchain";
import { useGuilds } from "@/lib/hooks/useGuilds";
import {
  useAppealStaking,
  useTransactionConfirmation,
} from "@/lib/hooks/useVettedContracts";
import { usePermitOrApprove } from "@/lib/hooks/usePermitOrApprove";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { TransactionModal } from "@/components/dashboard/TransactionModal";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { ProposalDetailsSection } from "./ProposalDetailsSection";
import { ProposalTypeSection, GUILD_REQUIRED_TYPES } from "./ProposalTypeSection";
import { VotingParametersSection } from "./VotingParametersSection";
import { ProposalSubmitSection } from "./ProposalSubmitSection";
import type { ProposalSubmitStep } from "@/types";

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
  const [submitStep, setSubmitStep] = useState<ProposalSubmitStep>("idle");

  // On-chain transaction tracking
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txModalStatus, setTxModalStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [txErrorMessage, setTxErrorMessage] = useState("");

  const needsGuild = GUILD_REQUIRED_TYPES.includes(proposalType);
  const { stakeForAppealWithPermit } = useAppealStaking(
    guildId || undefined
  );
  const { executeWithPermit } = usePermitOrApprove();
  const {
    isSuccess: txConfirmed,
    isError: txError,
    error: txErrorDetails,
  } = useTransactionConfirmation(txHash || undefined);

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

  // eslint-disable-next-line no-restricted-syntax -- reacts to blockchain tx confirmation status
  useEffect(() => {
    if (txConfirmed && txHash && submitStep === "confirming") {
      const createBackendProposal = async () => {
        try {
          setSubmitStep("creating");
          await governanceApi.createProposal(buildProposalData(), address!);
          setTxModalStatus("success");
        } catch (error: unknown) {
          const message = extractApiError(error, "Failed to create proposal");
          toast.error(message);
          setTxModalStatus("error");
          setTxErrorMessage(message);
        }
      };
      createBackendProposal();
    }
  }, [txConfirmed, txHash, submitStep, buildProposalData, address]);

  // eslint-disable-next-line no-restricted-syntax -- reacts to blockchain tx error status
  useEffect(() => {
    if (txError && txHash && submitStep === "confirming") {
      const errorMessage = getTransactionErrorMessage(txErrorDetails, "Transaction failed on blockchain");
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
        setSubmitStep("approving");

        const result = await executeWithPermit(
          CONTRACT_ADDRESSES.STAKING,
          stakeAmount,
          (permit) => stakeForAppealWithPermit(
            stakeAmount,
            permit.deadline,
            permit.v,
            permit.r,
            permit.s,
          ),
        );

        setTxHash(result.hash);
        setSubmitStep("confirming");
        setShowTxModal(true);
        setTxModalStatus("pending");
      } else {
        setSubmitStep("creating");
        setShowTxModal(true);
        setTxModalStatus("pending");

        await governanceApi.createProposal(buildProposalData(), address);

        setTxModalStatus("success");
      }
    } catch (error: unknown) {
      if (isUserRejection(error)) {
        toast.error("Transaction rejected");
        setShowTxModal(false);
      } else if (submitStep === "approving") {
        toast.error("Token approval failed");
        setShowTxModal(false);
      } else if (submitStep === "staking") {
        toast.error("On-chain staking failed. No proposal was created.");
        setShowTxModal(false);
      } else {
        const message = extractApiError(error, "Failed to create proposal");
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
          <ProposalDetailsSection
            title={title}
            description={description}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
          />

          <div className="border-t border-border/40" />

          <ProposalTypeSection
            proposalType={proposalType}
            onProposalTypeChange={setProposalType}
            parameterName={parameterName}
            onParameterNameChange={setParameterName}
            currentValue={currentValue}
            onCurrentValueChange={setCurrentValue}
            proposedValue={proposedValue}
            onProposedValueChange={setProposedValue}
            nomineeWallet={nomineeWallet}
            onNomineeWalletChange={setNomineeWallet}
            guildId={guildId}
            onGuildIdChange={setGuildId}
            guilds={guildRecords}
          />

          <div className="border-t border-border/40" />

          <VotingParametersSection
            stakeAmount={stakeAmount}
            onStakeAmountChange={setStakeAmount}
            votingDuration={votingDuration}
            onVotingDurationChange={setVotingDuration}
          />

          <ProposalSubmitSection
            address={address}
            submitStep={submitStep}
            buttonLabel={buttonLabel}
            hasGuild={!!guildId}
            onCancel={() => router.back()}
          />
        </form>
      </div>

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
