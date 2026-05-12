"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuildAvatar } from "@/components/ui/guild";
import { useGuildApplicationFlow } from "@/lib/hooks/useGuildApplicationFlow";
import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";
import { SubstepChipStrip } from "@/components/wizard/SubstepChipStrip";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { useSubstepIndex } from "@/components/wizard/useSubstepIndex";
import type { SubstepDescriptor } from "@/components/wizard/types";

import ResumeAndGeneralStep from "./application-steps/ResumeAndGeneralStep";
import JobQuestionsStep from "./application-steps/JobQuestionsStep";
import GuildSpecificsStep from "./application-steps/GuildSpecificsStep";
import ApplicationSuccess from "./application-steps/ApplicationSuccess";

type StepType = "resume" | "job" | "guild";

const STEP_META: Record<
  StepType,
  { name: string; sub: string; headline: string; description: string }
> = {
  resume: {
    name: "Resume & general",
    sub: "Profile, links, basics",
    headline: "Start with the basics",
    description:
      "Share your resume and answer a few open prompts. Reviewers use these to get a quick read on how you think.",
  },
  job: {
    name: "Role questions",
    sub: "Cover letter, screening",
    headline: "Tell the hiring team why",
    description:
      "Write a short cover letter and answer any screening questions for the role.",
  },
  guild: {
    name: "Guild specifics",
    sub: "Level, domains, attestation",
    headline: "Show the guild your craft",
    description:
      "Pick the level that matches your experience, then answer the domain prompts that go to your reviewers.",
  },
};

export default function GuildApplicationFlow() {
  const router = useRouter();
  const flow = useGuildApplicationFlow();

  const substepsPerStep = useMemo<SubstepDescriptor[][]>(() => {
    const result: SubstepDescriptor[][] = [];
    const template = flow.template;
    if (!template) return result;

    const hasResume =
      !!flow.resumeUrl ||
      (flow.useProfileResume && !!flow.profileResume?.resumeUrl);
    const allRequiredSocials = (template.requiredSocialLinks ?? []).every((p) =>
      (flow.candidateSocialLinks ?? []).some(
        (l) => l.platform === p && l.url?.trim(),
      ),
    );
    const materialsSetupComplete = hasResume && allRequiredSocials;

    const materials: SubstepDescriptor[] = [
      {
        id: "materials.setup",
        label: "Resume & links",
        isComplete: materialsSetupComplete,
        isRequired: true,
      },
      ...(template.generalQuestions ?? []).map((q, i) => ({
        id: `materials.general.${q.id}`,
        label: `Question ${i + 1}`,
        isComplete: (flow.generalAnswers[q.id]?.trim().length ?? 0) >= 100,
        isRequired: q.required ?? false,
      })),
    ];
    result.push(materials);

    if (flow.hasJobStep && flow.jobData) {
      const coverLetterDone = flow.coverLetter.trim().length >= 50;
      const role: SubstepDescriptor[] = [
        {
          id: "role.cover",
          label: "Cover letter",
          isComplete: coverLetterDone,
          isRequired: true,
        },
        ...(flow.jobData.screeningQuestions ?? []).map((_, i) => ({
          id: `role.screening.${i}`,
          label: `Question ${i + 1}`,
          isComplete: (flow.screeningAnswers[i]?.trim().length ?? 0) >= 10,
          isRequired: true,
        })),
      ];
      result.push(role);
    }

    const levelTopics = flow.selectedLevel
      ? template.domainQuestions[
          flow.selectedLevel as keyof typeof template.domainQuestions
        ]?.topics ?? []
      : [];
    const guildSetupComplete =
      !!flow.selectedLevel &&
      (!template.noAiDeclarationText || flow.noAiDeclaration);

    const guild: SubstepDescriptor[] = [
      {
        id: "guild.setup",
        label: "Level & attestation",
        isComplete: guildSetupComplete,
        isRequired: true,
      },
      ...levelTopics.map((topic) => ({
        id: `guild.${topic.id}`,
        label: topic.title,
        isComplete:
          (flow.domainAnswers[`domain.${topic.id}`]?.trim().length ?? 0) >= 50,
        isRequired: true,
      })),
    ];
    result.push(guild);

    return result;
  }, [
    flow.template,
    flow.resumeUrl,
    flow.useProfileResume,
    flow.profileResume,
    flow.candidateSocialLinks,
    flow.generalAnswers,
    flow.hasJobStep,
    flow.jobData,
    flow.coverLetter,
    flow.screeningAnswers,
    flow.selectedLevel,
    flow.noAiDeclaration,
    flow.domainAnswers,
  ]);

  const { substepIndex, setSubstepIndex, queuePendingSubstep } = useSubstepIndex({
    topStepIndex: flow.currentStep,
  });

  if (flow.isLoading) return null;

  if (flow.error && !flow.template) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">{flow.error}</Alert>
      </div>
    );
  }

  if (flow.success) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <ApplyNav onBack={() => router.push(`/guilds/${flow.guildId}`)} />
        <ApplicationSuccess guildName={flow.guild?.name || ""} jobId={flow.jobId} />
      </div>
    );
  }

  if (!flow.template) return null;

  const stepDefs = flow.steps.map((_, idx) => {
    const type: StepType =
      idx === 0 ? "resume" : flow.hasJobStep && idx === 1 ? "job" : "guild";
    return { num: idx + 1, type, ...STEP_META[type] };
  });

  const totalSteps = stepDefs.length;
  const currentDef = stepDefs[flow.currentStep] ?? stepDefs[0];
  const stepNum = flow.currentStep + 1;
  const guildName = flow.guild?.name || "Guild";
  const jobTitle = flow.jobData?.title;

  const currentSubsteps = substepsPerStep[flow.currentStep] ?? [];
  const safeSubstepIndex = Math.min(
    substepIndex,
    Math.max(currentSubsteps.length - 1, 0),
  );
  const isLastSubstepInStep = safeSubstepIndex >= currentSubsteps.length - 1;
  const isFinalSubstep = flow.isLastStep && isLastSubstepInStep;

  const totalSubsteps = substepsPerStep.reduce((acc, s) => acc + s.length, 0);
  const completedSubsteps = substepsPerStep
    .flat()
    .filter((s) => s.isComplete).length;
  const progressPct =
    totalSubsteps === 0
      ? 0
      : Math.round((completedSubsteps / totalSubsteps) * 100);

  const incompleteTopSteps: number[] = substepsPerStep
    .map((substeps, idx) => ({
      stepNum: idx + 1,
      anyRequiredIncomplete: substeps.some(
        (s) => s.isRequired && !s.isComplete,
      ),
    }))
    .filter((s) => s.anyRequiredIncomplete && s.stepNum !== flow.currentStep + 1)
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
    if (flow.currentStep > 0) {
      const prev = substepsPerStep[flow.currentStep - 1] ?? [];
      queuePendingSubstep(Math.max(prev.length - 1, 0));
      flow.handleBack();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground animate-page-enter">
      <ApplyNav onBack={() => router.push(`/guilds/${flow.guildId}`)} />

      <div className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Hero card ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-5 flex items-center gap-5">
            <GuildAvatar guild={guildName} size="lg" rounded="2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 opacity-70" />
                {jobTitle ? "Applying for a role" : "Joining the guild"}
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                {jobTitle ? (
                  <>
                    Apply to{" "}
                    <span className="text-primary">{jobTitle}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-foreground">join {guildName}</span>
                  </>
                ) : (
                  <>Join {guildName}</>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                {flow.template.description}
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
            {/* ── Left rail ───────────────────────────────────── */}
            <aside className="border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 lg:self-start">
              <div className="flex items-center gap-2.5 px-6 pb-6 border-b border-border mb-6">
                <div
                  className="w-7 h-7 rounded-lg grid place-items-center text-white font-black text-sm font-display"
                  style={{
                    background: "linear-gradient(135deg, #ff7a1a, #ff4d00)",
                  }}
                >
                  V
                </div>
                <div className="font-bold text-sm text-foreground tracking-tight">
                  Candidate application
                </div>
              </div>

              <WizardRail
                sectionLabel="Application"
                steps={stepDefs.map<WizardRailStep>((s) => ({
                  number: s.num,
                  label: s.name,
                }))}
                currentStep={flow.currentStep + 1}
                incompleteSteps={incompleteTopSteps}
                onStepClick={(num) => flow.handleStepClick(num - 1)}
              />

              {flow.draftRestored && (
                <div className="mx-6 mt-6 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2.5 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Draft restored
                    </p>
                    <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">
                      We saved your progress on this device.
                    </p>
                    <button
                      type="button"
                      onClick={flow.dismissDraftRestored}
                      className="text-[10.5px] text-muted-foreground hover:text-foreground mt-1.5 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {jobTitle && (
                <div className="mx-6 mt-6 rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                      Applying to
                    </p>
                    <p className="text-[12px] font-semibold text-foreground leading-snug truncate">
                      {jobTitle}
                    </p>
                  </div>
                </div>
              )}
            </aside>

            {/* ── Right pane ──────────────────────────────────── */}
            <main className="px-6 sm:px-10 py-8 lg:py-10">
              {/* Eyebrow + headline */}
              <div className="mb-7 pb-6 border-b border-border">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-2.5 tabular-nums">
                  Step {String(stepNum).padStart(2, "0")} · {currentDef.name}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                  {currentDef.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
                  {currentDef.description}
                </p>
              </div>

              {flow.error && (
                <div className="mb-6">
                  <Alert variant="error">{flow.error}</Alert>
                </div>
              )}

              <SubstepChipStrip
                substeps={currentSubsteps}
                activeIndex={safeSubstepIndex}
                onJumpTo={setSubstepIndex}
              />

              <div className="transition-opacity duration-200">
                {flow.stepType === "resume" && (
                  <ResumeAndGeneralStep
                    template={flow.template}
                    profileResume={flow.profileResume}
                    useProfileResume={flow.useProfileResume}
                    setUseProfileResume={flow.setUseProfileResume}
                    resumeFile={flow.resumeFile}
                    resumeUrl={flow.resumeUrl}
                    uploadingResume={flow.uploadingResume}
                    onResumeSelect={flow.handleResumeSelect}
                    onRemoveResume={flow.removeResume}
                    generalAnswers={flow.generalAnswers}
                    onAnswerChange={(id, value) =>
                      flow.setGeneralAnswers((prev) => ({ ...prev, [id]: value }))
                    }
                    requiredSocialLinks={flow.template.requiredSocialLinks}
                    candidateSocialLinks={flow.candidateSocialLinks}
                    substepIndex={safeSubstepIndex}
                  />
                )}

                {flow.stepType === "job" && flow.jobData && (
                  <JobQuestionsStep
                    jobTitle={flow.jobData.title}
                    coverLetter={flow.coverLetter}
                    onCoverLetterChange={flow.setCoverLetter}
                    screeningQuestions={flow.jobData.screeningQuestions}
                    screeningAnswers={flow.screeningAnswers}
                    onScreeningAnswerChange={(index, value) => {
                      flow.setScreeningAnswers((prev) => {
                        const updated = [...prev];
                        updated[index] = value;
                        return updated;
                      });
                    }}
                    substepIndex={safeSubstepIndex}
                  />
                )}

                {flow.stepType === "guild" && (
                  <GuildSpecificsStep
                    template={flow.template}
                    selectedLevel={flow.selectedLevel}
                    onLevelChange={flow.setSelectedLevel}
                    requiredLevel={flow.requiredLevel}
                    domainAnswers={flow.domainAnswers}
                    onDomainAnswerChange={(key, value) =>
                      flow.setDomainAnswers((prev) => ({ ...prev, [key]: value }))
                    }
                    expandedDomain={flow.expandedDomain}
                    onExpandDomain={flow.setExpandedDomain}
                    noAiDeclaration={flow.noAiDeclaration}
                    onNoAiDeclarationChange={flow.setNoAiDeclaration}
                    substepIndex={safeSubstepIndex}
                  />
                )}
              </div>
            </main>
          </div>

          <WizardFooter
            stepLabel={
              isFinalSubstep
                ? `Step ${stepNum} of ${totalSteps} · ready to submit`
                : `Step ${stepNum} of ${totalSteps} · substep ${safeSubstepIndex + 1} of ${currentSubsteps.length}`
            }
            progressPct={progressPct}
            isSubmitting={flow.isSubmitting}
            isFinalSubstep={isFinalSubstep}
            canGoBack={flow.currentStep > 0 || safeSubstepIndex > 0}
            onBack={handleSubstepBack}
            onContinue={handleSubstepContinue}
            onCancel={() => router.push(`/guilds/${flow.guildId}`)}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function ApplyNav({ onBack }: { onBack: () => void }) {
  return (
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
            <ThemeToggle />
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
