"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { guildsApi, candidateApi, jobsApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useAuthContext } from "@/hooks/useAuthContext";
import type {
  GuildApplicationTemplate,
  SocialLink,
  GuildApplicationGuild,
  GuildApplicationJobData,
  GuildApplicationProfileResume,
} from "@/types";
import { JOB_LEVEL_TO_GUILD_LEVEL } from "@/types";

interface StepDef {
  label: string;
}

export type StepType = "resume" | "job" | "guild";

export interface GuildApplicationFlowState {
  // Route params
  guildId: string;
  jobId: string | undefined;

  // Loading & status
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
  success: boolean;

  // Fetched data
  guild: GuildApplicationGuild | null;
  template: GuildApplicationTemplate | null;
  jobData: GuildApplicationJobData | null;
  profileResume: GuildApplicationProfileResume | null;
  candidateSocialLinks: SocialLink[];

  // Step navigation
  currentStep: number;
  steps: StepDef[];
  hasJobStep: boolean;
  isLastStep: boolean;
  stepType: StepType;

  // Step 1 - Resume & General
  resumeFile: File | null;
  resumeUrl: string;
  useProfileResume: boolean;
  uploadingResume: boolean;
  generalAnswers: Record<string, string>;

  // Step 2 - Job Questions
  coverLetter: string;
  screeningAnswers: string[];

  // Step 3 - Guild Specifics
  selectedLevel: string;
  requiredLevel: string | null;
  domainAnswers: Record<string, string>;
  expandedDomain: string | null;
  noAiDeclaration: boolean;
}

export interface GuildApplicationFlowActions {
  setError: (error: string | null) => void;
  setUseProfileResume: (value: boolean) => void;
  setGeneralAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCoverLetter: (value: string) => void;
  setScreeningAnswers: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedLevel: (value: string) => void;
  setDomainAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpandedDomain: (value: string | null) => void;
  setNoAiDeclaration: (value: boolean) => void;
  handleResumeSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeResume: () => void;
  handleContinue: () => void;
  handleBack: () => void;
  handleStepClick: (step: number) => void;
}

function getStepType(stepIndex: number, hasJobStep: boolean): StepType {
  if (stepIndex === 0) return "resume";
  if (hasJobStep && stepIndex === 1) return "job";
  return "guild";
}

export function useGuildApplicationFlow(): GuildApplicationFlowState & GuildApplicationFlowActions {
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
  const [guild, setGuild] = useState<GuildApplicationGuild | null>(null);
  const [template, setTemplate] = useState<GuildApplicationTemplate | null>(null);
  const [jobData, setJobData] = useState<GuildApplicationJobData | null>(null);
  const [profileResume, setProfileResume] = useState<GuildApplicationProfileResume | null>(null);
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
  const steps: StepDef[] = hasJobStep
    ? [
        { label: "Resume & General" },
        { label: "Job Questions" },
        { label: "Guild Review" },
      ]
    : [{ label: "Resume & General" }, { label: "Guild Review" }];

  const isLastStep = currentStep === steps.length - 1;
  const stepType = getStepType(currentStep, hasJobStep);

  // --- Data fetching ---
  // eslint-disable-next-line no-restricted-syntax -- auth-gated fetch with multiple parallel API calls and complex initialization
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
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const candidateId = auth.userId;

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
        setGuild(results[0].value as GuildApplicationGuild);
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
          const job = results[2].value as GuildApplicationJobData;
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
            if (jobId) {
              router.push(`/browse/jobs/${jobId}`);
            } else {
              setError("You are already a member of this guild.");
            }
            return;
          }
          if (membership.status === "pending") {
            setError("Your application to this guild is already pending review.");
            return;
          }
        }
        // 404 = not a member, which is fine
      }
    } catch (err) {
      logger.error("Failed to load guild application data", err, { silent: true });
      setError(
        (err as Error).message || "Failed to load application form. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize domain answers when level changes
  // eslint-disable-next-line no-restricted-syntax -- syncs domain answer state with selected level from template
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
      logger.error("Failed to upload resume", err, { silent: true });
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

    const currentStepType = getStepType(currentStep, hasJobStep);

    if (currentStepType === "resume") {
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

    if (currentStepType === "job") {
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

    if (currentStepType === "guild") {
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
          if (val.trim().length < 50) {
            setError(`Your answer for "${topic.title}" must be at least 50 characters.`);
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

      let finalResumeUrl = resumeUrl;
      if (resumeFile && !resumeUrl && candidateId) {
        const result = (await candidateApi.uploadResume(
          candidateId,
          resumeFile
        )) as { resumeUrl: string };
        finalResumeUrl = result.resumeUrl;
      }

      if (useProfileResume && profileResume?.resumeUrl) {
        finalResumeUrl = profileResume.resumeUrl;
      }

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

      if (jobId && hasJobStep) {
        payload.coverLetter = coverLetter;
        if (screeningAnswers.length > 0) {
          payload.screeningAnswers = screeningAnswers;
        }
      }

      await guildsApi.submitApplication(guildId, payload);
      setSuccess(true);
    } catch (err: unknown) {
      logger.error("Failed to submit guild application", err, { silent: true });
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

  return {
    // Route params
    guildId,
    jobId,

    // Loading & status
    isLoading,
    error,
    isSubmitting,
    success,

    // Fetched data
    guild,
    template,
    jobData,
    profileResume,
    candidateSocialLinks,

    // Step navigation
    currentStep,
    steps,
    hasJobStep,
    isLastStep,
    stepType,

    // Step 1
    resumeFile,
    resumeUrl,
    useProfileResume,
    uploadingResume,
    generalAnswers,

    // Step 2
    coverLetter,
    screeningAnswers,

    // Step 3
    selectedLevel,
    requiredLevel,
    domainAnswers,
    expandedDomain,
    noAiDeclaration,

    // Actions
    setError,
    setUseProfileResume,
    setGeneralAnswers,
    setCoverLetter,
    setScreeningAnswers,
    setSelectedLevel,
    setDomainAnswers,
    setExpandedDomain,
    setNoAiDeclaration,
    handleResumeSelect,
    removeResume,
    handleContinue,
    handleBack,
    handleStepClick,
  };
}
