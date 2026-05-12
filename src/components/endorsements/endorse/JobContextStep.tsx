"use client";

import { Briefcase, MapPin, DollarSign, CheckCircle, Building2 } from "lucide-react";
import { formatSalaryRange } from "@/lib/utils";
import type { EndorsementApplication } from "@/types";

export interface JobContextStepProps {
  application: EndorsementApplication;
}

export function JobContextStep({ application }: JobContextStepProps) {
  const skills = application.job_skills
    ? Array.isArray(application.job_skills)
      ? application.job_skills
      : application.job_skills.split(",").map((s) => s.trim())
    : [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-1.5">
          Step 1 · Job context
        </p>
        <h3 className="text-2xl font-display font-bold text-foreground leading-tight">
          {application.job_title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          {application.company_name}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {application.location && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 border border-border rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3 h-3" />
            {application.location}
          </span>
        )}
        {application.job_type && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 border border-border rounded-lg px-2.5 py-1.5">
            <Briefcase className="w-3 h-3" />
            {application.job_type}
          </span>
        )}
        {(application.salary_min || application.salary_max) && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 border border-border rounded-lg px-2.5 py-1.5">
            <DollarSign className="w-3 h-3" />
            {formatSalaryRange({
              min: application.salary_min,
              max: application.salary_max,
              currency: application.salary_currency,
            })}
          </span>
        )}
      </div>

      {application.job_description && (
        <div className="rounded-xl bg-muted/20 border border-border p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Description
          </h4>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {application.job_description}
          </p>
        </div>
      )}

      {application.requirements && application.requirements.length > 0 && (
        <div className="rounded-xl bg-muted/20 border border-border p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Requirements
          </h4>
          <ul className="space-y-2">
            {application.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-2.5 h-2.5 text-primary" />
                </span>
                <span className="text-sm text-foreground">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skills.length > 0 && (
        <div className="rounded-xl bg-muted/20 border border-border p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Required skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-muted/30 border border-border text-foreground capitalize"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
