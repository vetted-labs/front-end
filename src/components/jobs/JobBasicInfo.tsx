"use client";

import { Briefcase } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";

interface JobBasicInfoProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  onFieldChange: (field: keyof JobFormData, value: string) => void;
}

export function JobBasicInfo({
  formData,
  fieldErrors,
  onFieldChange,
}: JobBasicInfoProps) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Basic Information
          </h3>
          <p className="text-sm text-muted-foreground">
            Core details about the position
          </p>
        </div>
      </div>

      {/* Job Title */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-foreground">
            Job Title *
          </label>
          <span
            className={`text-xs ${formData.title.trim().length < 3 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {formData.title.trim().length}/3 min
          </span>
        </div>
        <div className="relative">
          <Briefcase className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground ${
              fieldErrors.title ? "border-red-500" : "border-border"
            }`}
            placeholder="e.g., Senior Solidity Developer"
          />
        </div>
        {fieldErrors.title && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.title}</p>
        )}
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Department
        </label>
        <input
          type="text"
          value={formData.department || ""}
          onChange={(e) => onFieldChange("department", e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
          placeholder="e.g., Engineering"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-foreground">
            Description *
          </label>
          <span
            className={`text-xs ${formData.description.length < 50 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {formData.description.length}/50 min
          </span>
        </div>
        <textarea
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground ${
            fieldErrors.description ? "border-red-500" : "border-border"
          }`}
          rows={6}
          placeholder="Describe the job responsibilities..."
        />
        {fieldErrors.description && (
          <p className="text-red-500 text-sm mt-1">
            {fieldErrors.description}
          </p>
        )}
      </div>
    </div>
  );
}
