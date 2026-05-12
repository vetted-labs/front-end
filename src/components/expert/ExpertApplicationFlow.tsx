"use client";
/* eslint-disable react-hooks/refs -- the useExpertApplicationFlow hook intentionally exposes errorRef as part of its return value so consumers can scroll-target the alert; reading flow.error / flow.errorRef in JSX is the documented integration. */

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Info,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { GuildAvatar } from "@/components/ui/guild";
import { ThemeToggle } from "@/components/ThemeToggle";
import { STATUS_COLORS } from "@/config/colors";
import { truncateAddress } from "@/lib/utils";
import { useExpertApplicationFlow } from "@/lib/hooks/useExpertApplicationFlow";
import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";
import { SubstepChipStrip } from "@/components/wizard/SubstepChipStrip";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { useSubstepIndex } from "@/components/wizard/useSubstepIndex";
import type { SubstepDescriptor } from "@/components/wizard/types";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./ProfessionalBackgroundSection";
import { ApplicationQuestionsSection } from "./ApplicationQuestionsSection";
import { ReviewSubmitStep } from "./ReviewSubmitStep";

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

  // Try to surface the guild they're applying to (?guild=) so the hero shows
  // the right tile even before the form has been touched.
  const guildParam = searchParams.get("guild") ?? undefined;
  const guildOption = flow.guildOptions.find(
    (g) => g.id === flow.selectedGuildId || g.id === guildParam || g.name === guildParam,
  );
  const guildLabel = guildOption?.name || flow.formData.guild || "Vetted Guild";

  const {
    formData: flowFormData,
    resumeFile: flowResumeFile,
    selectedGuildId: flowSelectedGuildId,
    generalAnswers: flowGeneralAnswers,
    levelAnswers: flowLevelAnswers,
    levelTemplate: flowLevelTemplate,
    noAiDeclaration: flowNoAiDeclaration,
    walletSigned: flowWalletSigned,
  } = flow;
  const flowGeneralTemplate = flow.applicationQuestionsProps.generalTemplate;

  const substepsPerStep = useMemo<SubstepDescriptor[][]>(() => {
    const personalComplete =
      !!flowFormData.fullName?.trim() &&
      !!flowFormData.email?.trim() &&
      !!flowResumeFile;
    const personalInfo: SubstepDescriptor[] = [
      { id: "personal.setup", label: "Personal info", isComplete: personalComplete, isRequired: true },
    ];

    const professionalComplete =
      !!flowSelectedGuildId &&
      !!flowFormData.expertiseLevel &&
      (flowFormData.expertiseAreas?.length ?? 0) > 0;
    const professional: SubstepDescriptor[] = [
      { id: "professional.setup", label: "Background", isComplete: professionalComplete, isRequired: true },
    ];

    const setupComplete =
      (flowFormData.bio?.trim().length ?? 0) >= 50 &&
      (flowFormData.motivation?.trim().length ?? 0) >= 50 &&
      flowNoAiDeclaration;

    const generalQs = flowGeneralTemplate?.generalQuestions ?? [];
    const levelTopics = flowLevelTemplate?.topics ?? [];

    const application: SubstepDescriptor[] = [
      { id: "application.setup", label: "Bio & intent", isComplete: setupComplete, isRequired: true },
      ...generalQs.map((q, i) => {
        const answerKey =
          q.id === "learning_from_failure" ? "learningFromFailure"
          : q.id === "decision_under_uncertainty" ? "decisionUnderUncertainty"
          : q.id === "motivation_and_conflict" ? "motivationAndConflict"
          : "guildImprovement";
        const answer = flowGeneralAnswers[answerKey as keyof typeof flowGeneralAnswers];
        return {
          id: `application.general.${q.id}`,
          label: `General Q${i + 1}`,
          isComplete: (answer?.trim().length ?? 0) >= 50,
          isRequired: true,
        };
      }),
      ...levelTopics.map((topic, i) => ({
        id: `application.level.${topic.id}`,
        label: `Level Q${i + 1}`,
        isComplete: (flowLevelAnswers[topic.id]?.trim().length ?? 0) >= 50,
        isRequired: true,
      })),
    ];

    const review: SubstepDescriptor[] = [
      { id: "review.submit", label: "Verify & submit", isComplete: flowWalletSigned, isRequired: true },
    ];

    return [personalInfo, professional, application, review];
  }, [
    flowFormData,
    flowResumeFile,
    flowSelectedGuildId,
    flowGeneralTemplate,
    flowGeneralAnswers,
    flowLevelTemplate,
    flowLevelAnswers,
    flowNoAiDeclaration,
    flowWalletSigned,
  ]);

  const { substepIndex, setSubstepIndex, queuePendingSubstep } = useSubstepIndex({
    topStepIndex: stepIndex,
  });

  const currentSubsteps = substepsPerStep[stepIndex] ?? [];
  const safeSubstepIndex = Math.min(substepIndex, Math.max(currentSubsteps.length - 1, 0));
  const isLastSubstepInStep = safeSubstepIndex >= currentSubsteps.length - 1;
  const isFinalSubstep = flow.isLastStep && isLastSubstepInStep;

  const totalSubsteps = substepsPerStep.reduce((a, s) => a + s.length, 0);
  const completedCount = substepsPerStep.flat().filter((s) => s.isComplete).length;
  const newProgressPct = totalSubsteps === 0 ? 0 : Math.round((completedCount / totalSubsteps) * 100);

  const incompleteTopSteps: number[] = substepsPerStep
    .map((substeps, idx) => ({
      stepNum: idx + 1,
      incomplete: substeps.some((s) => s.isRequired && !s.isComplete),
    }))
    .filter((s) => s.incomplete && s.stepNum !== stepIndex + 1)
    .map((s) => s.stepNum);

  const handleSubstepContinue = () => {
    if (!isLastSubstepInStep) {
      setSubstepIndex(safeSubstepIndex + 1);
      return;
    }
    flow.handleContinue();
  };

  const handleSubstepBack = () => {
    if (safeSubstepIndex > 0) {
      setSubstepIndex(safeSubstepIndex - 1);
      return;
    }
    if (stepIndex > 0) {
      const prev = substepsPerStep[stepIndex - 1] ?? [];
      queuePendingSubstep(Math.max(prev.length - 1, 0));
      flow.handleBack();
    }
  };

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
                {newProgressPct}% complete
              </span>
              <div className="w-32 h-1 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${newProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Wizard chrome ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid lg:grid-cols-[268px_1fr] min-h-[640px]">
            {/* Left rail */}
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

              <WizardRail
                sectionLabel="Setup"
                steps={flow.steps.map<WizardRailStep>((s, i) => ({ number: i + 1, label: s.label }))}
                currentStep={stepIndex + 1}
                incompleteSteps={incompleteTopSteps}
                maxUnlockedStep={stepIndex + 1}
                onStepClick={(num) => flow.handleStepClick(num - 1)}
              />

              <div className="mt-8 mx-6 rounded-lg border border-primary/15 bg-primary/[0.04] p-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    Your draft saves automatically. Resume from any device with the same wallet.
                  </p>
                </div>
              </div>
            </aside>

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

              <SubstepChipStrip
                substeps={currentSubsteps}
                activeIndex={safeSubstepIndex}
                onJumpTo={setSubstepIndex}
              />

              {/* Step content — preserves the existing section components */}
              <div className="transition-opacity duration-200">
                {stepIndex === 0 && <PersonalInfoSection {...flow.personalInfoProps} />}
                {stepIndex === 1 && (
                  <ProfessionalBackgroundSection {...flow.professionalBackgroundProps} />
                )}
                {stepIndex === 2 && (
                  <ApplicationQuestionsSection
                    {...flow.applicationQuestionsProps}
                    substepIndex={safeSubstepIndex}
                  />
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
          <WizardFooter
            stepLabel={
              isFinalSubstep
                ? `Step ${stepIndex + 1} of ${totalSteps} · ready to submit`
                : `Step ${stepIndex + 1} of ${totalSteps} · substep ${safeSubstepIndex + 1} of ${currentSubsteps.length}`
            }
            progressPct={newProgressPct}
            isSubmitting={flow.isSubmitting}
            isFinalSubstep={isFinalSubstep}
            canGoBack={stepIndex > 0 || safeSubstepIndex > 0}
            onBack={handleSubstepBack}
            onContinue={handleSubstepContinue}
            onCancel={() => router.push("/expert/dashboard")}
          />
        </div>
      </div>
    </div>
  );
}

