"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface GovernanceVoteFormProps {
  votingPower: number;
  onSubmit: (vote: "for" | "against" | "abstain", reason: string) => Promise<void>;
  disabled?: boolean;
}

export function GovernanceVoteForm({
  votingPower,
  onSubmit,
  disabled = false,
}: GovernanceVoteFormProps) {
  const [selectedVote, setSelectedVote] = useState<"for" | "against" | "abstain" | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedVote) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedVote, reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cast Your Vote</CardTitle>
        <p className="text-sm text-muted-foreground">
          Voting power: <span className="font-semibold">{votingPower.toLocaleString()}</span> VETD
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={selectedVote === "for" ? "default" : "outline"}
            className={selectedVote === "for" ? "bg-green-600 hover:bg-green-700" : "hover:border-green-500 hover:text-green-500"}
            onClick={() => setSelectedVote("for")}
            disabled={disabled || isSubmitting}
            size="lg"
          >
            For
          </Button>
          <Button
            variant={selectedVote === "against" ? "default" : "outline"}
            className={selectedVote === "against" ? "bg-red-600 hover:bg-red-700" : "hover:border-red-500 hover:text-red-500"}
            onClick={() => setSelectedVote("against")}
            disabled={disabled || isSubmitting}
            size="lg"
          >
            Against
          </Button>
          <Button
            variant={selectedVote === "abstain" ? "default" : "outline"}
            className={selectedVote === "abstain" ? "bg-gray-600 hover:bg-gray-700" : ""}
            onClick={() => setSelectedVote("abstain")}
            disabled={disabled || isSubmitting}
            size="lg"
          >
            Abstain
          </Button>
        </div>

        <Textarea
          placeholder="Reason for your vote (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          disabled={disabled || isSubmitting}
        />

        <Button
          onClick={handleSubmit}
          disabled={!selectedVote || disabled || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Vote"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
