"use client";

import Image from "next/image";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useJobForm } from "@/hooks/useJobForm";
import { Modal } from "@/components/ui/modal";
import { JobBasicInfo } from "./jobs/JobBasicInfo";
import { JobDetailsSection } from "./jobs/JobDetailsSection";
import { JobRequirements } from "./jobs/JobRequirements";

export function JobForm() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string | undefined;

  const [showPreview, setShowPreview] = useState(false);

  const {
    formData,
    guilds,
    error,
    fieldErrors,
    isLoading,
    isEditing,
    updateField,
    handleSubmit,
    handleSaveDraft,
  } = useJobForm(jobId);

  return (
    <div className="min-h-screen min-h-full">
      {/* Header */}
      <nav className="border-b border-border bg-card sticky top-0 z-40 shadow-sm">
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
          <h1 className="text-2xl font-bold text-foreground mb-2 font-display">
            {isEditing ? "Edit Job Posting" : "Create New Job Posting"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update the details of your job posting"
              : "Fill in the details to post a new job opportunity"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
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
              isEditing={isEditing}
            />

            {/* Submit Section */}
            <div className="p-8 bg-primary/5">
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="py-3.5 px-6 border border-border text-foreground font-bold rounded-xl hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                {!isEditing && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSaveDraft}
                    className="flex-1 py-3.5 px-6 border border-border text-foreground font-bold rounded-xl hover:bg-muted/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Save as Draft"
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3.5 px-6 bg-primary text-foreground font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isEditing ? (
                    "Update Job"
                  ) : (
                    "Publish Job"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Job Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Job Preview" size="xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">{formData.title || "Untitled Job"}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {formData.department && `${formData.department} · `}
              {formData.locationType && `${formData.locationType} · `}
              {formData.jobType}
            </p>
          </div>

          {(formData.salaryMin || formData.salaryMax) && (
            <div className="text-lg font-semibold">
              {formData.salaryCurrency === "USD" ? "$" : formData.salaryCurrency}
              {Number(formData.salaryMin || 0).toLocaleString()}
              {formData.salaryMax && (
                <>
                  {" – "}
                  {formData.salaryCurrency === "USD" ? "$" : formData.salaryCurrency}
                  {Number(formData.salaryMax).toLocaleString()}
                </>
              )}
            </div>
          )}

          {formData.location && (
            <p className="text-sm text-muted-foreground">{formData.location}</p>
          )}

          {formData.description && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
            </div>
          )}

          {(formData.requirements ?? []).filter(Boolean).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Requirements</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {(formData.requirements ?? []).filter(Boolean).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {(formData.skills ?? []).filter(Boolean).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(formData.skills ?? []).filter(Boolean).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-sm">{s}</span>
                ))}
              </div>
            </div>
          )}

          {formData.guild && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Guild</h3>
              <p className="text-sm text-muted-foreground">{formData.guild}</p>
            </div>
          )}

          {(formData.screeningQuestions ?? []).filter(Boolean).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Screening Questions</h3>
              <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                {(formData.screeningQuestions ?? []).filter(Boolean).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
