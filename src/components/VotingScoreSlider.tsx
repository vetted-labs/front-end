"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsDown,
  ThumbsUp,
  Minus,
  CheckCircle2,
} from "lucide-react";

interface VotingScoreSliderProps {
  applicationId: string;
  requiredStake: number;
  onSubmit: (score: number, stakeAmount: number, comment: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function VotingScoreSlider({
  applicationId: _applicationId,
  requiredStake,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: VotingScoreSliderProps) {
  void _applicationId;
  const [score, setScore] = useState(50);
  const [stakeAmount, setStakeAmount] = useState(requiredStake.toString());
  const [comment, setComment] = useState("");

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-red-500";
    if (score < 50) return "text-orange-500";
    if (score < 70) return "text-yellow-500";
    if (score < 85) return "text-green-500";
    return "text-emerald-500";
  };

  const getScoreLabel = (score: number) => {
    if (score < 30) return "Strong Reject";
    if (score < 50) return "Reject";
    if (score < 60) return "Neutral/Uncertain";
    if (score < 70) return "Weak Approve";
    if (score < 85) return "Approve";
    return "Strong Approve";
  };

  const getScoreIcon = (score: number) => {
    if (score < 50) return <ThumbsDown className="w-5 h-5" />;
    if (score < 60) return <Minus className="w-5 h-5" />;
    return <ThumbsUp className="w-5 h-5" />;
  };

  const getScoreBadgeVariant = (score: number): "destructive" | "secondary" | "default" => {
    if (score < 50) return "destructive";
    if (score < 60) return "secondary";
    return "default";
  };

  const handleSubmit = async () => {
    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < requiredStake) {
      toast.error(`Stake amount must be at least ${requiredStake} VETD`);
      return;
    }

    await onSubmit(score, stake, comment);
  };

  return (
    <div className="space-y-6">
      {/* Score Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Your Score (0-100)</h4>
          <Badge
            variant={getScoreBadgeVariant(score)}
            className={`text-base px-4 py-1.5 ${getScoreColor(score)}`}
          >
            <span className="mr-2">{getScoreIcon(score)}</span>
            {score}/100
          </Badge>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer
              bg-gradient-to-r from-red-500 via-yellow-500 to-green-500
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-primary
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-primary
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        {/* Score Label */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </p>
        </div>

        {/* Quick Score Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {[0, 25, 50, 75, 100].map((val) => (
            <Button
              key={val}
              type="button"
              variant={score === val ? "default" : "outline"}
              size="sm"
              onClick={() => setScore(val)}
              className="text-xs"
            >
              {val}
            </Button>
          ))}
        </div>

        {/* Scoring Guidelines — collapsible */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground mb-1">
            Scoring Guidelines
          </summary>
          <div className="space-y-1 mt-2 pl-1">
            <p><strong>0-30:</strong> Strong rejection - candidate lacks qualifications</p>
            <p><strong>30-50:</strong> Weak rejection - some concerns about fit</p>
            <p><strong>50-60:</strong> Neutral - uncertain, needs more info</p>
            <p><strong>60-85:</strong> Approve - candidate meets requirements</p>
            <p><strong>85-100:</strong> Strong approval - exceptional candidate</p>
          </div>
        </details>
      </div>

      {/* Stake Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Stake Amount (VETD)</label>
        <Input
          type="number"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          min={requiredStake}
          step="0.1"
          placeholder={`Minimum: ${requiredStake} VETD`}
        />
        <p className="text-xs text-muted-foreground">
          Minimum required: {requiredStake} VETD
        </p>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Comment (Optional)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Explain your reasoning and provide feedback for the candidate..."
        />
        <p className="text-xs text-muted-foreground">
          Help improve consensus by explaining your score
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? (
            <>Submitting Vote...</>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Score
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
