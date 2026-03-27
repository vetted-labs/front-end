"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StepProgress } from "@/components/ui/step-progress";
import { useExpertApplicationFlow } from "@/lib/hooks/useExpertApplicationFlow";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./ProfessionalBackgroundSection";
import { ApplicationQuestionsSection } from "./ApplicationQuestionsSection";
import { ReviewSubmitStep } from "./ReviewSubmitStep";

export default function ExpertApplicationFlow() {
  const router = useRouter();
  const flow = useExpertApplicationFlow();

  // --- Success state ---
  if (flow.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Thanks for Applying!</h1>
            <p className="text-muted-foreground">
              Your application has been submitted. The guild will review it and get back to you
              shortly. You&apos;ll be redirected to your application status page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Wallet not connected ---
  if (!flow.isConnected && !flow.wasEverConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
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
    <div className="min-h-screen animate-page-enter">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-semibold text-foreground">Expert Application</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Join the network of vetted experts
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step progress */}
        <div className="mb-8">
          <StepProgress
            steps={flow.steps}
            currentStep={flow.currentStep}
            onStepClick={flow.handleStepClick}
          />
        </div>

        {/* Draft restored banner */}
        {flow.draftRestored && (
          <div className="mb-6">
            <Alert variant="info" onClose={flow.dismissRestored}>
              Your previous draft has been restored. You can continue where you left off.
            </Alert>
          </div>
        )}

        {/* Error alert */}
        {flow.error && (
          <div className="mb-6" ref={flow.errorRef}>
            <Alert variant="error">
              <div className="space-y-1">
                <span>{flow.error}</span>
                {flow.errorDetails.length > 0 && (
                  <ul className="list-disc list-inside text-sm mt-2 space-y-0.5">
                    {flow.errorDetails.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Alert>
          </div>
        )}

        {/* Step content */}
        <div className="transition-opacity duration-200">
          {flow.currentStep === 0 && (
            <PersonalInfoSection {...flow.personalInfoProps} />
          )}

          {flow.currentStep === 1 && (
            <ProfessionalBackgroundSection {...flow.professionalBackgroundProps} />
          )}

          {flow.currentStep === 2 && (
            <ApplicationQuestionsSection {...flow.applicationQuestionsProps} />
          )}

          {flow.currentStep === 3 && (
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

        {/* Sticky bottom navigation */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border/60 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-4 mt-8">
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
                onClick={() => router.push("/expert/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
            )}

            <Button
              type="button"
              onClick={flow.handleContinue}
              disabled={flow.isSubmitting}
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
                  <Loader2 className="w-4 h-4 animate-spin" />
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
