"use client";

import { Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CompanyApplication } from "@/types";

interface CandidateJobGroupProps {
  job: CompanyApplication["job"];
  applications: CompanyApplication[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  isEndorsed: (app: CompanyApplication) => boolean;
}

export function CandidateJobGroup({
  job,
  applications,
  selectedApplicationId,
  onSelectApplication,
  isEndorsed,
}: CandidateJobGroupProps) {
  return (
    <div>
      {/* Job Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 dark:bg-white/[0.02] border-b border-border/30 dark:border-white/[0.04]">
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground truncate">{job.title}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0">{applications.length}</span>
      </div>

      {/* Candidate Rows */}
      {applications.map((app) => {
        const config = APPLICATION_STATUS_CONFIG[app.status] || APPLICATION_STATUS_CONFIG.pending;
        const isSelected = selectedApplicationId === app.id;

        return (
          <button
            key={app.id}
            onClick={() => onSelectApplication(app)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/20 dark:border-white/[0.03]",
              isSelected
                ? "bg-primary/5 border-l-2 border-l-primary"
                : "hover:bg-muted/30 dark:hover:bg-white/[0.02] border-l-2 border-l-transparent"
            )}
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-medium text-xs">
                {app.candidate.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground truncate">{app.candidate.fullName}</p>
                {isEndorsed(app) && (
                  <Award className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.className} flex-shrink-0`}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
