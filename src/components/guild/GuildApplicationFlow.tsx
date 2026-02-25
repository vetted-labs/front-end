"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield, Send } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, Button } from "@/components/ui";
import { guildsApi, candidateApi, jobsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import type { GuildApplicationTemplate, SocialLink } from "@/types";

import StepIndicator from "./application-steps/StepIndicator";
import ResumeAndGeneralStep from "./application-steps/ResumeAndGeneralStep";
import JobQuestionsStep from "./application-steps/JobQuestionsStep";
import GuildSpecificsStep from "./application-steps/GuildSpecificsStep";
import ApplicationSuccess from "./application-steps/ApplicationSuccess";

interface Guild {
  id: string;
  name: string;
  description: string;
}

interface JobData {
  id: string;
  title: string;
  screeningQuestions: string[];
  experienceLevel: string | null;
}

/** Map job experience levels to guild template level IDs */
const JOB_LEVEL_TO_GUILD_LEVEL: Record<string, string> = {
  junior: "entry",
  mid: "experienced",
  senior: "expert",
  lead: "expert",
  executive: "expert",
};

interface ProfileResume {
  resumeUrl?: string;
  resumeFileName?: string;
}

export default function GuildApplicationFlow() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthContext();
  const guildId = params.guildId as string;
  const jobId = searchParams.get("jobId") || undefined;

  // Loading & error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetched data
  const [guild, setGuild] = useState<Guild | null>(null);
  const [template, setTemplate] = useState<GuildApplicationTemplate | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [profileResume, setProfileResume] = useState<ProfileResume | null>(null);
  const [candidateSocialLinks, setCandidateSocialLinks] = useState<SocialLink[]>([]);

  // Step navigation
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 - Resume & General
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [generalAnswers, setGeneralAnswers] = useState<Record<string, string>>({});

  // Step 2 - Job Questions (conditional)
  const [coverLetter, setCoverLetter] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);

  // Step 3 - Guild Specifics
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [requiredLevel, setRequiredLevel] = useState<string | null>(null);
  const [domainAnswers, setDomainAnswers] = useState<Record<string, string>>({});
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [noAiDeclaration, setNoAiDeclaration] = useState(false);

  const hasJobStep = !!jobId;
  const steps = hasJobStep
    ? [
        { label: "Resume & General" },
        { label: "Job Questions" },
        { label: "Guild Review" },
      ]
    : [{ label: "Resume & General" }, { label: "Guild Review" }];

  // Map step index to logical step
  const getStepType = (stepIndex: number): "resume" | "job" | "guild" => {
    if (stepIndex === 0) return "resume";
    if (hasJobStep && stepIndex === 1) return "job";
    return "guild";
  };

  const isLastStep = currentStep === steps.length - 1;

  // --- Data fetching ---
  useEffect(() => {
    if (!auth.isAuthenticated) {
      const redirect = jobId
        ? `/guilds/${guildId}/apply?jobId=${jobId}`
        : `/guilds/${guildId}/apply`;
      router.push(
        `/auth/login?type=candidate&redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }
    fetchData();
  }, [guildId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const candidateId = auth.userId;

      // Parallel fetches
      const promises: Promise<unknown>[] = [
        guildsApi.getPublicDetail(guildId),
        guildsApi.getApplicationTemplate(guildId, jobId),
      ];

      if (jobId) {
        promises.push(jobsApi.getById(jobId));
      }

      if (candidateId) {
        promises.push(candidateApi.getById(candidateId));
        promises.push(guildsApi.checkMembership(candidateId, guildId));
      }

      const results = await Promise.allSettled(promises);

      // Guild data (required)
      if (results[0].status === "fulfilled") {
        setGuild(results[0].value as Guild);
      } else {
        throw new Error("Failed to load guild details.");
      }

      // Template data (required)
      if (results[1].status === "fulfilled") {
        const templateData = results[1].value as GuildApplicationTemplate;
        setTemplate(templateData);

        if (templateData.requiredLevel) {
          setRequiredLevel(templateData.requiredLevel);
          setSelectedLevel(templateData.requiredLevel);
        }

        // Initialize general answers
        const initialAnswers: Record<string, string> = {};
        if (templateData.generalQuestions) {
          templateData.generalQuestions.forEach((q) => {
            initialAnswers[q.id] = "";
          });
        }
        setGeneralAnswers(initialAnswers);
      } else {
        throw new Error("Failed to load application template.");
      }

      // Job data (optional, only when jobId present)
      if (jobId && results[2]) {
        if (results[2].status === "fulfilled") {
          const job = results[2].value as JobData;
          setJobData({
            id: job.id,
            title: job.title,
            screeningQuestions: job.screeningQuestions || [],
            experienceLevel: job.experienceLevel || null,
          });
          setScreeningAnswers(
            new Array(job.screeningQuestions?.length || 0).fill("")
          );

          // Lock guild level based on job's experience level (if backend didn't already)
          const templateData = results[1].status === "fulfilled"
            ? results[1].value as GuildApplicationTemplate
            : null;
          if (!templateData?.requiredLevel && job.experienceLevel) {
            const mappedLevel = JOB_LEVEL_TO_GUILD_LEVEL[job.experienceLevel];
            if (mappedLevel) {
              setRequiredLevel(mappedLevel);
              setSelectedLevel(mappedLevel);
            }
          }
        }
        // Non-critical: if job fetch fails we just won't show job questions
      }

      // Profile resume + social links (optional)
      const profileIndex = jobId ? 3 : 2;
      if (candidateId && results[profileIndex]) {
        if (results[profileIndex].status === "fulfilled") {
          const profile = results[profileIndex].value as Record<string, unknown>;
          if (profile.resumeUrl) {
            setProfileResume({
              resumeUrl: profile.resumeUrl as string,
              resumeFileName:
                (profile.resumeFileName as string) || "Your Profile Resume",
            });
          }
          // Extract social links from candidate profile
          if (Array.isArray(profile.socialLinks)) {
            setCandidateSocialLinks(profile.socialLinks as SocialLink[]);
          } else {
            // Fallback: construct from legacy fields
            const legacy: SocialLink[] = [];
            if (profile.linkedIn) legacy.push({ platform: "linkedin", label: "LinkedIn", url: profile.linkedIn as string });
            if (profile.github) legacy.push({ platform: "github", label: "GitHub", url: profile.github as string });
            setCandidateSocialLinks(legacy);
          }
        }
      }

      // Membership check (optional)
      const membershipIndex = jobId ? 4 : 3;
      if (candidateId && results[membershipIndex]) {
        if (results[membershipIndex].status === "fulfilled") {
          const membership = results[membershipIndex].value as Record<string, unknown>;
          if (
            membership.isMember ||
            membership.status === "approved"
          ) {
            // Already a member
            if (jobId) {
              router.push(`/browse/jobs/${jobId}`);
            } else {
              setError(
                "You are already a member of this guild."
              );
            }
            return;
          }
          if (membership.status === "pending") {
            setError(
              "Your application to this guild is already pending review."
            );
            return;
          }
        }
        // 404 = not a member, which is fine
      }
    } catch (err) {
      console.error("[Guild Application] Error loading data:", err);
      setError(
        (err as Error).message || "Failed to load application form. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize domain answers when level changes
  useEffect(() => {
    if (!template || !selectedLevel) return;

    const domainLevel =
      template.domainQuestions[
        selectedLevel as keyof typeof template.domainQuestions
      ];
    if (!domainLevel) return;

    setDomainAnswers((prev) => {
      const updated = { ...prev };
      domainLevel.topics.forEach((topic) => {
        const key = `domain.${topic.id}`;
        if (!(key in updated)) {
          updated[key] = "";
        }
      });
      return updated;
    });

    if (domainLevel.topics.length > 0) {
      setExpandedDomain(domainLevel.topics[0].id);
    }
  }, [selectedLevel, template]);

  // --- Resume handling ---
  const handleResumeSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }

    setResumeFile(file);
    setError(null);

    const candidateId = auth.userId;
    if (!candidateId) return;

    setUploadingResume(true);
    try {
      const result = (await candidateApi.uploadResume(candidateId, file)) as {
        resumeUrl: string;
      };
      setResumeUrl(result.resumeUrl);
    } catch (err) {
      console.error("Resume upload error:", err);
      setError("Failed to upload resume. Please try again.");
      setResumeFile(null);
    } finally {
      setUploadingResume(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeUrl("");
  };

  // --- Validation ---
  const validateCurrentStep = (): boolean => {
    if (!template) return false;
    setError(null);

    const stepType = getStepType(currentStep);

    if (stepType === "resume") {
      // Check guild-required social links
      const requiredSocials = template.requiredSocialLinks ?? [];
      if (requiredSocials.length > 0) {
        const filledPlatforms = new Set(
          candidateSocialLinks.filter((l) => l.url?.trim()).map((l) => l.platform)
        );
        const missing = requiredSocials.filter((p) => !filledPlatforms.has(p));
        if (missing.length > 0) {
          setError(
            `This guild requires the following social links on your profile: ${missing.join(", ")}. Please update your profile first.`
          );
          return false;
        }
      }

      if (!resumeFile && !resumeUrl && !(useProfileResume && profileResume?.resumeUrl)) {
        setError("Please upload your resume/CV.");
        return false;
      }

      for (const q of template.generalQuestions) {
        if (!q.required) continue;
        const val = generalAnswers[q.id];
        if (!val || !val.trim()) {
          setError(`Please answer: ${q.title}`);
          return false;
        }
      }
      return true;
    }

    if (stepType === "job") {
      if (coverLetter.length < 50) {
        setError("Cover letter must be at least 50 characters.");
        return false;
      }
      if (jobData?.screeningQuestions && jobData.screeningQuestions.length > 0) {
        const allAnswered = screeningAnswers.every((a) => a.trim() !== "");
        if (!allAnswered) {
          setError("Please answer all screening questions.");
          return false;
        }
      }
      return true;
    }

    if (stepType === "guild") {
      if (!selectedLevel) {
        setError("Please select your experience level.");
        return false;
      }

      const domainLevel =
        template.domainQuestions[
          selectedLevel as keyof typeof template.domainQuestions
        ];
      if (domainLevel) {
        for (const topic of domainLevel.topics) {
          const val = domainAnswers[`domain.${topic.id}`];
          if (!val || !val.trim()) {
            setError(`Please answer the domain question: ${topic.title}`);
            return false;
          }
        }
      }

      if (template.noAiDeclarationText && !noAiDeclaration) {
        setError("Please confirm the no-AI declaration.");
        return false;
      }
      return true;
    }

    return true;
  };

  // --- Navigation ---
  const handleContinue = () => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setError(null);
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setError(null);
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // --- Submission ---
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const candidateEmail = auth.email || "";
      const candidateId = auth.userId;

      // Upload resume if new file was selected and not yet uploaded
      let finalResumeUrl = resumeUrl;
      if (resumeFile && !resumeUrl && candidateId) {
        const result = (await candidateApi.uploadResume(
          candidateId,
          resumeFile
        )) as { resumeUrl: string };
        finalResumeUrl = result.resumeUrl;
      }

      // If using profile resume, use that URL
      if (useProfileResume && profileResume?.resumeUrl) {
        finalResumeUrl = profileResume.resumeUrl;
      }

      // Build answers map combining general + domain answers
      const allAnswers: Record<string, string | string[]> = {
        ...generalAnswers,
        ...domainAnswers,
      };

      const payload: Record<string, unknown> = {
        candidateEmail,
        answers: allAnswers,
        level: selectedLevel || undefined,
        jobId,
        resumeUrl: finalResumeUrl || undefined,
        noAiDeclaration,
      };

      // Include job-specific fields when applying via a job
      if (jobId && hasJobStep) {
        payload.coverLetter = coverLetter;
        if (screeningAnswers.length > 0) {
          payload.screeningAnswers = screeningAnswers;
        }
      }

      await guildsApi.submitApplication(guildId, payload);
      setSuccess(true);
    } catch (err: unknown) {
      console.error("[Guild Application] Error submitting:", err);
      const apiErr = err as { data?: { details?: string; error?: string }; message?: string };
      const message =
        apiErr?.data?.details ||
        apiErr?.data?.error ||
        apiErr?.message ||
        "Failed to submit application.";
      setError(typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  if (isLoading) {
    return null;
  }

  if (error && !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen">
        <nav className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Image
                  src="/Vetted-orange.png"
                  alt="Vetted Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg"
                />
                <span className="text-xl font-bold text-foreground">
                  Vetted
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </nav>
        <ApplicationSuccess guildName={guild?.name || ""} jobId={jobId} />
      </div>
    );
  }

  if (!template) return null;

  const stepType = getStepType(currentStep);

  return (
    <div className="min-h-screen animate-page-enter">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/guilds/${guildId}`)}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Guild
              </button>
              <Image
                src="/Vetted-orange.png"
                alt="Vetted Logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Apply to Join {guild?.name}
              </h1>
              <p className="text-lg text-muted-foreground">
                {template.description ||
                  "Complete the application form below to join this guild"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator + Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Step content with transition */}
        <div className="transition-opacity duration-200">
          {stepType === "resume" && (
            <ResumeAndGeneralStep
              template={template}
              profileResume={profileResume}
              useProfileResume={useProfileResume}
              setUseProfileResume={setUseProfileResume}
              resumeFile={resumeFile}
              resumeUrl={resumeUrl}
              uploadingResume={uploadingResume}
              onResumeSelect={handleResumeSelect}
              onRemoveResume={removeResume}
              generalAnswers={generalAnswers}
              onAnswerChange={(id, value) =>
                setGeneralAnswers((prev) => ({ ...prev, [id]: value }))
              }
              requiredSocialLinks={template.requiredSocialLinks}
              candidateSocialLinks={candidateSocialLinks}
            />
          )}

          {stepType === "job" && jobData && (
            <JobQuestionsStep
              jobTitle={jobData.title}
              coverLetter={coverLetter}
              onCoverLetterChange={setCoverLetter}
              screeningQuestions={jobData.screeningQuestions}
              screeningAnswers={screeningAnswers}
              onScreeningAnswerChange={(index, value) => {
                setScreeningAnswers((prev) => {
                  const updated = [...prev];
                  updated[index] = value;
                  return updated;
                });
              }}
            />
          )}

          {stepType === "guild" && (
            <GuildSpecificsStep
              template={template}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
              requiredLevel={requiredLevel}
              domainAnswers={domainAnswers}
              onDomainAnswerChange={(key, value) =>
                setDomainAnswers((prev) => ({ ...prev, [key]: value }))
              }
              expandedDomain={expandedDomain}
              onExpandDomain={setExpandedDomain}
              noAiDeclaration={noAiDeclaration}
              onNoAiDeclarationChange={setNoAiDeclaration}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border/60 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-4 mt-8">
          <div className="flex gap-4">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                className="flex-1"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/guilds/${guildId}`)}
                className="flex-1"
              >
                Cancel
              </Button>
            )}

            <Button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting || uploadingResume}
              className="flex-1"
              icon={
                isSubmitting ? undefined : isLastStep ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )
              }
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : isLastStep ? (
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
