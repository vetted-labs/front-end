"use client";

import { Briefcase } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
          <h3 className="text-xl font-bold text-foreground">
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
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            className={`pl-10 ${fieldErrors.title ? "border-destructive" : ""}`}
            placeholder="e.g., Senior Solidity Developer"
            error={fieldErrors.title}
          />
        </div>
      </div>

      {/* Department */}
      <Input
        label="Department"
        type="text"
        value={formData.department || ""}
        onChange={(e) => onFieldChange("department", e.target.value)}
        placeholder="e.g., Engineering"
      />

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
        <Textarea
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          rows={6}
          placeholder="Describe the job responsibilities..."
          error={fieldErrors.description}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Supports formatting: **bold**, *italic*, and bullet lists (- item).
        </p>
      </div>
    </div>
  );
}
