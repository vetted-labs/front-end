"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { commitRevealApi } from "@/lib/api";
import { logger } from "@/lib/logger";

interface RevealFormProps {
  applicationId: string;
  expertId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RevealForm({
  applicationId,
  expertId,
  onSubmit,
  onCancel,
}: RevealFormProps) {
  const [score, setScore] = useState("");
  const [nonce, setNonce] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localStorageFound, setLocalStorageFound] = useState(false);

  const localStorageKey = `commitReveal:${applicationId}:${expertId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const { score: savedScore, nonce: savedNonce } = JSON.parse(saved);
        setScore(savedScore.toString());
        setNonce(savedNonce);
        setLocalStorageFound(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, [localStorageKey]);

  const handleSubmit = async () => {
    if (!score || !nonce) {
      toast.error("Score and nonce are required to reveal");
      return;
    }

    try {
      setIsSubmitting(true);

      await commitRevealApi.revealVote(applicationId, {
        expertId,
        score: parseInt(score),
        nonce,
        comment,
      });

      localStorage.removeItem(localStorageKey);
      toast.success("Vote revealed successfully!");
      onSubmit();
    } catch (error: unknown) {
      logger.error("Reveal error", error, { silent: true });
      const msg = error instanceof Error ? error.message : "";
      const dataMsg = (error as { data?: { message?: string } })?.data?.message ?? "";
      if (msg.includes("hash") || dataMsg.includes("hash")) {
        toast.error("Hash mismatch. Make sure your score and nonce match your commitment.");
      } else {
        toast.error(msg || "Failed to reveal vote");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {localStorageFound && (
        <div className="flex items-start gap-2 rounded-xl bg-green-500/5 border border-green-500/20 p-3">
          <Badge variant="default" className="bg-green-600">Auto-filled</Badge>
          <p className="text-sm text-muted-foreground">
            Your score and nonce were restored from local storage.
          </p>
        </div>
      )}

      {!localStorageFound && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Could not find saved commitment data. Please enter your score and
            nonce manually.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Score</label>
          <Badge variant="secondary">{score || "?"}/100</Badge>
        </div>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter the score you committed"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Secret Nonce</label>
        <Input
          value={nonce}
          onChange={(e) => setNonce(e.target.value)}
          placeholder="Enter your nonce"
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Comment (optional)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment to your vote"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !score || !nonce}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Revealing...
            </>
          ) : (
            "Reveal Vote"
          )}
        </Button>
      </div>
    </div>
  );
}
