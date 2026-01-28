"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useJobForm } from "@/hooks/useJobForm";
import { JobBasicInfo } from "./jobs/JobBasicInfo";
import { JobDetailsSection } from "./jobs/JobDetailsSection";
import { JobRequirements } from "./jobs/JobRequirements";

export function JobForm() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string | undefined;

  const {
    formData,
    guilds,
    error,
    fieldErrors,
    isLoading,
    isEditing,
    updateField,
    handleSubmit,
  } = useJobForm(jobId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isEditing ? "Edit Job Posting" : "Create New Job Posting"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update the details of your job posting"
              : "Fill in the details to post a new job opportunity"}
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            <JobBasicInfo
              formData={formData}
              fieldErrors={fieldErrors}
              onFieldChange={updateField}
            />

            {/* Location & Compensation Section */}
            <JobDetailsSection
              formData={formData}
              fieldErrors={fieldErrors}
              guilds={guilds}
              onFieldChange={updateField}
            />

            {/* Requirements & Guild Section */}
            <JobRequirements
              formData={formData}
              fieldErrors={fieldErrors}
              guilds={guilds}
              onFieldChange={updateField}
            />

            {/* Submit Section */}
            <div className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-primary to-accent text-gray-900 dark:text-gray-900 font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {isEditing ? (
                  isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Update Job"
                  )
                ) : isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Create Job"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
