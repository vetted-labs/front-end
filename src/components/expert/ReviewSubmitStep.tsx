"use client";

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
    <div className="p-6 border border-border rounded-xl bg-card/60 space-y-4">
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
    <div className="flex gap-2">
      <span className="font-medium text-foreground/70 min-w-[140px]">{label}:</span>
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
  return (
    <div className="space-y-6 p-8">
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
        <div className="flex gap-2">
          <span className="font-medium text-foreground/70 min-w-[140px]">Resume:</span>
          {resumeFile ? (
            <span className="text-foreground">{resumeFile.name}</span>
          ) : (
            <span className="italic text-muted-foreground/60">No file uploaded</span>
          )}
        </div>
      </SummarySection>

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
          <div className="flex gap-2">
            <span className="font-medium text-foreground/70 min-w-[140px]">Expertise Areas:</span>
            <div className="flex flex-wrap gap-1.5">
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
        <div className="flex gap-2 mb-1">
          <span className="font-medium text-foreground/70 min-w-[140px]">No-AI Declaration:</span>
          <span className={noAiDeclaration ? `${STATUS_COLORS.positive.text} font-medium` : "text-destructive font-medium"}>
            {noAiDeclaration ? "Confirmed" : "Not confirmed"}
          </span>
        </div>

        {formData.bio && (
          <div className="space-y-1">
            <p className="font-medium text-foreground/70">Professional Bio:</p>
            <p className="text-foreground line-clamp-3 pl-2 border-l-2 border-border">{formData.bio}</p>
          </div>
        )}

        {formData.motivation && (
          <div className="space-y-1">
            <p className="font-medium text-foreground/70">Motivation:</p>
            <p className="text-foreground line-clamp-3 pl-2 border-l-2 border-border">{formData.motivation}</p>
          </div>
        )}

        {(Object.keys(generalAnswers) as Array<keyof typeof generalAnswers>)
          .filter((key) => generalAnswers[key])
          .map((key) => (
            <div key={key} className="space-y-1">
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
                <div key={topic.id} className="space-y-0.5">
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
