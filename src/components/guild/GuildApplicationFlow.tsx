"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Send, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuildAvatar } from "@/components/ui/guild";
import { useGuildApplicationFlow } from "@/lib/hooks/useGuildApplicationFlow";
import { cn } from "@/lib/utils";

import ResumeAndGeneralStep from "./application-steps/ResumeAndGeneralStep";
import JobQuestionsStep from "./application-steps/JobQuestionsStep";
import GuildSpecificsStep from "./application-steps/GuildSpecificsStep";
import ApplicationSuccess from "./application-steps/ApplicationSuccess";

const STEP_LABELS: Record<string, { name: string; sub: string }> = {
  resume: { name: "Resume & general", sub: "Profile, links, basics" },
  job: { name: "Role questions", sub: "Cover letter, screening" },
  guild: { name: "Guild specifics", sub: "Level, domains, attestation" },
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

  const stepDefs = flow.steps.map((s, idx) => {
    const type =
      idx === 0 ? "resume" : flow.hasJobStep && idx === 1 ? "job" : "guild";
    const label = STEP_LABELS[type] ?? { name: s.label, sub: "" };
    return { num: idx + 1, ...label };
  });

  const totalSteps = stepDefs.length;
  const stepNum = flow.currentStep + 1;
  const pct = Math.round((stepNum / totalSteps) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <ApplyNav onBack={() => router.push(`/guilds/${flow.guildId}`)} />

      <div className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid lg:grid-cols-[268px_1fr] min-h-[640px]">
            {/* ── Left rail: stepper ── */}
            <aside className="bg-background border-b lg:border-b-0 lg:border-r border-border py-7 lg:sticky lg:top-16 self-start">
              <GuildHeroBlock
                guildName={flow.guild?.name || ""}
                description={flow.template.description}
              />

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
                            "relative z-[1] grid place-items-center w-7 h-7 rounded-full border text-[11px] font-bold",
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
                <div className="mx-6 mt-4 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Draft restored
                    </p>
                    <button
                      type="button"
                      onClick={flow.dismissDraftRestored}
                      className="text-[10.5px] text-muted-foreground hover:text-foreground mt-0.5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </aside>

            {/* ── Right pane: form content ── */}
            <main className="px-6 sm:px-10 py-9">
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

            {/* ── Sticky footer ── */}
            <div className="col-span-full">
              <div className="border-t border-border bg-background px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky bottom-0">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <div className="w-44 h-1 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-sm transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span>
                    {flow.isLastStep
                      ? `Step ${stepNum} of ${totalSteps} · ready to submit`
                      : `Step ${stepNum} of ${totalSteps} · ${pct}% complete`}
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
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function ApplyNav({ onBack }: { onBack: () => void }) {
  return (
    <nav className="border-b border-border bg-card sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/Vetted-orange.png"
              alt="Vetted"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold text-foreground">Vetted</span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={onBack}
              className="hidden sm:flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to guild
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function GuildHeroBlock({
  guildName,
  description,
}: {
  guildName: string;
  description: string;
}) {
  return (
    <div className="px-6 pb-6 mb-6 border-b border-border">
      <div className="flex items-start gap-3">
        <GuildAvatar guild={guildName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-semibold mb-1">
            Apply to
          </p>
          <h1 className="font-display text-lg font-bold tracking-tight text-foreground leading-tight truncate">
            {guildName || "Guild"}
          </h1>
          {description && (
            <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-3">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
