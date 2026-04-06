import {
  Info,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type { Job } from "@/types";
import { renderMarkdown } from "@/lib/renderMarkdown";

interface JobRequirementsProps {
  job: Job;
}

export default function JobRequirements({ job }: JobRequirementsProps) {
  return (
    <div className="space-y-0">
      {/* Job Description */}
      {job.description && (
        <div className="pt-8">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground mb-5">
            Job Description
          </h2>

          <div className="mb-7">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground mb-3">
              <Info className="w-4 h-4 text-primary" />
              About the Role
            </div>
            <div className="leading-relaxed">
              {renderMarkdown(job.description)}
            </div>
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Requirements
          </div>
          <ul className="flex flex-col gap-3">
            {job.requirements.map((req, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary/60"
              >
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="pt-8 border-t border-border">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground mb-5">
            Required Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground bg-muted/20 border border-border transition-all hover:border-primary/20 hover:text-primary hover:bg-primary/[0.08] cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Screening Questions */}
      {job.screeningQuestions && job.screeningQuestions.length > 0 && (
        <div className="pt-8 border-t border-border">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground mb-5 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Screening Questions
          </h2>
          <div className="flex flex-col gap-3">
            {job.screeningQuestions.map((question, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-muted/10 border border-border"
              >
                <div className="text-xs font-bold uppercase tracking-[1.2px] text-primary mb-2">
                  Question {index + 1}
                </div>
                <div className="text-sm font-medium text-foreground leading-relaxed">
                  {question}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
