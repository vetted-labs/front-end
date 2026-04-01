"use client";

import { FileText, Shield } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";
import type { Guild } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

interface JobRequirementsProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  guilds: Guild[];
  onFieldChange: (field: keyof JobFormData, value: string | string[]) => void;
  isEditing?: boolean;
}

export function JobRequirements({
  formData,
  fieldErrors,
  guilds,
  onFieldChange,
  isEditing,
}: JobRequirementsProps) {
  return (
    <>
      {/* Guild & Publishing Section */}
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-info-blue/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-info-blue" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Guild & Publishing
            </h3>
            <p className="text-sm text-muted-foreground">
              Assign to guild and set visibility
            </p>
          </div>
        </div>

        {/* Only show status dropdown when editing — new jobs use Draft/Publish buttons */}
        {isEditing && (
          <NativeSelect
            label="Status"
            value={formData.status}
            onChange={(e) =>
              onFieldChange(
                "status",
                e.target.value as "draft" | "active" | "paused" | "closed"
              )
            }
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </NativeSelect>
        )}
      </div>

      {/* Requirements Section */}
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-info-blue/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-info-blue" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Requirements & Qualifications
            </h3>
            <p className="text-sm text-muted-foreground">
              What candidates need
            </p>
          </div>
        </div>

        <Textarea
          label="Requirements (one per line)"
          value={formData.requirements?.join("\n") || ""}
          onChange={(e) =>
            onFieldChange(
              "requirements",
              e.target.value.split("\n").filter(Boolean)
            )
          }
          rows={4}
          placeholder="e.g., 5+ years experience"
          error={fieldErrors.requirements}
        />

        <Textarea
          label="Skills (one per line)"
          value={formData.skills?.join("\n") || ""}
          onChange={(e) =>
            onFieldChange("skills", e.target.value.split("\n").filter(Boolean))
          }
          rows={4}
          placeholder="e.g., Solidity, React"
          error={fieldErrors.skills}
        />

        <Textarea
          label="Screening Questions (one per line)"
          value={formData.screeningQuestions?.join("\n") || ""}
          onChange={(e) =>
            onFieldChange(
              "screeningQuestions",
              e.target.value.split("\n").filter(Boolean)
            )
          }
          rows={4}
          placeholder="e.g., Describe your experience with DeFi"
          error={fieldErrors.screeningQuestions}
        />
      </div>
    </>
  );
}
