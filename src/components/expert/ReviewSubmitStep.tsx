"use client";

import { useEffect, useMemo } from "react";
import { User, Briefcase, FileText, CheckCircle2 } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildDomainLevel, GuildDomainTopic } from "@/types";
import { WalletVerificationStep } from "./WalletVerificationStep";

interface ReviewSubmitStepProps {
  formData: {
    fullName: string;
    email: string;
    linkedinUrl: string;
    portfolioUrl: string;
    guild: string;
    expertiseLevel: string;
    yearsOfExperience: string;
    currentTitle: string;
    currentCompany: string;
    bio: string;
    motivation: string;
    expertiseAreas: string[];
  };
  selectedGuildName: string;
  generalAnswers: {
    learningFromFailure: string;
    decisionUnderUncertainty: string;
    motivationAndConflict: string;
    guildImprovement: string;
  };
  levelAnswers: Record<string, string>;
  levelTemplate: GuildDomainLevel | null;
  noAiDeclaration: boolean;
  resumeFile: File | null;
  walletSigned: boolean;
  isSigning: boolean;
  signingError?: string | null;
  onVerify: () => void;
}

interface SummarySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SummarySection({ icon, title, children }: SummarySectionProps) {
  return (
    <div className="p-6 border border-border rounded-xl bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        <CheckCircle2 className={`w-5 h-5 ${STATUS_COLORS.positive.icon} flex-shrink-0`} />
      </div>
      <div className="space-y-3 text-sm text-muted-foreground pl-12">
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
      <span className="font-medium text-foreground/70 sm:min-w-[140px] sm:flex-shrink-0">{label}:</span>
      <span className="text-foreground break-all">{value || <span className="italic text-muted-foreground/60">Not provided</span>}</span>
    </div>
  );
}

const GENERAL_QUESTION_LABELS: Record<string, string> = {
  learningFromFailure: "Learning from failure",
  decisionUnderUncertainty: "Decision under uncertainty",
  motivationAndConflict: "Motivation & conflict",
  guildImprovement: "Guild improvement",
};

export function ReviewSubmitStep({
  formData,
  selectedGuildName,
  generalAnswers,
  levelAnswers,
  levelTemplate,
  noAiDeclaration,
  resumeFile,
  walletSigned,
  isSigning,
  signingError,
  onVerify,
}: ReviewSubmitStepProps) {
  const previewUrl = useMemo(
    () => (resumeFile ? URL.createObjectURL(resumeFile) : null),
    [resumeFile],
  );
  const isPdf = resumeFile?.type === "application/pdf"
    || (resumeFile?.name.toLowerCase().endsWith(".pdf") ?? false);

  // eslint-disable-next-line no-restricted-syntax -- cleanup of allocated blob URL on unmount/file change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-foreground">Review Your Application</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Check everything looks correct before submitting. You won&apos;t be able to edit after submission.
        </p>
      </div>

      {/* Personal Info */}
      <SummarySection
        icon={<User className="w-4 h-4 text-primary" />}
        title="Personal Information"
      >
        <SummaryRow label="Full Name" value={formData.fullName} />
        <SummaryRow label="Email" value={formData.email} />
        <SummaryRow label="LinkedIn" value={formData.linkedinUrl} />
        {formData.portfolioUrl && (
          <SummaryRow label="Portfolio" value={formData.portfolioUrl} />
        )}
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
          <span className="font-medium text-foreground/70 sm:min-w-[140px] sm:flex-shrink-0">Resume:</span>
          {resumeFile ? (
            <span className="text-foreground">
              {resumeFile.name}
              <span className="ml-2 text-xs text-muted-foreground/60">
                · {(resumeFile.size / 1024).toFixed(0)} KB
              </span>
            </span>
          ) : (
            <span className="italic text-muted-foreground/60">No file uploaded</span>
          )}
        </div>
      </SummarySection>

      {/* Resume preview — only PDFs render inline; DOC/DOCX falls back to filename */}
      {resumeFile && previewUrl && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resume / CV Preview
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/60 truncate max-w-[200px]">
              {resumeFile.name}
            </span>
          </div>
          {isPdf ? (
            <iframe
              src={previewUrl}
              title="Resume preview"
              className="w-full h-[600px] bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center bg-muted/10">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{resumeFile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inline preview only available for PDFs. Reviewers will be able to download the file.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professional Background */}
      <SummarySection
        icon={<Briefcase className="w-4 h-4 text-primary" />}
        title="Professional Background"
      >
        <SummaryRow label="Guild" value={selectedGuildName} />
        <SummaryRow label="Expertise Level" value={formData.expertiseLevel} />
        <SummaryRow label="Years of Experience" value={formData.yearsOfExperience} />
        <SummaryRow label="Current Title" value={formData.currentTitle} />
        <SummaryRow label="Current Company" value={formData.currentCompany} />
        {formData.expertiseAreas.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
            <span className="font-medium text-foreground/70 sm:min-w-[140px] sm:flex-shrink-0">Expertise Areas:</span>
            <div className="flex flex-wrap gap-2">
              {formData.expertiseAreas.map((area) => (
                <span
                  key={area}
                  className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full text-xs font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </SummarySection>

      {/* Application Questions */}
      <SummarySection
        icon={<FileText className="w-4 h-4 text-primary" />}
        title="Application Questions"
      >
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-1">
          <span className="font-medium text-foreground/70 sm:min-w-[140px] sm:flex-shrink-0">No-AI Declaration:</span>
          <span className={noAiDeclaration ? `${STATUS_COLORS.positive.text} font-medium` : "text-destructive font-medium"}>
            {noAiDeclaration ? "Confirmed" : "Not confirmed"}
          </span>
        </div>

        {formData.bio && (
          <div className="space-y-2">
            <p className="font-medium text-foreground/70">Professional Bio:</p>
            <p className="text-foreground line-clamp-3 pl-2 border-l-2 border-border">{formData.bio}</p>
          </div>
        )}

        {formData.motivation && (
          <div className="space-y-2">
            <p className="font-medium text-foreground/70">Motivation:</p>
            <p className="text-foreground line-clamp-3 pl-2 border-l-2 border-border">{formData.motivation}</p>
          </div>
        )}

        {(Object.keys(generalAnswers) as Array<keyof typeof generalAnswers>)
          .filter((key) => generalAnswers[key])
          .map((key) => (
            <div key={key} className="space-y-2">
              <p className="font-medium text-foreground/70">{GENERAL_QUESTION_LABELS[key] ?? key}:</p>
              <p className="text-foreground line-clamp-2 pl-2 border-l-2 border-border">
                {generalAnswers[key]}
              </p>
            </div>
          ))}

        {levelTemplate?.topics?.length ? (
          <div className="space-y-2 pt-1">
            <p className="font-medium text-foreground/70">Level-specific answers ({levelTemplate.topics.length} topic{levelTemplate.topics.length !== 1 ? "s" : ""}):</p>
            {levelTemplate.topics.map((topic: GuildDomainTopic) => {
              const answer = levelAnswers[topic.id];
              return answer ? (
                <div key={topic.id} className="space-y-2">
                  <p className="text-foreground/60 text-xs font-medium">{topic.title}:</p>
                  <p className="text-foreground line-clamp-2 pl-2 border-l-2 border-border text-xs">
                    {answer}
                  </p>
                </div>
              ) : null;
            })}
          </div>
        ) : null}
      </SummarySection>

      {/* Wallet Verification */}
      <WalletVerificationStep
        isVerified={walletSigned}
        isSigning={isSigning}
        signingError={signingError}
        onVerify={onVerify}
      />
    </div>
  );
}
