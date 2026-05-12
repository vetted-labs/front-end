"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuildAvatar } from "@/components/ui/guild";
import { useGuildApplicationFlow } from "@/lib/hooks/useGuildApplicationFlow";
import { cn } from "@/lib/utils";

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
  const pct = Math.round((stepNum / totalSteps) * 100);
  const guildName = flow.guild?.name || "Guild";
  const jobTitle = flow.jobData?.title;

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
                {pct}% complete
              </span>
              <div className="w-32 h-1 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Wizard chrome ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid lg:grid-cols-[268px_1fr] min-h-[640px]">
            {/* ── Left rail ───────────────────────────────────── */}
            <aside className="bg-background border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 lg:self-start">
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

              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 px-6 mb-3 font-semibold">
                Application
              </div>

              <ol className="relative">
                {stepDefs.map((step, i) => {
                  const isActive = i === flow.currentStep;
                  const isDone = i < flow.currentStep;
                  const isFirst = i === 0;
                  const isLast = i === stepDefs.length - 1;
                  return (
                    <li key={step.num} className="relative">
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
                        onClick={() => flow.handleStepClick(i)}
                        className="grid grid-cols-[28px_1fr] gap-3.5 px-6 py-2.5 items-center w-full text-left hover:bg-muted/40 transition-colors"
                      >
                        <span
                          className={cn(
                            "relative z-[1] grid place-items-center w-7 h-7 rounded-full border text-[11px] font-bold transition-all",
                            isDone &&
                              "bg-emerald-500 text-background border-emerald-500",
                            isActive &&
                              "bg-primary text-background border-primary ring-4 ring-primary/15",
                            !isDone &&
                              !isActive &&
                              "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              "text-[13.5px] font-semibold tracking-tight",
                              isActive
                                ? "text-primary"
                                : isDone
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                            )}
                          >
                            {step.name}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground/70">
                            {step.sub}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

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
                  />
                )}
              </div>
            </main>
          </div>

          {/* ── Sticky footer ───────────────────────────────── */}
          <div className="border-t border-border bg-background/95 backdrop-blur px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky bottom-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="w-44 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="tabular-nums">
                {flow.isLastStep
                  ? `Step ${stepNum} of ${totalSteps} · ready to submit`
                  : `Step ${stepNum} of ${totalSteps} · ${pct}%`}
              </span>
            </div>

            <div className="flex gap-2.5">
              {flow.currentStep > 0 ? (
                <button
                  type="button"
                  onClick={flow.handleBack}
                  disabled={flow.isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-foreground bg-muted hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/guilds/${flow.guildId}`)}
                  disabled={flow.isSubmitting}
                  className="px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-muted-foreground bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={flow.handleContinue}
                disabled={flow.isSubmitting || flow.uploadingResume}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {flow.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : flow.isLastStep ? (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit application
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
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
