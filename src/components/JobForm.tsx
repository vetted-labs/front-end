"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useJobWizard } from "@/hooks/useJobWizard";
import { Alert } from "@/components/ui/alert";
import { WizardChrome } from "./jobs/wizard/WizardChrome";
import {
  StepRole,
  StepLocationComp,
  StepDescription,
  StepGuild,
  StepQuestions,
  StepAttachments,
  StepReview,
} from "./jobs/wizard/steps";

export function JobForm() {
  const params = useParams();
  const jobId = params?.jobId as string | undefined;

  const wizard = useJobWizard(jobId);
  const {
    currentStep,
    formData,
    fieldErrors,
    globalError,
    isSubmitting,
    isLoadingJob,
    guilds,
    goToStep,
    next,
    prev,
    updateField,
    saveDraft,
    publish,
    validateStep,
  } = wizard;

  const stepProps = { formData, fieldErrors, updateField };

  return (
    <WizardChrome
      currentStep={currentStep}
      onStepClick={goToStep}
      isSubmitting={isSubmitting}
      canPublish={Object.keys(validateStep(7)).length === 0}
      onBack={prev}
      onNext={next}
      onSaveDraft={saveDraft}
      onPublish={publish}
    >
      {isLoadingJob ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading job…
        </div>
      ) : (
        <div className="space-y-6">
          {globalError && <Alert variant="error">{globalError}</Alert>}

          {currentStep === 1 && <StepRole {...stepProps} />}
          {currentStep === 2 && <StepLocationComp {...stepProps} />}
          {currentStep === 3 && <StepDescription {...stepProps} />}
          {currentStep === 4 && <StepGuild {...stepProps} />}
          {currentStep === 5 && <StepQuestions {...stepProps} />}
          {currentStep === 6 && <StepAttachments {...stepProps} />}
          {currentStep === 7 && (
            <StepReview
              formData={formData}
              guilds={guilds}
              validateStep={validateStep}
              isSubmitting={isSubmitting}
              onEdit={goToStep}
              onPublish={publish}
            />
          )}
        </div>
      )}
    </WizardChrome>
  );
}
