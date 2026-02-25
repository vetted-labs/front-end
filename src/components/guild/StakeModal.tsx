"use client";

import { Loader2, Lock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { GuildApplicationSummary } from "@/types";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: GuildApplicationSummary | null;
  stakeAmount: string;
  onStakeAmountChange: (amount: string) => void;
  onConfirmStake: () => void;
  isStaking: boolean;
}

export function StakeModal({
  isOpen,
  onClose,
  application,
  stakeAmount,
  onStakeAmountChange,
  onConfirmStake,
  isStaking,
}: StakeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stake on Application">
      {application && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Candidate</p>
            <p className="font-semibold text-foreground">{application.candidateName}</p>
          </div>

          <Input
            label="Stake Amount (tokens)"
            type="number"
            value={stakeAmount}
            onChange={(e) => onStakeAmountChange(e.target.value)}
            min={application.requiredStake}
            required
          />

          <Alert variant="info">
            By staking, you&apos;ll be able to participate in reviewing this
            application. Your stake will be returned after the review, with rewards
            if you vote with the majority.
          </Alert>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirmStake}
              disabled={isStaking}
              className="flex-1"
            >
              {isStaking ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  Staking...
                </>
              ) : (
                <>
                  <Lock className="mr-2 w-4 h-4" />
                  Confirm Stake
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
