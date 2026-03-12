"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { expertApi, extractApiError } from "@/lib/api";

interface ExpertRevealFormProps {
  applicationId: string;
  reviewerId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

interface SavedReviewData {
  normalizedScore: number;
  nonce: string;
  salt?: string;
  onChainScore?: number;
  feedback?: string;
  criteriaScores?: Record<string, unknown>;
  criteriaJustifications?: Record<string, unknown>;
  overallScore?: number;
  redFlagDeductions?: number;
}

export function ExpertRevealForm({
  applicationId,
  reviewerId,
  onSubmit,
  onCancel,
}: ExpertRevealFormProps) {
  const [score, setScore] = useState("");
  const [nonce, setNonce] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedData, setSavedData] = useState<SavedReviewData | null>(null);

  const localStorageKey = `expertCR:${applicationId}:${reviewerId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed: SavedReviewData = JSON.parse(saved);
        if (parsed.normalizedScore !== undefined && parsed.nonce) {
          setSavedData(parsed);
          setScore(parsed.normalizedScore.toString());
          setNonce(parsed.nonce);
        }
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

      await expertApi.expertCommitReveal.revealVote(applicationId, {
        normalizedScore: parseInt(score),
        nonce,
        feedback: savedData?.feedback,
        criteriaScores: savedData?.criteriaScores,
        criteriaJustifications: savedData?.criteriaJustifications,
        overallScore: savedData?.overallScore,
        redFlagDeductions: savedData?.redFlagDeductions,
      });

      localStorage.removeItem(localStorageKey);
      toast.success("Review revealed successfully!");
      onSubmit();
    } catch (error: unknown) {
      const msg = extractApiError(error, "Failed to reveal review");
      if (msg.toLowerCase().includes("hash")) {
        toast.error("Hash mismatch. Make sure your score and nonce match your commitment.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {savedData && (
        <div className="flex items-start gap-2 rounded-xl bg-green-500/5 border border-green-500/20 p-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Auto-filled from saved data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your review data was restored from local storage.
              {savedData.overallScore !== undefined && (
                <> Raw score: {savedData.overallScore} | Normalized: {savedData.normalizedScore}/100</>
              )}
            </p>
          </div>
        </div>
      )}

      {!savedData && (
        <EmptyState
          icon={AlertCircle}
          title="No saved data found"
          description="Enter your normalized score (0-100) and nonce manually. Note: criteria details won't be recorded without saved data."
          className="py-3"
        />
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Normalized Score</label>
          <Badge variant="secondary">{score || "?"}/100</Badge>
        </div>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter the normalized score you committed"
          readOnly={!!savedData}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Secret Nonce</label>
        <Input
          value={nonce}
          onChange={(e) => setNonce(e.target.value)}
          placeholder="Enter your nonce"
          className="font-mono text-sm"
          readOnly={!!savedData}
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
            "Reveal Review"
          )}
        </Button>
      </div>
    </div>
  );
}
