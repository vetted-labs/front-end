"use client";

import { useRef } from "react";
import { Upload, FileText, X, CheckCircle, AlertTriangle } from "lucide-react";
import type { GuildApplicationTemplate, SocialLink } from "@/types";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";

interface ProfileResume {
  resumeUrl?: string;
  resumeFileName?: string;
}

interface ResumeAndGeneralStepProps {
  template: GuildApplicationTemplate;
  profileResume: ProfileResume | null;
  useProfileResume: boolean;
  setUseProfileResume: (val: boolean) => void;
  resumeFile: File | null;
  resumeUrl: string;
  uploadingResume: boolean;
  onResumeSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveResume: () => void;
  generalAnswers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  requiredSocialLinks?: string[];
  candidateSocialLinks?: SocialLink[];
}

export default function ResumeAndGeneralStep({
  template,
  profileResume,
  useProfileResume,
  setUseProfileResume,
  resumeFile,
  resumeUrl,
  uploadingResume,
  onResumeSelect,
  onRemoveResume,
  generalAnswers,
  onAnswerChange,
  requiredSocialLinks = [],
  candidateSocialLinks = [],
}: ResumeAndGeneralStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      {/* Guidance */}
      {template.guidance && template.guidance.length > 0 && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <h3 className="font-semibold text-foreground mb-3">
            Before You Start
          </h3>
          <ul className="space-y-2">
            {template.guidance.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Social Links */}
      {requiredSocialLinks.length > 0 && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <h3 className="font-semibold text-foreground mb-3">
            Required Social Links
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            This guild requires certain social profiles on your candidate profile.
          </p>
          <div className="space-y-2">
            {requiredSocialLinks.map((platform) => {
              const hasLink = candidateSocialLinks.some(
                (l) => l.platform === platform && l.url?.trim()
              );
              const Icon = getPlatformIcon(platform);
              const StatusIcon = hasLink ? CheckCircle : AlertTriangle;
              return (
                <div
                  key={platform}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                    hasLink
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                  }`}
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground flex-1">
                    {getPlatformLabel(platform)}
                  </span>
                  <StatusIcon
                    className={`w-4 h-4 ${
                      hasLink ? "text-green-500" : "text-amber-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      hasLink ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {hasLink ? "Added" : "Missing"}
                  </span>
                </div>
              );
            })}
          </div>
          {candidateSocialLinks.filter((l) => l.url?.trim()).length <
            requiredSocialLinks.length && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
              Please update your profile to add the missing social links before submitting.
            </p>
          )}
        </div>
      )}

      {/* Resume Upload */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Resume / CV{" "}
          <span className="text-destructive">*</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload your resume so reviewers can evaluate your background. PDF,
          DOC, or DOCX (max 5MB).
        </p>

        {/* Profile resume option */}
        {profileResume?.resumeUrl && (
          <button
            type="button"
            onClick={() => {
              setUseProfileResume(true);
              onRemoveResume();
            }}
            className={`w-full p-4 mb-3 border-2 rounded-lg text-left transition-all ${
              useProfileResume && !resumeFile
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  useProfileResume && !resumeFile
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                {useProfileResume && !resumeFile && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <FileText
                className={`w-5 h-5 ${
                  useProfileResume && !resumeFile
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Use Resume from Profile
                </p>
                <p className="text-xs text-muted-foreground">
                  {profileResume.resumeFileName || "Your Profile Resume"}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* File upload */}
        {resumeFile ? (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border">
            <FileText className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {resumeFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(resumeFile.size / 1024).toFixed(0)} KB
                {uploadingResume
                  ? " — Uploading..."
                  : resumeUrl
                    ? " — Uploaded"
                    : ""}
              </p>
            </div>
            {!uploadingResume && (
              <button
                type="button"
                onClick={onRemoveResume}
                className="p-1 hover:bg-background rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setUseProfileResume(false);
              fileInputRef.current?.click();
            }}
            className={`w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer ${
              !useProfileResume && !resumeFile
                ? "border-primary/30"
                : "border-border"
            }`}
          >
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Click to upload a new resume
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, or DOCX up to 5MB
              </p>
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            setUseProfileResume(false);
            onResumeSelect(e);
          }}
          className="hidden"
        />
      </div>

      {/* General Questions */}
      {template.generalQuestions && template.generalQuestions.length > 0 && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              General Questions
            </h2>
            <p className="text-sm text-muted-foreground">
              These questions assess your professional maturity and judgment.
            </p>
          </div>

          {template.generalQuestions.map((q, qIndex) => (
            <div
              key={q.id}
              className="space-y-4 pt-6 first:pt-0 border-t first:border-t-0 border-border"
            >
              <div>
                <h3 className="text-base font-medium text-foreground">
                  {qIndex + 1}. {q.prompt}
                  {q.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </h3>
              </div>

              {q.hints && q.hints.length > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 space-y-1">
                  <p className="font-medium">
                    Address the following in your answer:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {q.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              <textarea
                value={generalAnswers[q.id] || ""}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder="Your answer..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={6}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
