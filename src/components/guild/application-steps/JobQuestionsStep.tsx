"use client";

import { Briefcase, HelpCircle } from "lucide-react";
import { Textarea } from "@/components/ui";

interface JobQuestionsStepProps {
  jobTitle: string;
  coverLetter: string;
  onCoverLetterChange: (value: string) => void;
  screeningQuestions: string[];
  screeningAnswers: string[];
  onScreeningAnswerChange: (index: number, value: string) => void;
}

export default function JobQuestionsStep({
  jobTitle,
  coverLetter,
  onCoverLetterChange,
  screeningQuestions,
  screeningAnswers,
  onScreeningAnswerChange,
}: JobQuestionsStepProps) {
  return (
    <div className="space-y-8">
      {/* Job context header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border border-border/60 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Applying for
            </p>
            <p className="font-semibold text-foreground">{jobTitle}</p>
          </div>
        </div>
      </div>

      {/* Cover Letter */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Cover Letter <span className="text-destructive">*</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tell the hiring team why you&apos;re a great fit for this role. Minimum
          50 characters.
        </p>
        <Textarea
          value={coverLetter}
          onChange={(e) => onCoverLetterChange(e.target.value)}
          rows={6}
          placeholder="Tell us why you're a great fit for this role..."
          showCounter
          minLength={50}
          maxLength={5000}
        />
      </div>

      {/* Screening Questions */}
      {screeningQuestions.length > 0 && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Screening Questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Answer these questions from the hiring team.
            </p>
          </div>

          {screeningQuestions.map((question, index) => (
            <div
              key={index}
              className="space-y-2 pt-4 first:pt-0 border-t first:border-t-0 border-border"
            >
              <Textarea
                label={`${index + 1}. ${question}`}
                required
                value={screeningAnswers[index] || ""}
                onChange={(e) =>
                  onScreeningAnswerChange(index, e.target.value)
                }
                rows={3}
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
