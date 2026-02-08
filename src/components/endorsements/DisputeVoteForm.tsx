"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface DisputeVoteFormProps {
  onSubmit: (decision: "uphold" | "dismiss", reasoning: string) => Promise<void>;
  disabled?: boolean;
}

export function DisputeVoteForm({ onSubmit, disabled = false }: DisputeVoteFormProps) {
  const [decision, setDecision] = useState<"uphold" | "dismiss" | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision || !reasoning.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(decision, reasoning);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Arbitration Vote</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the evidence and cast your vote on this dispute.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={decision === "uphold" ? "default" : "outline"}
            className={decision === "uphold" ? "bg-red-600 hover:bg-red-700" : "hover:border-red-500 hover:text-red-500"}
            onClick={() => setDecision("uphold")}
            disabled={disabled || isSubmitting}
            size="lg"
          >
            Uphold Dispute
          </Button>
          <Button
            variant={decision === "dismiss" ? "default" : "outline"}
            className={decision === "dismiss" ? "bg-green-600 hover:bg-green-700" : "hover:border-green-500 hover:text-green-500"}
            onClick={() => setDecision("dismiss")}
            disabled={disabled || isSubmitting}
            size="lg"
          >
            Dismiss Dispute
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Reasoning <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Explain your reasoning for this decision..."
            rows={4}
            disabled={disabled || isSubmitting}
          />
          <p className="text-xs text-muted-foreground">Required. Your reasoning will be recorded on-chain.</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!decision || !reasoning.trim() || disabled || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Arbitration Vote"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
