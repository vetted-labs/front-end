"use client";

import { RefObject } from "react";
import { User, Upload, Paperclip, X } from "lucide-react";
import { Input } from "../ui/input";

export interface PersonalInfoSectionProps {
  fullName: string;
  email: string;
  linkedinUrl: string;
  portfolioUrl: string;
  onChange: (field: string, value: string) => void;
  resumeFile: File | null;
  resumeInputRef: RefObject<HTMLInputElement | null>;
  onResumeChange: (file: File | null) => void;
  onError: (message: string) => void;
  clearError: () => void;
}

export function PersonalInfoSection({
  fullName,
  email,
  linkedinUrl,
  portfolioUrl,
  onChange,
  resumeFile,
  resumeInputRef,
  onResumeChange,
  onError,
  clearError,
}: PersonalInfoSectionProps) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          <p className="text-sm text-muted-foreground">Tell us about yourself</p>
        </div>
      </div>

      <Input
        label="Full Name"
        type="text"
        value={fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        placeholder="John Doe"
        description="Your legal name as it appears on official documents"
        required
      />

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => onChange("email", e.target.value)}
        placeholder="john@example.com"
        description="We'll use this to send you important updates about your application"
        required
      />

      <Input
        label="LinkedIn Profile URL"
        type="url"
        value={linkedinUrl}
        onChange={(e) => onChange("linkedinUrl", e.target.value)}
        placeholder="https://linkedin.com/in/johndoe"
        description="Link to your LinkedIn profile for verification"
        required
      />

      <Input
        label="Portfolio / Website URL (Optional)"
        type="url"
        value={portfolioUrl}
        onChange={(e) => onChange("portfolioUrl", e.target.value)}
        placeholder="https://johndoe.com"
        description="Optional: Link to your personal website, GitHub, or portfolio"
      />

      {/* Resume Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Resume / CV <span className="text-destructive">*</span>
        </label>
        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              onError("Resume must be under 5MB");
              return;
            }
            onResumeChange(file);
            clearError();
          }}
        />
        {resumeFile ? (
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/40">
            <Paperclip className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {resumeFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(resumeFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onResumeChange(null);
                if (resumeInputRef.current) resumeInputRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => resumeInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
          >
            <Upload className="w-4 h-4" />
            Click to upload your resume (PDF, DOC, DOCX - max 5MB)
          </button>
        )}
        <p className="text-xs text-muted-foreground">
          Upload your resume or CV. Accepted formats: PDF, DOC, DOCX (max 5MB)
        </p>
      </div>
    </div>
  );
}
