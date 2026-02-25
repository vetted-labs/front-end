"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2, Send, Shield, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { PersonalInfoSection } from "./expert/PersonalInfoSection";
import { ProfessionalBackgroundSection } from "./expert/ProfessionalBackgroundSection";
import { ProposalQuestionsSection } from "./expert/ProposalQuestionsSection";
import { expertApi, guildsApi } from "@/lib/api";

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
  const [generalTemplate, setGeneralTemplate] = useState<any>(null);
  const [levelTemplate, setLevelTemplate] = useState<any>(null);
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

  // Redirect approved experts to dashboard instead of showing the apply form
  useEffect(() => {
    if (!mounted || !isConnected || !address) return;
    const checkExistingProfile = async () => {
      try {
        const result: any = await expertApi.getProfile(address);
        if (result?.status === "approved") {
          router.replace("/expert/dashboard");
        } else if (result?.status === "pending") {
          router.replace("/expert/application-pending");
        }
      } catch {
        // 404 = no profile, stay on apply page
      }
    };
    checkExistingProfile();
  }, [mounted, isConnected, address, router]);

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
        const response: any = await guildsApi.getAll();
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
        console.error("Failed to load guilds:", err);
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
    learningFromFailure: { event: "", response: "", pivot: "" },
    decisionUnderUncertainty: { constraints: "", logic: "", reflection: "" },
    motivationAndConflict: { driver: "", friction: "" },
    guildImprovement: "",
  });

  const [levelAnswers, setLevelAnswers] = useState<Record<string, string>>({});
  const [noAiDeclaration, setNoAiDeclaration] = useState(false);

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
      const data: any = await expertApi.getGuildApplicationTemplate(
        guildId,
        "general"
      );
      setGeneralTemplate(data);
    } catch (err) {
      console.error("Failed to load general template:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadLevelTemplate = async (guildId: string, level: string) => {
    setLoadingTemplates(true);
    try {
      const data: any = await expertApi.getGuildApplicationTemplate(
        guildId,
        "level",
        level
      );
      setLevelTemplate(data);
      if (data?.topics) {
        const initAnswers: Record<string, string> = {};
        data.topics.forEach((topic: any) => {
          initAnswers[topic.id] = "";
        });
        setLevelAnswers(initAnswers);
      }
    } catch (err) {
      console.error("Failed to load level template:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const updateGeneralAnswer = (
    questionId: string,
    partId: string | null,
    value: string
  ) => {
    setGeneralAnswers((prev) => {
      if (questionId === "learning_from_failure") {
        return {
          ...prev,
          learningFromFailure: {
            ...prev.learningFromFailure,
            [partId || "event"]: value,
          },
        };
      }
      if (questionId === "decision_under_uncertainty") {
        return {
          ...prev,
          decisionUnderUncertainty: {
            ...prev.decisionUnderUncertainty,
            [partId || "constraints"]: value,
          },
        };
      }
      if (questionId === "motivation_and_conflict") {
        return {
          ...prev,
          motivationAndConflict: {
            ...prev.motivationAndConflict,
            [partId || "driver"]: value,
          },
        };
      }
      if (questionId === "guild_improvement") {
        return {
          ...prev,
          guildImprovement: value,
        };
      }
      return prev;
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

    // Frontend validation
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setFormError("Full name must be at least 2 characters");
      return;
    }
    if (formData.fullName.length > 255) {
      setFormError("Full name must not exceed 255 characters");
      return;
    }
    // 🔐 SECURITY: Robust email validation
    if (!formData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      setFormError("Please enter a valid email address");
      return;
    }
    // 🔐 SECURITY: URL validation for LinkedIn
    if (formData.linkedinUrl && !/^https?:\/\/.+\..+/.test(formData.linkedinUrl)) {
      setFormError("Please enter a valid LinkedIn URL starting with http:// or https://");
      return;
    }
    // URL validation for portfolio
    if (formData.portfolioUrl && !/^https?:\/\/.+\..+/.test(formData.portfolioUrl)) {
      setFormError("Please enter a valid portfolio URL starting with http:// or https://");
      return;
    }
    if (!formData.guild.trim() || formData.guild.length < 2) {
      setFormError("Guild must be at least 2 characters");
      return;
    }
    if (!formData.expertiseLevel.trim()) {
      setFormError("Please select an expertise level");
      return;
    }
    if (!formData.currentTitle.trim() || formData.currentTitle.length < 2) {
      setFormError("Current title must be at least 2 characters");
      return;
    }
    if (!formData.currentCompany.trim() || formData.currentCompany.length < 2) {
      setFormError("Current company must be at least 2 characters");
      return;
    }
    if (formData.bio && formData.bio.length > 0 && formData.bio.length < 50) {
      setFormError("Bio must be at least 50 characters or left blank");
      return;
    }
    if (formData.bio.length > 2000) {
      setFormError("Bio must not exceed 2000 characters");
      return;
    }
    if (
      formData.motivation &&
      formData.motivation.length > 0 &&
      formData.motivation.length < 50
    ) {
      setFormError("Motivation must be at least 50 characters or left blank");
      return;
    }
    if (formData.motivation.length > 2000) {
      setFormError("Motivation must not exceed 2000 characters");
      return;
    }
    if (formData.expertiseAreas.length === 0) {
      setFormError("Please add at least one area of expertise");
      return;
    }
    if (!selectedGuildId) {
      setFormError("Please select a guild");
      return;
    }
    if (!noAiDeclaration) {
      setFormError("Please confirm you did not use AI");
      return;
    }

    const generalMissing =
      !generalAnswers.learningFromFailure.event.trim() ||
      !generalAnswers.learningFromFailure.response.trim() ||
      !generalAnswers.learningFromFailure.pivot.trim() ||
      !generalAnswers.decisionUnderUncertainty.constraints.trim() ||
      !generalAnswers.decisionUnderUncertainty.logic.trim() ||
      !generalAnswers.decisionUnderUncertainty.reflection.trim() ||
      !generalAnswers.motivationAndConflict.driver.trim() ||
      !generalAnswers.motivationAndConflict.friction.trim() ||
      !generalAnswers.guildImprovement.trim();

    if (generalMissing) {
      setFormError("Please complete all general proposal questions");
      return;
    }

    if (!levelTemplate || !levelTemplate.topics) {
      setFormError("Please select a level to load the guild questions");
      return;
    }

    const missingTopic = levelTemplate.topics.find(
      (topic: any) => !levelAnswers[topic.id]?.trim()
    );

    if (missingTopic) {
      setFormError("Please complete all level-specific questions");
      return;
    }

    setIsLoading(true);

    try {
      const result: any = await expertApi.apply({
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
      const expertId = result?.expertId;
      if (expertId && resumeFile) {
        try {
          await expertApi.uploadResume(expertId, resumeFile);
        } catch (uploadErr) {
          console.error("Resume upload failed:", uploadErr);
          // Don't block submission if resume upload fails
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        router.push("/expert/application-pending");
      }, 4000);
    } catch (err: any) {
      const apiError = err as any;
      const responseData = apiError?.response?.data || apiError?.data;
      const errorsArray = Array.isArray(responseData?.errors) ? responseData.errors : [];
      if (errorsArray.length > 0) {
        const detailLines = errorsArray.map((entry: any) => {
          const pathValue = Array.isArray(entry.path)
            ? entry.path.join(".")
            : entry.path || "";
          return pathValue ? `${pathValue}: ${entry.message}` : entry.message;
        });
        setFormError("Please fix the fields below.", detailLines);
        return;
      }
      const validationMessage = responseData?.message || responseData?.error;
      setFormError(validationMessage || apiError?.message || "Failed to submit application");
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
    <div className="min-h-full">
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
            />

            <ProposalQuestionsSection
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
