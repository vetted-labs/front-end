"use client";

import { FileText, Shield } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";

interface Guild {
  id: string;
  name: string;
  description: string;
}

interface JobRequirementsProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  guilds: Guild[];
  onFieldChange: (field: keyof JobFormData, value: string | string[]) => void;
}

export function JobRequirements({
  formData,
  fieldErrors,
  guilds,
  onFieldChange,
}: JobRequirementsProps) {
  return (
    <>
      {/* Guild & Publishing Section */}
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Guild & Publishing
            </h3>
            <p className="text-sm text-muted-foreground">
              Assign to guild and set visibility
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              onFieldChange(
                "status",
                e.target.value as "draft" | "active" | "paused" | "closed"
              )
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Requirements Section */}
      <div className="p-8 space-y-6 bg-muted/30">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Requirements & Qualifications
            </h3>
            <p className="text-sm text-muted-foreground">
              What candidates need
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Requirements (one per line)
          </label>
          <textarea
            value={formData.requirements?.join("\n") || ""}
            onChange={(e) =>
              onFieldChange(
                "requirements",
                e.target.value.split("\n").filter(Boolean)
              )
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
            rows={4}
            placeholder="e.g., 5+ years experience"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Skills (one per line)
          </label>
          <textarea
            value={formData.skills?.join("\n") || ""}
            onChange={(e) =>
              onFieldChange("skills", e.target.value.split("\n").filter(Boolean))
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
            rows={4}
            placeholder="e.g., Solidity, React"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Screening Questions (one per line)
          </label>
          <textarea
            value={formData.screeningQuestions?.join("\n") || ""}
            onChange={(e) =>
              onFieldChange(
                "screeningQuestions",
                e.target.value.split("\n").filter(Boolean)
              )
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
            rows={4}
            placeholder="e.g., Describe your experience with DeFi"
          />
        </div>
      </div>
    </>
  );
}
