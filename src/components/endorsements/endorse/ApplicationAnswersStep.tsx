"use client";

import { Mail, HelpCircle, FileText } from "lucide-react";
import type { EndorsementApplication } from "@/types";

export interface ApplicationAnswersStepProps {
  application: EndorsementApplication;
}

export function ApplicationAnswersStep({ application }: ApplicationAnswersStepProps) {
  const screeningEntries = application.screening_answers
    ? Object.entries(application.screening_answers).filter(([, answer]) => !!answer)
    : [];

  const hasContent = !!application.cover_letter || screeningEntries.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-1.5">
          Step 3 · Application
        </p>
        <h3 className="text-xl font-display font-bold text-foreground leading-tight">
          How they answered
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cover letter and screening-question responses submitted with this application.
        </p>
      </div>

      {application.cover_letter && (
        <div className="rounded-xl bg-muted/20 border border-border p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Mail className="w-3 h-3" />
            Cover letter
          </h4>
          <div className="pl-3 border-l-2 border-primary/30">
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              {application.cover_letter}
            </p>
          </div>
        </div>
      )}

      {screeningEntries.length > 0 && (
        <div className="rounded-xl bg-muted/20 border border-border p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3" />
            Screening questions ({screeningEntries.length})
          </h4>
          <div className="space-y-3">
            {screeningEntries.map(([question, answer], idx) => (
              <div key={idx} className="rounded-lg bg-card border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  {question}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasContent && (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No additional application materials provided.
          </p>
        </div>
      )}
    </div>
  );
}
