"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import { useGuildApplicationFlow } from "@/lib/hooks/useGuildApplicationFlow";

import ApplicationNav from "./application-steps/ApplicationNav";
import ApplicationHeader from "./application-steps/ApplicationHeader";
import StepIndicator from "./application-steps/StepIndicator";
import ResumeAndGeneralStep from "./application-steps/ResumeAndGeneralStep";
import JobQuestionsStep from "./application-steps/JobQuestionsStep";
import GuildSpecificsStep from "./application-steps/GuildSpecificsStep";
import ApplicationSuccess from "./application-steps/ApplicationSuccess";

export default function GuildApplicationFlow() {
  const router = useRouter();
  const flow = useGuildApplicationFlow();

  // --- Loading state ---
  if (flow.isLoading) return null;

  // --- Fatal error (no template loaded) ---
  if (flow.error && !flow.template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">{flow.error}</Alert>
      </div>
    );
  }

  // --- Success ---
  if (flow.success) {
    return (
      <div className="min-h-screen">
        <ApplicationNav />
        <ApplicationSuccess guildName={flow.guild?.name || ""} jobId={flow.jobId} />
      </div>
    );
  }

  if (!flow.template) return null;

  return (
    <div className="min-h-screen">
      <ApplicationNav
        backHref={`/guilds/${flow.guildId}`}
        onBack={() => router.push(`/guilds/${flow.guildId}`)}
      />

      <ApplicationHeader
        guildName={flow.guild?.name || ""}
        description={flow.template.description}
      />

      {/* Step Indicator + Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <StepIndicator
            steps={flow.steps}
            currentStep={flow.currentStep}
            onStepClick={flow.handleStepClick}
          />
        </div>

        {/* Error */}
        {flow.error && (
          <div className="mb-6">
            <Alert variant="error">{flow.error}</Alert>
          </div>
        )}

        {/* Step content */}
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

        {/* Navigation buttons */}
        <div className="sticky bottom-0 bg-background/80 border-t border-border -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-4 mt-8">
          <div className="flex gap-4">
            {flow.currentStep > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={flow.handleBack}
                className="flex-1"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/guilds/${flow.guildId}`)}
                className="flex-1"
              >
                Cancel
              </Button>
            )}

            <Button
              type="button"
              onClick={flow.handleContinue}
              disabled={flow.isSubmitting || flow.uploadingResume}
              className="flex-1"
              icon={
                flow.isSubmitting ? undefined : flow.isLastStep ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )
              }
            >
              {flow.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : flow.isLastStep ? (
                "Submit Application"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
