"use client";

import { Briefcase, Award, X } from "lucide-react";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Button } from "../ui/button";

interface ExpertiseLevel {
  value: string;
  label: string;
}

interface GuildOption {
  id: string;
  name: string;
}

export interface ProfessionalBackgroundSectionProps {
  selectedGuildId: string;
  guildOptions: GuildOption[];
  onGuildChange: (guildId: string) => void;
  expertiseLevel: string;
  yearsOfExperience: string;
  currentTitle: string;
  currentCompany: string;
  expertiseLevels: ExpertiseLevel[];
  expertiseAreas: string[];
  newExpertiseArea: string;
  onChange: (field: string, value: string) => void;
  onAddExpertiseArea: () => void;
  onRemoveExpertiseArea: (index: number) => void;
}

export function ProfessionalBackgroundSection({
  selectedGuildId,
  guildOptions,
  onGuildChange,
  expertiseLevel,
  yearsOfExperience,
  currentTitle,
  currentCompany,
  expertiseLevels,
  expertiseAreas,
  newExpertiseArea,
  onChange,
  onAddExpertiseArea,
  onRemoveExpertiseArea,
}: ProfessionalBackgroundSectionProps) {
  return (
    <>
      {/* Professional Background */}
      <div className="p-8 space-y-6 bg-muted/30">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Professional Background</h2>
            <p className="text-sm text-muted-foreground">Your experience and expertise</p>
          </div>
        </div>

        <NativeSelect
          label="Select Guild"
          value={selectedGuildId}
          onChange={(e) => onGuildChange(e.target.value)}
          description="Choose ONE guild that best matches your primary expertise area"
          required
        >
          <option value="" disabled>Choose a guild...</option>
          {guildOptions.map((guild) => (
            <option key={guild.id} value={guild.id}>
              {guild.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          label="Expertise Level"
          value={expertiseLevel}
          onChange={(e) => onChange("expertiseLevel", e.target.value)}
          description="Select the level that matches your years of experience"
          required
        >
          <option value="" disabled>Choose your level...</option>
          {expertiseLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </NativeSelect>

        <Input
          label="Years of Experience"
          type="number"
          value={yearsOfExperience}
          onChange={(e) => onChange("yearsOfExperience", e.target.value)}
          placeholder="10"
          min="1"
          description="Total years of professional experience in your field"
          required
        />

        <Input
          label="Current Title"
          type="text"
          value={currentTitle}
          onChange={(e) => onChange("currentTitle", e.target.value)}
          placeholder="Senior Software Engineer"
          description="Your current job title or most recent position"
          required
        />

        <Input
          label="Current Company"
          type="text"
          value={currentCompany}
          onChange={(e) => onChange("currentCompany", e.target.value)}
          placeholder="Tech Corp"
          description="Your current employer or most recent company"
          required
        />
      </div>

      {/* Areas of Expertise */}
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Areas of Expertise</h2>
            <p className="text-sm text-muted-foreground">
              Add specific skills or technologies you can evaluate (e.g., React, Machine Learning, Product Strategy)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={newExpertiseArea}
                onChange={(e) => onChange("newExpertiseArea", e.target.value)}
                placeholder="e.g., React, TypeScript, AWS"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddExpertiseArea();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={onAddExpertiseArea}
              className="whitespace-nowrap"
            >
              Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add specific skills, technologies, or domains you can evaluate (e.g., React, Machine Learning, Product Strategy). Press Enter or click Add to include each one.
          </p>
        </div>

        {expertiseAreas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {expertiseAreas.map((area, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded-full text-sm"
              >
                <span>{area}</span>
                <button
                  type="button"
                  onClick={() => onRemoveExpertiseArea(index)}
                  className="hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
