"use client";

import { MapPin, DollarSign, Shield } from "lucide-react";
import { JobFormData } from "@/hooks/useJobForm";
import type { Guild } from "@/types";

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
    <div className="p-8 space-y-6 bg-muted/30">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
          <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
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
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onFieldChange("location", e.target.value)}
            className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground ${
              fieldErrors.location ? "border-red-500" : "border-border"
            }`}
            placeholder="e.g., Remote or San Francisco"
          />
        </div>
        {fieldErrors.location && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.location}</p>
        )}
      </div>

      {/* Location Type & Job Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Location Type
          </label>
          <select
            value={formData.locationType}
            onChange={(e) =>
              onFieldChange(
                "locationType",
                e.target.value as "remote" | "onsite" | "hybrid"
              )
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
          >
            <option value="remote">Remote</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Job Type
          </label>
          <select
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
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Salary Min
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="number"
              value={formData.salaryMin || ""}
              onChange={(e) =>
                onFieldChange(
                  "salaryMin",
                  parseInt(e.target.value) || undefined
                )
              }
              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground ${
                fieldErrors.salaryMin ? "border-red-500" : "border-border"
              }`}
              placeholder="e.g., 100000"
            />
          </div>
          {fieldErrors.salaryMin && (
            <p className="text-red-500 text-sm mt-1">
              {fieldErrors.salaryMin}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Salary Max
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="number"
              value={formData.salaryMax || ""}
              onChange={(e) =>
                onFieldChange(
                  "salaryMax",
                  parseInt(e.target.value) || undefined
                )
              }
              className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
              placeholder="e.g., 150000"
            />
          </div>
        </div>
      </div>

      {/* Experience Level & Guild */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Experience Level
          </label>
          <select
            value={formData.experienceLevel || ""}
            onChange={(e) =>
              onFieldChange(
                "experienceLevel",
                e.target.value || undefined
              )
            }
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
          >
            <option value="">Select level</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="executive">Executive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Guild *
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <select
              value={formData.guild}
              onChange={(e) => onFieldChange("guild", e.target.value)}
              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground ${
                fieldErrors.guild ? "border-red-500" : "border-border"
              }`}
            >
              <option value="">Select a guild</option>
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.name}>
                  {guild.name}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.guild && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.guild}</p>
          )}
        </div>
      </div>
    </div>
  );
}
