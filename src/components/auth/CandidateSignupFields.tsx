"use client";
import { Linkedin, Github, Globe } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";

const inputClass =
  "w-full pl-10 pr-4 py-2.5 text-sm bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none";

interface Props {
  fullName: string;
  onFullNameChange: (v: string) => void;
  headline: string;
  onHeadlineChange: (v: string) => void;
  linkedinUrl: string;
  onLinkedinUrlChange: (v: string) => void;
  githubUrl: string;
  onGithubUrlChange: (v: string) => void;
  portfolioUrl: string;
  onPortfolioUrlChange: (v: string) => void;
  errors: Record<string, string>;
}

export function CandidateSignupFields({
  fullName,
  onFullNameChange,
  headline,
  onHeadlineChange,
  linkedinUrl,
  onLinkedinUrlChange,
  githubUrl,
  onGithubUrlChange,
  portfolioUrl,
  onPortfolioUrlChange,
  errors,
}: Props) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Full Name <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <VettedIcon name="profile" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            className={inputClass}
            placeholder="John Doe"
          />
        </div>
        {errors.fullName && (
          <p className="text-destructive text-xs mt-1">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Current Occupation <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <VettedIcon name="job" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            className={inputClass}
            placeholder="Senior Software Engineer"
          />
        </div>
        {errors.headline && (
          <p className="text-destructive text-xs mt-1">{errors.headline}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          LinkedIn <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => onLinkedinUrlChange(e.target.value)}
            className={inputClass}
            placeholder="https://linkedin.com/in/yourname"
          />
        </div>
        {errors.linkedinUrl && (
          <p className="text-destructive text-xs mt-1">{errors.linkedinUrl}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            GitHub{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => onGithubUrlChange(e.target.value)}
              className={inputClass}
              placeholder="https://github.com/you"
            />
          </div>
          {errors.githubUrl && (
            <p className="text-destructive text-xs mt-1">{errors.githubUrl}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Portfolio{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => onPortfolioUrlChange(e.target.value)}
              className={inputClass}
              placeholder="https://yoursite.com"
            />
          </div>
          {errors.portfolioUrl && (
            <p className="text-destructive text-xs mt-1">
              {errors.portfolioUrl}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
