"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Copy, Check, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { commitRevealApi } from "@/lib/api";

interface CommitmentFormProps {
  applicationId: string;
  expertId: string;
  requiredStake: number;
  onSubmit: () => void;
  onCancel: () => void;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CommitmentForm({
  applicationId,
  expertId,
  requiredStake,
  onSubmit,
  onCancel,
}: CommitmentFormProps) {
  const [score, setScore] = useState(50);
  const [nonce] = useState(generateNonce);
  const [stakeAmount, setStakeAmount] = useState(requiredStake.toString());
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localStorageKey = `commitReveal:${applicationId}:${expertId}`;

  const handleCopyNonce = async () => {
    await navigator.clipboard.writeText(nonce);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Nonce copied to clipboard");
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Generate hash via backend
      const hashResponse: any = await commitRevealApi.generateHash(score, nonce);

      // Submit commitment
      await commitRevealApi.submitCommitment(applicationId, {
        expertId,
        commitmentHash: hashResponse.hash,
        stakeAmount: parseFloat(stakeAmount),
      });

      // Save score and nonce to localStorage for reveal phase
      localStorage.setItem(localStorageKey, JSON.stringify({ score, nonce }));
      toast.success("Commitment submitted! Save your nonce for the reveal phase.");
      onSubmit();
    } catch (error: any) {
      console.error("Commitment error:", error);
      toast.error(error.message || "Failed to submit commitment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit Commitment</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your score is hidden until the reveal phase.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Your Score</label>
            <Badge variant="secondary" className="text-base px-3">
              {score}/100
            </Badge>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Reject (0)</span>
            <span>Neutral (50)</span>
            <span>Approve (100)</span>
          </div>
        </div>

        {/* Nonce */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Your Secret Nonce</label>
            <Button variant="ghost" size="sm" onClick={handleCopyNonce}>
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Input value={nonce} readOnly className="font-mono text-sm" />
        </div>

        {/* Save Warning */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              Save your nonce!
            </p>
            <p className="text-muted-foreground">
              You will need this nonce to reveal your vote. It is saved locally, but
              copy it somewhere safe as a backup. If you lose it, your vote cannot be revealed.
            </p>
          </div>
        </div>

        {/* Stake */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Stake Amount (VETD)</label>
          <Input
            type="number"
            min={requiredStake}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Minimum: {requiredStake} VETD
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Generate Hash & Submit"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
