"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2, Send, Shield, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { PersonalInfoSection } from "./expert/PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./expert/ProfessionalBackgroundSection";
import { ApplicationQuestionsSection } from "./expert/ApplicationQuestionsSection";
import { expertApi, guildsApi, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { GuildApplicationTemplate, GuildDomainLevel, GuildDomainTopic } from "@/types";

export type FieldErrors = Record<string, string>;

interface ExpertApplicationFormProps {
  onSuccess?: () => void;
}

const EXPERTISE_LEVELS = [
  { value: "entry", label: "Entry" },
  { value: "experienced", label: "Experienced" },
  { value: "expert", label: "Expert" },
];

export function ExpertApplicationForm({ onSuccess }: ExpertApplicationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [guildOptions, setGuildOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [generalTemplate, setGeneralTemplate] = useState<GuildApplicationTemplate | null>(null);
  const [levelTemplate, setLevelTemplate] = useState<GuildDomainLevel | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    linkedinUrl: "",
    portfolioUrl: "",
    guild: "",
    expertiseLevel: "",
    yearsOfExperience: "",
    currentTitle: "",
    currentCompany: "",
    bio: "",
    motivation: "",
    expertiseAreas: [] as string[],
    newExpertiseArea: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect approved experts to dashboard — unless they're applying to a new guild
  const guildParam = searchParams.get("guild");

  useEffect(() => {
    if (!mounted || !isConnected || !address) return;
    const checkExistingProfile = async () => {
      try {
        const result = await expertApi.getProfile(address);
        if (result?.status === "approved") {
          if (guildParam) {
            // Expert is applying to a new guild — pre-fill from existing profile
            setFormData((prev) => ({
              ...prev,
              fullName: result.fullName || prev.fullName,
              email: result.email || prev.email,
              linkedinUrl: result.linkedinUrl || prev.linkedinUrl,
              portfolioUrl: result.portfolioUrl || prev.portfolioUrl,
              currentTitle: result.currentTitle || prev.currentTitle,
              currentCompany: result.currentCompany || prev.currentCompany,
              bio: result.bio || prev.bio,
              motivation: prev.motivation,
              expertiseAreas: Array.isArray(result.expertiseAreas) && result.expertiseAreas.length > 0
                ? result.expertiseAreas
                : prev.expertiseAreas,
            }));
            return; // Don't redirect — let them apply to the new guild
          }
          router.replace("/expert/dashboard");
        } else if (result?.status === "pending") {
          router.replace("/expert/application-pending");
        }
      } catch {
        // 404 = no profile, stay on apply page
      }
    };
    checkExistingProfile();
  }, [mounted, isConnected, address, router, guildParam]);

  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [error]);

  const setFormError = (message: string, details: string[] = []) => {
    setError(message);
    setErrorDetails(details);
  };

  useEffect(() => {
    const loadGuilds = async () => {
      try {
        const response = await guildsApi.getAll();
        if (Array.isArray(response)) {
          const guilds = response.map((g) => ({ id: g.id, name: g.name }));
          setGuildOptions(guilds);

          // Auto-select guild if passed via URL query param
          const guildParam = searchParams.get("guild");
          if (guildParam) {
            const match = guilds.find((g) => g.id === guildParam || g.name === guildParam);
            if (match) {
              setSelectedGuildId(match.id);
              setFormData((prev) => ({ ...prev, guild: match.name }));
            }
          }
        }
      } catch (err) {
        logger.error("Failed to load guilds", err, { silent: true });
        toast.error("Failed to load guilds. Please refresh the page.");
      }
    };

    loadGuilds();
  }, []);

  useEffect(() => {
    if (!selectedGuildId) return;
    loadGeneralTemplate(selectedGuildId);
  }, [selectedGuildId]);

  useEffect(() => {
    if (!selectedGuildId || !formData.expertiseLevel) return;
    loadLevelTemplate(selectedGuildId, formData.expertiseLevel);
  }, [selectedGuildId, formData.expertiseLevel]);

  const [generalAnswers, setGeneralAnswers] = useState({
    learningFromFailure: "",
    decisionUnderUncertainty: "",
    motivationAndConflict: "",
    guildImprovement: "",
  });

  const [levelAnswers, setLevelAnswers] = useState<Record<string, string>>({});
  const [noAiDeclaration, setNoAiDeclaration] = useState(false);

  // Touched state: tracks which fields have been interacted with
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    const allFields: Record<string, boolean> = {
      fullName: true,
      email: true,
      linkedinUrl: true,
      guild: true,
      expertiseLevel: true,
      yearsOfExperience: true,
      currentTitle: true,
      currentCompany: true,
      expertiseAreas: true,
      bio: true,
      motivation: true,
      noAiDeclaration: true,
      generalAnswers: true,
      levelAnswers: true,
    };
    setTouched(allFields);
  }, []);

  // Compute field-level errors
  const fieldErrors = useMemo((): FieldErrors => {
    const errors: FieldErrors = {};

    // Personal info
    if (touched.fullName && (!formData.fullName.trim() || formData.fullName.length < 2)) {
      errors.fullName = "Full name is required (at least 2 characters)";
    }
    if (touched.fullName && formData.fullName.length > 255) {
      errors.fullName = "Full name must not exceed 255 characters";
    }
    if (touched.email) {
      if (!formData.email) {
        errors.email = "Email is required";
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }
    if (touched.linkedinUrl && formData.linkedinUrl && !/^https?:\/\/.+\..+/.test(formData.linkedinUrl)) {
      errors.linkedinUrl = "Must be a valid URL (starting with http:// or https://)";
    }
    if (touched.portfolioUrl && formData.portfolioUrl && !/^https?:\/\/.+\..+/.test(formData.portfolioUrl)) {
      errors.portfolioUrl = "Must be a valid URL (starting with http:// or https://)";
    }

    // Professional background
    if (touched.guild && !selectedGuildId) {
      errors.guild = "Please select a guild";
    }
    if (touched.expertiseLevel && !formData.expertiseLevel) {
      errors.expertiseLevel = "Please select an expertise level";
    }
    if (touched.currentTitle && (!formData.currentTitle.trim() || formData.currentTitle.length < 2)) {
      errors.currentTitle = "Current title is required (at least 2 characters)";
    }
    if (touched.currentCompany && (!formData.currentCompany.trim() || formData.currentCompany.length < 2)) {
      errors.currentCompany = "Current company is required (at least 2 characters)";
    }
    if (touched.expertiseAreas && formData.expertiseAreas.length === 0) {
      errors.expertiseAreas = "Please add at least one area of expertise";
    }

    // Bio & motivation (optional but have min length if provided)
    if (touched.bio && formData.bio.length > 0 && formData.bio.length < 50) {
      errors.bio = `${50 - formData.bio.length} more characters needed (minimum 50)`;
    }
    if (touched.bio && formData.bio.length > 2000) {
      errors.bio = "Must not exceed 2,000 characters";
    }
    if (touched.motivation && formData.motivation.length > 0 && formData.motivation.length < 50) {
      errors.motivation = `${50 - formData.motivation.length} more characters needed (minimum 50)`;
    }
    if (touched.motivation && formData.motivation.length > 2000) {
      errors.motivation = "Must not exceed 2,000 characters";
    }

    // General answers
    if (touched.generalAnswers && generalTemplate) {
      if (!generalAnswers.learningFromFailure.trim()) errors["general.learningFromFailure"] = "This question is required";
      if (!generalAnswers.decisionUnderUncertainty.trim()) errors["general.decisionUnderUncertainty"] = "This question is required";
      if (!generalAnswers.motivationAndConflict.trim()) errors["general.motivationAndConflict"] = "This question is required";
      if (!generalAnswers.guildImprovement.trim()) errors["general.guildImprovement"] = "This question is required";
    }

    // Level answers
    if (touched.levelAnswers && levelTemplate?.topics) {
      for (const topic of levelTemplate.topics) {
        if (!levelAnswers[topic.id]?.trim()) {
          errors[`level.${topic.id}`] = "This question is required";
        }
      }
    }

    // No AI declaration
    if (touched.noAiDeclaration && !noAiDeclaration) {
      errors.noAiDeclaration = "You must confirm this declaration to submit";
    }

    return errors;
  }, [touched, formData, selectedGuildId, generalAnswers, levelAnswers, noAiDeclaration, generalTemplate, levelTemplate]);

  // Check if form is ready for submission (for disabling button)
  const isFormComplete = useMemo(() => {
    if (!formData.fullName.trim() || formData.fullName.length < 2) return false;
    if (!formData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) return false;
    if (!selectedGuildId) return false;
    if (!formData.expertiseLevel) return false;
    if (!formData.currentTitle.trim()) return false;
    if (!formData.currentCompany.trim()) return false;
    if (formData.expertiseAreas.length === 0) return false;
    if (!noAiDeclaration) return false;
    if (formData.bio.length > 0 && formData.bio.length < 50) return false;
    if (formData.motivation.length > 0 && formData.motivation.length < 50) return false;
    // General answers
    if (generalTemplate) {
      if (!generalAnswers.learningFromFailure.trim() ||
          !generalAnswers.decisionUnderUncertainty.trim() ||
          !generalAnswers.motivationAndConflict.trim() ||
          !generalAnswers.guildImprovement.trim()) return false;
    }
    // Level answers
    if (levelTemplate?.topics) {
      for (const topic of levelTemplate.topics) {
        if (!levelAnswers[topic.id]?.trim()) return false;
      }
    }
    return true;
  }, [formData, selectedGuildId, noAiDeclaration, generalAnswers, levelAnswers, generalTemplate, levelTemplate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGuildChange = (guildId: string) => {
    const selected = guildOptions.find((g) => g.id === guildId);
    setSelectedGuildId(guildId);
    setFormData((prev) => ({
      ...prev,
      guild: selected?.name || "",
    }));
  };

  const loadGeneralTemplate = async (guildId: string) => {
    setLoadingTemplates(true);
    try {
      const data = await expertApi.getGuildApplicationTemplate(
        guildId,
        "general"
      );
      setGeneralTemplate(data);
    } catch (err) {
      logger.error("Failed to load general template", err, { silent: true });
      toast.error("Failed to load application template.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadLevelTemplate = async (guildId: string, level: string) => {
    setLoadingTemplates(true);
    try {
      const data = await expertApi.getGuildApplicationTemplate(
        guildId,
        "level",
        level
      );
      // The level template endpoint returns the domain level data
      const domainLevel = (data as GuildApplicationTemplate).domainQuestions?.[level as keyof GuildApplicationTemplate["domainQuestions"]] ?? data as unknown as GuildDomainLevel;
      setLevelTemplate(domainLevel);
      if (domainLevel?.topics) {
        const initAnswers: Record<string, string> = {};
        domainLevel.topics.forEach((topic: GuildDomainTopic) => {
          initAnswers[topic.id] = "";
        });
        setLevelAnswers(initAnswers);
      }
    } catch (err) {
      logger.error("Failed to load level template", err, { silent: true });
      toast.error("Failed to load level template.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const updateGeneralAnswer = (
    questionId: string,
    _partId: string | null,
    value: string
  ) => {
    setGeneralAnswers((prev) => {
      const keyMap: Record<string, keyof typeof prev> = {
        learning_from_failure: "learningFromFailure",
        decision_under_uncertainty: "decisionUnderUncertainty",
        motivation_and_conflict: "motivationAndConflict",
        guild_improvement: "guildImprovement",
      };
      const key = keyMap[questionId];
      if (!key) return prev;
      return { ...prev, [key]: value };
    });
  };

  const updateLevelAnswer = (topicId: string, value: string) => {
    setLevelAnswers((prev) => ({ ...prev, [topicId]: value }));
  };

  const handleAddExpertiseArea = () => {
    if (formData.newExpertiseArea.trim()) {
      setFormData((prev) => ({
        ...prev,
        expertiseAreas: [...prev.expertiseAreas, prev.newExpertiseArea.trim()],
        newExpertiseArea: "",
      }));
    }
  };

  const handleRemoveExpertiseArea = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorDetails([]);

    if (!isConnected || !address) {
      setFormError("Please connect your wallet before submitting");
      return;
    }

    // Mark all fields as touched so inline errors show everywhere
    markAllTouched();

    // Check if there are any validation errors
    // We recompute here since markAllTouched is async via setState
    const hasErrors = !isFormComplete;
    if (hasErrors) {
      setFormError("Please fix the highlighted fields above before submitting");

      // Scroll to the first field with an error
      requestAnimationFrame(() => {
        const firstError = document.querySelector("[data-field-error]");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      return;
    }

    if (!resumeFile) {
      setFormError("Please upload your resume/CV (PDF, DOC, or DOCX)");
      return;
    }

    if (!levelTemplate || !levelTemplate.topics) {
      setFormError("Please select an expertise level to load the guild questions");
      return;
    }

    setIsLoading(true);

    try {
      const result = await expertApi.apply({
        ...formData,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        walletAddress: address,
        applicationResponses: {
          general: {
            learningFromFailure: generalAnswers.learningFromFailure,
            decisionUnderUncertainty: generalAnswers.decisionUnderUncertainty,
            motivationAndConflict: generalAnswers.motivationAndConflict,
            guildImprovement: generalAnswers.guildImprovement,
          },
          level: formData.expertiseLevel,
          domain: {
            topics: levelAnswers,
          },
          noAiDeclaration,
        },
      });

      // Upload resume after expert record is created
      const expertId = (result as { id?: string; expertId?: string })?.expertId ?? (result as { id?: string })?.id;
      if (expertId && resumeFile) {
        await expertApi.uploadResume(expertId, resumeFile);
      }

      localStorage.setItem("expertStatus", "pending");
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        router.push("/expert/application-pending");
      }, 4000);
    } catch (err: unknown) {
      const apiError = err instanceof ApiError ? err : null;
      const responseData = apiError?.data as Record<string, unknown> | undefined;
      const errorsArray = Array.isArray(responseData?.errors) ? responseData.errors : [];
      if (errorsArray.length > 0) {
        const friendlyFieldNames: Record<string, string> = {
          fullName: "Full Name",
          email: "Email",
          linkedinUrl: "LinkedIn URL",
          portfolioUrl: "Portfolio URL",
          guild: "Guild",
          expertiseLevel: "Expertise Level",
          currentTitle: "Current Title",
          currentCompany: "Current Company",
          bio: "Professional Bio",
          motivation: "Motivation",
        };

        const detailLines = errorsArray.map((entry: { path?: string | string[]; message?: string }) => {
          const pathValue = Array.isArray(entry.path)
            ? entry.path.join(".")
            : entry.path || "";
          const fieldLabel = friendlyFieldNames[pathValue] || pathValue;
          // Make backend messages more readable
          let msg = entry.message || "";
          msg = msg.replace(/Too small: expected string to have >=(\d+) characters?/i, (_m: string, n: string) => `Must be at least ${n} characters`);
          msg = msg.replace(/Too big: expected string to have <=(\d+) characters?/i, (_m: string, n: string) => `Must not exceed ${n} characters`);
          msg = msg.replace(/Required/i, "This field is required");
          return fieldLabel ? `${fieldLabel}: ${msg}` : msg;
        });
        setFormError("Please fix the following issues:", detailLines);
        return;
      }
      const validationMessage = (responseData?.message || responseData?.error) as string | undefined;
      setFormError(validationMessage || (err instanceof Error ? err.message : "Failed to submit application. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if expert already exists
  // Remove auto-redirect check - allow pending users to apply to new guilds
  // If approved users land here, they can apply to new guilds too

  if (!isConnected || !address) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert variant="warning">
          Please connect your wallet to apply as an expert.
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Thanks for Applying!</h2>
          <p className="text-muted-foreground">
            Your application has been submitted successfully. Guild members will review your
            credentials and you&apos;ll be notified once a decision is made.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to application status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Apply as an Expert
            </h1>
          <p className="text-muted-foreground">
            Join our expert guild and start earning by reviewing candidates and endorsing top
            talent.
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <form onSubmit={handleSubmit}>
            <PersonalInfoSection
              fullName={formData.fullName}
              email={formData.email}
              linkedinUrl={formData.linkedinUrl}
              portfolioUrl={formData.portfolioUrl}
              onChange={handleChange}
              resumeFile={resumeFile}
              resumeInputRef={resumeInputRef}
              onResumeChange={setResumeFile}
              onError={(msg) => setFormError(msg)}
              clearError={() => setError(null)}
              fieldErrors={fieldErrors}
              onBlur={handleBlur}
            />

            <ProfessionalBackgroundSection
              selectedGuildId={selectedGuildId}
              guildOptions={guildOptions}
              onGuildChange={handleGuildChange}
              expertiseLevel={formData.expertiseLevel}
              yearsOfExperience={formData.yearsOfExperience}
              currentTitle={formData.currentTitle}
              currentCompany={formData.currentCompany}
              expertiseLevels={EXPERTISE_LEVELS}
              expertiseAreas={formData.expertiseAreas}
              newExpertiseArea={formData.newExpertiseArea}
              onChange={handleChange}
              onAddExpertiseArea={handleAddExpertiseArea}
              onRemoveExpertiseArea={handleRemoveExpertiseArea}
              fieldErrors={fieldErrors}
              onBlur={handleBlur}
            />

            <ApplicationQuestionsSection
              generalTemplate={generalTemplate}
              levelTemplate={levelTemplate}
              loadingTemplates={loadingTemplates}
              generalAnswers={generalAnswers}
              levelAnswers={levelAnswers}
              noAiDeclaration={noAiDeclaration}
              onUpdateGeneralAnswer={updateGeneralAnswer}
              onUpdateLevelAnswer={updateLevelAnswer}
              onNoAiDeclarationChange={setNoAiDeclaration}
              bio={formData.bio}
              motivation={formData.motivation}
              onChange={handleChange}
              fieldErrors={fieldErrors}
              onBlur={handleBlur}
            />

            {/* Submit Section */}
            <div className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              <div ref={errorRef}>
                {error && (
                  <div className="mb-4">
                    <Alert variant="error">
                      <div className="space-y-2">
                        <p>{error}</p>
                        {errorDetails.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {errorDetails.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Alert>
                  </div>
                )}
              </div>
              {!isFormComplete && !isLoading && (
                <p className="mb-3 text-sm text-muted-foreground text-center">
                  Please complete all required fields to submit your application.
                </p>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-primary via-accent to-primary/80 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Your application will be reviewed by the founding team. You&apos;ll receive an email once
                approved.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
