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
    <div className="space-y-10">
      {/* Job context */}
      <section className="rounded-xl border border-primary/15 bg-primary/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/15 flex-shrink-0">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-0.5">
              Applying for
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {jobTitle}
            </p>
          </div>
        </div>
      </section>

      {/* Cover letter */}
      <section>
        <SectionHeader
          title={
            <>
              Cover letter <span className="text-destructive">*</span>
            </>
          }
          description="A short note to the hiring team about why this role and what you'd bring. Minimum 50 characters."
        />
        <Textarea
          value={coverLetter}
          onChange={(e) => onCoverLetterChange(e.target.value)}
          rows={6}
          placeholder="Tell them why you're a great fit for this role…"
          showCounter
          minLength={50}
          maxLength={5000}
        />
      </section>

      {/* Screening questions */}
      {screeningQuestions.length > 0 && (
        <section>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                Screening questions
              </span>
            }
            description="Custom questions from the hiring team. Be specific — these answers go directly to recruiters."
          />

          <div className="space-y-8">
            {screeningQuestions.map((question, index) => (
              <div key={index} className="space-y-3">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
                    Question {String(index + 1).padStart(2, "0")}{" "}
                    <span className="text-destructive">·  required</span>
                  </p>
                  <p className="text-[15px] font-semibold text-foreground leading-snug">
                    {question}
                  </p>
                </div>
                <Textarea
                  value={screeningAnswers[index] || ""}
                  onChange={(e) =>
                    onScreeningAnswerChange(index, e.target.value)
                  }
                  rows={4}
                  placeholder="Your answer…"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-display text-lg font-bold text-foreground tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  );
}
