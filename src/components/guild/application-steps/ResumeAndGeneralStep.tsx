"use client";

import { useRef } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Textarea } from "@/components/ui";
import type {
  GuildApplicationQuestion,
  GuildApplicationTemplate,
  SocialLink,
} from "@/types";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";

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
  substepIndex?: number;
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
  substepIndex,
}: ResumeAndGeneralStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSetupSubstep = substepIndex === undefined || substepIndex === 0;
  const generalQs = template.generalQuestions ?? [];
  const promptQ =
    substepIndex !== undefined && substepIndex > 0
      ? generalQs[substepIndex - 1] ?? null
      : null;

  const usingProfile = useProfileResume && !resumeFile;
  const usingUpload = !useProfileResume || !!resumeFile;
  const missingRequiredLinks =
    requiredSocialLinks.filter(
      (platform) =>
        !candidateSocialLinks.some(
          (l) => l.platform === platform && l.url?.trim(),
        ),
    );

  return (
    <div className="space-y-10">
      {isSetupSubstep && (
        <>
      {/* Guidance */}
      {template.guidance && template.guidance.length > 0 && (
        <section className="rounded-xl border border-primary/15 bg-primary/[0.04] p-5">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-7 h-7 rounded-lg bg-primary/15 flex-shrink-0">
              <Info className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-1.5">
                Before you start
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed">
                {template.guidance.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary/60 mt-1.5 leading-none">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Required Social Links */}
      {requiredSocialLinks.length > 0 && (
        <section>
          <SectionHeader
            title="Required social links"
            description="This guild expects these profiles on your candidate account. Update your profile if any are missing."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {requiredSocialLinks.map((platform) => {
              const hasLink = candidateSocialLinks.some(
                (l) => l.platform === platform && l.url?.trim(),
              );
              const Icon = getPlatformIcon(platform);
              return (
                <div
                  key={platform}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm",
                    hasLink
                      ? `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle}`
                      : `${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`,
                  )}
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground flex-1 truncate">
                    {getPlatformLabel(platform)}
                  </span>
                  {hasLink ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11.5px] font-semibold",
                        STATUS_COLORS.positive.text,
                      )}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11.5px] font-semibold",
                        STATUS_COLORS.warning.text,
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Missing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {missingRequiredLinks.length > 0 && (
            <p
              className={cn(
                "text-xs mt-3 leading-relaxed",
                STATUS_COLORS.warning.text,
              )}
            >
              Please update your profile to add the missing links before submitting.
            </p>
          )}
        </section>
      )}

      {/* Resume */}
      <section>
        <SectionHeader
          title={
            <>
              Resume <span className="text-destructive">*</span>
            </>
          }
          description="Upload a PDF, DOC, or DOCX (max 5MB). Reviewers use this to evaluate your background."
        />

        <div className="space-y-2.5">
          {profileResume?.resumeUrl && (
            <button
              type="button"
              onClick={() => {
                setUseProfileResume(true);
                onRemoveResume();
              }}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3",
                usingProfile
                  ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <Radio active={usingProfile} />
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-muted/40 border border-border flex-shrink-0">
                <FileText
                  className={cn(
                    "w-4 h-4",
                    usingProfile ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Use resume from profile
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profileResume.resumeFileName || "Your profile resume"}
                </p>
              </div>
            </button>
          )}

          {resumeFile ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/[0.06]">
              <Radio active />
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/15 flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {resumeFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(resumeFile.size / 1024).toFixed(0)} KB
                  {uploadingResume
                    ? " · Uploading…"
                    : resumeUrl
                      ? " · Uploaded"
                      : ""}
                </p>
              </div>
              {!uploadingResume && (
                <button
                  type="button"
                  onClick={onRemoveResume}
                  aria-label="Remove resume"
                  className="p-1.5 rounded-md hover:bg-background/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
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
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed text-left transition-all",
                usingUpload
                  ? "border-primary/50 bg-primary/[0.03]"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <Radio active={usingUpload} />
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-muted/40 border border-border flex-shrink-0">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Upload a new resume
                </p>
                <p className="text-xs text-muted-foreground">
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
      </section>
        </>
      )}

      {/* General Questions */}
      {(substepIndex === undefined || promptQ) && generalQs.length > 0 && (
        <section>
          <SectionHeader
            title="General questions"
            description="Short prompts to assess judgment and clarity. Three to five sentences each is usually enough."
          />

          <div className="space-y-8">
            <GeneralQuestionsBlock
              questions={substepIndex === undefined ? generalQs : [promptQ!]}
              generalAnswers={generalAnswers}
              onAnswerChange={onAnswerChange}
              startIndex={substepIndex === undefined ? 0 : substepIndex - 1}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function GeneralQuestionsBlock({
  questions,
  generalAnswers,
  onAnswerChange,
  startIndex,
}: {
  questions: GuildApplicationQuestion[];
  generalAnswers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  startIndex: number;
}) {
  return (
    <>
      {questions.map((q, localIdx) => {
        const qIndex = startIndex + localIdx;
        return (
          <div key={q.id} className="space-y-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
                Question {String(qIndex + 1).padStart(2, "0")}
                {q.required && (
                  <span className="text-destructive ml-1">·  required</span>
                )}
              </p>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                {q.prompt}
              </p>
            </div>

            {q.hints && q.hints.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
                  Touch on
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground leading-relaxed">
                  {q.hints.map((hint, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground/50 mt-1.5 leading-none">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Textarea
              value={generalAnswers[q.id] || ""}
              onChange={(e) => onAnswerChange(q.id, e.target.value)}
              rows={6}
              placeholder="Your answer…"
              showCounter
              minLength={100}
              maxLength={2500}
            />
          </div>
        );
      })}
    </>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-display text-lg font-bold text-foreground tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "w-4 h-4 rounded-full border-2 grid place-items-center flex-shrink-0 transition-colors",
        active ? "border-primary" : "border-border",
      )}
    >
      {active && <span className="w-2 h-2 rounded-full bg-primary" />}
    </span>
  );
}
