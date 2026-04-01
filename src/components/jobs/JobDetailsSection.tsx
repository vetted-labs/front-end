"use client";

import { MapPin, DollarSign, Shield } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";
import type { Guild } from "@/types";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface JobDetailsSectionProps {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  guilds: Guild[];
  onFieldChange: (
    field: keyof JobFormData,
    value: string | number | undefined
  ) => void;
}

export function JobDetailsSection({
  formData,
  fieldErrors,
  guilds,
  onFieldChange,
}: JobDetailsSectionProps) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-positive/10 rounded-lg flex items-center justify-center">
          <MapPin className="w-5 h-5 text-positive" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Location & Compensation
          </h3>
          <p className="text-sm text-muted-foreground">Where and how much</p>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Location *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
          <Input
            type="text"
            value={formData.location}
            onChange={(e) => onFieldChange("location", e.target.value)}
            className="pl-10"
            placeholder="e.g., Remote or San Francisco"
            error={fieldErrors.location}
          />
        </div>
      </div>

      {/* Location Type & Job Type */}
      <div className="grid grid-cols-2 gap-4">
        <NativeSelect
          label="Location Type"
          value={formData.locationType}
          onChange={(e) =>
            onFieldChange(
              "locationType",
              e.target.value as "remote" | "onsite" | "hybrid"
            )
          }
        >
          <option value="remote">Remote</option>
          <option value="onsite">Onsite</option>
          <option value="hybrid">Hybrid</option>
        </NativeSelect>
        <NativeSelect
          label="Job Type"
          value={formData.jobType}
          onChange={(e) =>
            onFieldChange(
              "jobType",
              e.target.value as
                | "Full-time"
                | "Part-time"
                | "Contract"
                | "Freelance"
            )
          }
        >
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Freelance">Freelance</option>
        </NativeSelect>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Salary Min
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
            <Input
              type="number"
              value={formData.salaryMin || ""}
              onChange={(e) =>
                onFieldChange(
                  "salaryMin",
                  parseInt(e.target.value) || undefined
                )
              }
              className="pl-10"
              placeholder="e.g., 100000"
              error={fieldErrors.salaryMin}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Salary Max
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
            <Input
              type="number"
              value={formData.salaryMax || ""}
              onChange={(e) =>
                onFieldChange(
                  "salaryMax",
                  parseInt(e.target.value) || undefined
                )
              }
              className="pl-10"
              placeholder="e.g., 150000"
            />
          </div>
        </div>
      </div>

      {/* Experience Level & Guild */}
      <div className="grid grid-cols-2 gap-4">
        <NativeSelect
          label="Experience Level"
          value={formData.experienceLevel || ""}
          onChange={(e) =>
            onFieldChange(
              "experienceLevel",
              e.target.value || undefined
            )
          }
        >
          <option value="">Select level</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid-level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="executive">Executive</option>
        </NativeSelect>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Guild *
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
            <NativeSelect
              value={formData.guild}
              onChange={(e) => onFieldChange("guild", e.target.value)}
              className="pl-10"
              error={fieldErrors.guild}
            >
              <option value="">Select a guild</option>
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.name}>
                  {guild.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>
    </div>
  );
}
