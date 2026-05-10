"use client";
/* eslint-disable react-hooks/refs -- the useExpertApplicationFlow hook intentionally exposes errorRef as part of its return value so consumers can scroll-target the alert; reading flow.error / flow.errorRef in JSX is the documented integration. */

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  CheckCircle,
  Info,
  Check,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GuildAvatar } from "@/components/ui/guild";
import { ThemeToggle } from "@/components/ThemeToggle";
import { STATUS_COLORS } from "@/config/colors";
import { cn, truncateAddress } from "@/lib/utils";
import { useExpertApplicationFlow } from "@/lib/hooks/useExpertApplicationFlow";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./ProfessionalBackgroundSection";
import { ApplicationQuestionsSection } from "./ApplicationQuestionsSection";
import { ReviewSubmitStep } from "./ReviewSubmitStep";

const STEP_DESCRIPTIONS = [
  "Name, contact, resume",
  "Guild, level, expertise",
  "Bio, motivation, prompts",
  "Verify wallet & submit",
];

const STEP_EYEBROWS = [
  "Step 01 · Personal info",
  "Step 02 · Professional background",
  "Step 03 · Application questions",
  "Step 04 · Review & submit",
];

const STEP_HEADLINES = [
  "Tell us who you are",
  "Where do you fit?",
  "Show us how you think",
  "Verify and ship it",
];

const STEP_SUBHEADS = [
  "We'll use this to identify your application across guilds.",
  "Pick a guild and the expertise level that matches your craft.",
  "These open prompts give reviewers signal that résumés don't.",
  "One signature confirms your wallet owns this application.",
];

export default function ExpertApplicationFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = useExpertApplicationFlow();

  const totalSteps = flow.steps.length;
  const stepIndex = flow.currentStep;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  // Try to surface the guild they're applying to (?guild=) so the hero shows
  // the right tile even before the form has been touched.
  const guildParam = searchParams.get("guild") ?? undefined;
  const guildOption = flow.guildOptions.find(
    (g) => g.id === flow.selectedGuildId || g.id === guildParam || g.name === guildParam,
  );
  const guildLabel = guildOption?.name || flow.formData.guild || "Vetted Guild";

  // --- Success state ---
  if (flow.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div
              className={`w-20 h-20 rounded-full ${STATUS_COLORS.positive.bgSubtle} flex items-center justify-center`}
            >
              <CheckCircle className={`w-10 h-10 ${STATUS_COLORS.positive.icon}`} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80">
              Submitted
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
              You&apos;re in the queue.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your application is on its way to the guild. We&apos;ll redirect you to the
              status page in a moment so you can track every review as it comes in.
            </p>
          </div>
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
        </div>
      </div>
    );
  }

  // --- Wallet not connected ---
  if (!flow.isConnected && !flow.wasEverConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full">
          <Alert variant="warning">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              Please connect your wallet to apply as an expert.
            </span>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground animate-page-enter">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/Vetted-orange.png"
                alt="Vetted"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-base font-bold text-foreground tracking-tight">
                Vetted
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {flow.address && (
                <span className="hidden sm:inline-flex items-center gap-2 px-3 h-8 rounded-full bg-muted/40 border border-border text-[11px] font-medium text-muted-foreground">
                  <Wallet className="w-3 h-3 text-primary/80" />
                  {truncateAddress(flow.address)}
                </span>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={() => router.push("/expert/dashboard")}
                className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main wizard card ───────────────────────────────────────── */}
      <div className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Hero card ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-5 flex items-center gap-5">
            <GuildAvatar guild={guildLabel} size="lg" rounded="2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-1">
                <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
                Expert application
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                Apply to {guildLabel}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                Join the network of vetted experts. Your reputation, your standards, your guild.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                {progressPct}% complete
              </span>
              <div className="w-32 h-1 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Wizard chrome ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid lg:grid-cols-[268px_1fr] min-h-[640px]">
            {/* Left rail */}
            <ApplyWizardRail
              currentStep={stepIndex}
              steps={flow.steps}
              onStepClick={flow.handleStepClick}
            />

            {/* Right pane */}
            <main className="px-6 sm:px-10 py-8 lg:py-10">
              {/* Eyebrow + headline */}
              <div className="mb-7 pb-6 border-b border-border">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-2.5 tabular-nums">
                  {STEP_EYEBROWS[stepIndex]}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                  {STEP_HEADLINES[stepIndex]}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
                  {STEP_SUBHEADS[stepIndex]}
                </p>
              </div>

              {/* Draft restored */}
              {flow.draftRestored && (
                <div className="mb-6">
                  <Alert variant="info" onClose={flow.dismissRestored}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span>
                        Your previous draft has been restored. You can continue where you
                        left off.
                      </span>
                      <button
                        type="button"
                        onClick={flow.discardDraft}
                        className="font-medium underline underline-offset-2 hover:opacity-80"
                      >
                        Start fresh
                      </button>
                    </div>
                  </Alert>
                </div>
              )}

              {/* Errors */}
              {flow.error && (
                <div className="mb-6" ref={flow.errorRef}>
                  <Alert variant="error">
                    <div className="space-y-2">
                      <span>{flow.error}</span>
                      {flow.errorDetails.length > 0 && (
                        <ul className="list-disc list-inside text-sm mt-2 space-y-2">
                          {flow.errorDetails.map((detail, i) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Alert>
                </div>
              )}

              {/* Step content — preserves the existing section components */}
              <div className="transition-opacity duration-200">
                {stepIndex === 0 && <PersonalInfoSection {...flow.personalInfoProps} />}
                {stepIndex === 1 && (
                  <ProfessionalBackgroundSection {...flow.professionalBackgroundProps} />
                )}
                {stepIndex === 2 && (
                  <ApplicationQuestionsSection {...flow.applicationQuestionsProps} />
                )}
                {stepIndex === 3 && (
                  <ReviewSubmitStep
                    formData={flow.formData}
                    selectedGuildName={flow.formData.guild}
                    generalAnswers={flow.generalAnswers}
                    levelAnswers={flow.levelAnswers}
                    levelTemplate={flow.levelTemplate}
                    noAiDeclaration={flow.noAiDeclaration}
                    resumeFile={flow.resumeFile}
                    walletSigned={flow.walletSigned}
                    isSigning={flow.isSigning}
                    signingError={flow.verificationError}
                    onVerify={flow.handleVerifyWallet}
                  />
                )}
              </div>
            </main>
          </div>

          {/* Sticky footer */}
          <ApplyWizardFooter
            currentStep={stepIndex}
            totalSteps={totalSteps}
            isSubmitting={flow.isSubmitting}
            isLastStep={flow.isLastStep}
            onBack={flow.handleBack}
            onContinue={flow.handleContinue}
            onCancel={() => router.push("/expert/dashboard")}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── ApplyWizardRail ──────────────────────────────────────────── */

interface ApplyWizardRailProps {
  currentStep: number;
  steps: { label: string }[];
  onStepClick: (step: number) => void;
}

function ApplyWizardRail({ currentStep, steps, onStepClick }: ApplyWizardRailProps) {
  return (
    <aside className="bg-background border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 lg:self-start">
      <div className="flex items-center gap-2.5 px-6 pb-6 border-b border-border mb-6">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center text-white font-black text-sm font-display"
          style={{ background: "linear-gradient(135deg, #ff7a1a, #ff4d00)" }}
        >
          V
        </div>
        <div className="font-bold text-sm text-foreground tracking-tight">
          Expert application
        </div>
      </div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 px-6 mb-3 font-semibold">
        Setup
      </div>

      <ol className="relative">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const isPending = i > currentStep;
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;

          return (
            <li key={step.label} className="relative">
              <span
                aria-hidden
                className={cn(
                  "absolute left-[37px] w-px bg-border",
                  isFirst ? "top-1/2" : "-top-2",
                  isLast ? "bottom-1/2" : "-bottom-2",
                )}
              />
              <button
                type="button"
                onClick={() => onStepClick(i)}
                disabled={isPending}
                className="grid grid-cols-[28px_1fr] gap-3.5 px-6 py-2.5 items-center w-full text-left hover:bg-muted/40 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span
                  className={cn(
                    "relative z-[1] grid place-items-center w-7 h-7 rounded-full border text-[11px] font-bold tabular-nums",
                    isDone && `${STATUS_COLORS.positive.bg} text-white border-transparent`,
                    isActive &&
                      "bg-primary text-primary-foreground border-primary ring-4 ring-primary/15",
                    isPending && "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className={cn(
                      "text-[13.5px] font-semibold tracking-tight truncate",
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground/70 truncate">
                    {STEP_DESCRIPTIONS[i]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 mx-6 rounded-lg border border-primary/15 bg-primary/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            Your draft saves automatically. Resume from any device with the same wallet.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ─── ApplyWizardFooter ────────────────────────────────────────── */

interface ApplyWizardFooterProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

function ApplyWizardFooter({
  currentStep,
  totalSteps,
  isSubmitting,
  isLastStep,
  onBack,
  onContinue,
  onCancel,
}: ApplyWizardFooterProps) {
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="border-t border-border bg-background px-6 sm:px-8 py-4 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center sticky bottom-0">
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <div className="w-32 h-1 bg-muted/60 rounded-sm overflow-hidden">
          <div
            className="h-full bg-primary rounded-sm transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="tabular-nums">
          Step {currentStep + 1} of {totalSteps} · {pct}% complete
        </span>
      </div>

      <div className="flex gap-2.5">
        {currentStep > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={isSubmitting}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}

        <Button
          type="button"
          onClick={onContinue}
          disabled={isSubmitting}
          icon={
            isSubmitting ? undefined : isLastStep ? (
              <Send className="w-3.5 h-3.5" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )
          }
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Submitting…
            </span>
          ) : isLastStep ? (
            "Submit application"
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
