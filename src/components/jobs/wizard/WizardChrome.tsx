"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WizardRail } from "./WizardRail";
import { WizardFooter } from "./WizardFooter";

interface WizardChromeProps {
  children: ReactNode;
  currentStep: number;
  onStepClick: (step: number) => void;
  isSubmitting: boolean;
  canPublish: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

/**
 * Top-level chrome for the post-a-job wizard:
 *   - sticky header (Vetted lockup, theme toggle, back-to-dashboard)
 *   - left rail vertical stepper
 *   - right pane content area (children)
 *   - sticky footer with progress + actions
 */
export function WizardChrome({
  children,
  currentStep,
  onStepClick,
  isSubmitting,
  canPublish,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
}: WizardChromeProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <nav className="border-b border-border bg-card sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/Vetted-orange.png"
                alt="Vetted Logo"
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
                onClick={() => router.push("/dashboard")}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[268px_1fr] min-h-[640px]">
            <WizardRail
              currentStep={currentStep}
              onStepClick={onStepClick}
            />
            <main className="px-11 py-9">{children}</main>
            <div className="col-span-full">
              <WizardFooter
                currentStep={currentStep}
                isSubmitting={isSubmitting}
                canPublish={canPublish}
                onBack={onBack}
                onNext={onNext}
                onSaveDraft={onSaveDraft}
                onPublish={onPublish}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
