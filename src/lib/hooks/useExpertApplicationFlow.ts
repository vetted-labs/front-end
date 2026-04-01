"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useFormPersistence } from "@/lib/hooks/useFormPersistence";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { expertApi, guildsApi, ApiError } from "@/lib/api";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type {
  FieldErrors,
  GuildApplicationTemplate,
  GuildDomainLevel,
  GuildDomainTopic,
  GuildOption,
  GeneralAnswers,
  ExpertiseLevel,
} from "@/types";
import type { PersonalInfoSectionProps } from "@/components/expert/PersonalInfoSection";
import type { ProfessionalBackgroundSectionProps } from "@/components/expert/ProfessionalBackgroundSection";
import type { ApplicationQuestionsSectionProps } from "@/components/expert/ApplicationQuestionsSection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersistedDraft {
  formData: {
    fullName: string;
    email: string;
    linkedinUrl: string;
    portfolioUrl: string;
    guild: string;
    expertiseLevel: string;
    yearsOfExperience: string;
    currentTitle: string;
    currentCompany: string;
    bio: string;
    motivation: string;
    expertiseAreas: string[];
    newExpertiseArea: string;
  };
  generalAnswers: GeneralAnswers;
  levelAnswers: Record<string, string>;
  selectedGuildId: string;
  noAiDeclaration: boolean;
  currentStep: number;
}

interface StepDef {
  label: string;
}

const STEPS: StepDef[] = [
  { label: "Personal Info" },
  { label: "Professional Background" },
  { label: "Application Questions" },
  { label: "Review & Submit" },
];

const EXPERTISE_LEVELS: ExpertiseLevel[] = [
  { value: "entry", label: "Entry" },
  { value: "experienced", label: "Experienced" },
  { value: "expert", label: "Expert" },
];

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseExpertApplicationFlowReturn {
  // Step management
  currentStep: number;
  steps: StepDef[];
  isLastStep: boolean;
  handleContinue: () => void;
  handleBack: () => void;
  handleStepClick: (step: number) => void;

  // Per-step validation
  validateStep: (step: number) => string | null;
  stepErrors: string | null;

  // Loading & status
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  errorDetails: string[];
  errorRef: React.RefObject<HTMLDivElement | null>;
  success: boolean;
  mounted: boolean;

  // Wallet state
  isConnected: boolean;
  address: `0x${string}` | undefined;
  walletSigned: boolean;
  wasEverConnected: boolean;
  isSigning: boolean;
  verificationError: string | null;
  handleVerifyWallet: () => Promise<void>;

  // Draft persistence
  draftRestored: boolean;
  dismissRestored: () => void;

  // Form data
  formData: PersistedDraft["formData"];
  selectedGuildId: string;
  guildOptions: GuildOption[];
  generalTemplate: GuildApplicationTemplate | null;
  levelTemplate: GuildDomainLevel | null;
  loadingTemplates: boolean;
  generalAnswers: GeneralAnswers;
  levelAnswers: Record<string, string>;
  noAiDeclaration: boolean;
  resumeFile: File | null;
  resumeInputRef: React.RefObject<HTMLInputElement | null>;
  fieldErrors: FieldErrors;
  isFormComplete: boolean;

  // Grouped props for step components
  personalInfoProps: PersonalInfoSectionProps;
  professionalBackgroundProps: ProfessionalBackgroundSectionProps;
  applicationQuestionsProps: ApplicationQuestionsSectionProps;

  // Wallet verification step props
  walletVerificationProps: {
    isVerified: boolean;
    isSigning: boolean;
    signingError: string | null;
    onVerify: () => void;
  };

  // Form-level actions
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFormError: (message: string, details?: string[]) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExpertApplicationFlow(
  onSuccess?: () => void
): UseExpertApplicationFlowReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [guildOptions, setGuildOptions] = useState<GuildOption[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [generalTemplate, setGeneralTemplate] = useState<GuildApplicationTemplate | null>(null);
  const [levelTemplate, setLevelTemplate] = useState<GuildDomainLevel | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const {
    isSigning,
    error: verificationError,
    pendingSignature,
    checkVerification,
    signChallenge,
    submitVerification,
  } = useWalletVerification();
  const [walletAlreadyVerified, setWalletAlreadyVerified] = useState(false);
  const [wasEverConnected, setWasEverConnected] = useState(false);
  const walletSigned = !!pendingSignature || walletAlreadyVerified;

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<PersistedDraft["formData"]>({
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
    expertiseAreas: [],
    newExpertiseArea: "",
  });

  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  useMountEffect(() => {
    setMounted(true);
  });

  // -----------------------------------------------------------------------
  // Redirect existing experts unless they're applying to a new guild
  // -----------------------------------------------------------------------
  const guildParam = searchParams.get("guild");
  const applyNew = searchParams.get("apply") === "new";

  // This check is intentionally NOT using useRequireAuth — it verifies expert profile
  // existence and application status (approved/pending), not just authentication.
  // eslint-disable-next-line no-restricted-syntax -- redirects existing experts, depends on wagmi state
  useEffect(() => {
    if (!mounted || !isConnected || !address) return;
    const checkExistingProfile = async () => {
      try {
        const result = await expertApi.getProfile(address);
        const wantsNewGuild = guildParam || applyNew;

        if (result?.status === "approved" || result?.status === "pending") {
          if (wantsNewGuild) {
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
              expertiseAreas:
                Array.isArray(result.expertiseAreas) && result.expertiseAreas.length > 0
                  ? result.expertiseAreas
                  : prev.expertiseAreas,
            }));
            return; // Don't redirect — let them apply to the new guild
          }
          // No explicit intent to apply to a new guild — redirect to appropriate page
          if (result.status === "approved") {
            router.replace("/expert/dashboard");
          } else {
            router.replace("/expert/application-pending");
          }
        }
      } catch {
        // 404 = no profile, stay on apply page
      }
    };
    checkExistingProfile();
  }, [mounted, isConnected, address, router, guildParam, applyNew]);

  // Check if wallet is already verified (returning experts applying to new guild)
  // eslint-disable-next-line no-restricted-syntax -- checks wallet verification after mount
  useEffect(() => {
    if (!mounted || !isConnected || !address) return;
    checkVerification(address).then((verified) => {
      if (verified) setWalletAlreadyVerified(true);
    });
  }, [mounted, isConnected, address, checkVerification]);

  // Track whether wallet was ever connected so we can show disconnect recovery instead of hard-blocking
  // eslint-disable-next-line no-restricted-syntax -- tracks runtime connection state change
  useEffect(() => {
    if (isConnected) setWasEverConnected(true);
  }, [isConnected]);

  // eslint-disable-next-line no-restricted-syntax -- scrolls to error on change
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [error]);

  const setFormError = useCallback((message: string, details: string[] = []) => {
    setError(message);
    setErrorDetails(details);
  }, []);

  // -----------------------------------------------------------------------
  // Load guilds on mount
  // -----------------------------------------------------------------------
  useMountEffect(() => {
    const loadGuilds = async () => {
      try {
        const response = await guildsApi.getAll();
        if (Array.isArray(response)) {
          const guilds = response.map((g) => ({ id: g.id, name: g.name }));
          setGuildOptions(guilds);

          // Auto-select guild if passed via URL query param
          const guildFromUrl = searchParams.get("guild");
          if (guildFromUrl) {
            const match = guilds.find((g) => g.id === guildFromUrl || g.name === guildFromUrl);
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
  });

  // -----------------------------------------------------------------------
  // Template loading
  // -----------------------------------------------------------------------
  // eslint-disable-next-line no-restricted-syntax -- loads template when guild selection changes
  useEffect(() => {
    if (!selectedGuildId) return;
    loadGeneralTemplate(selectedGuildId);
  }, [selectedGuildId]);

  // eslint-disable-next-line no-restricted-syntax -- loads level template when expertise level changes
  useEffect(() => {
    if (!selectedGuildId || !formData.expertiseLevel) return;
    loadLevelTemplate(selectedGuildId, formData.expertiseLevel);
  }, [selectedGuildId, formData.expertiseLevel]);

  const [generalAnswers, setGeneralAnswers] = useState<GeneralAnswers>({
    learningFromFailure: "",
    decisionUnderUncertainty: "",
    motivationAndConflict: "",
    guildImprovement: "",
  });

  const [levelAnswers, setLevelAnswers] = useState<Record<string, string>>({});
  const [noAiDeclaration, setNoAiDeclaration] = useState(false);

  // -----------------------------------------------------------------------
  // Draft persistence — now includes currentStep
  // -----------------------------------------------------------------------
  const { save: saveDraft, clear: clearDraft, wasRestored: draftRestored, dismissRestored } =
    useFormPersistence<PersistedDraft>((draft) => {
      setFormData(draft.formData);
      setGeneralAnswers(draft.generalAnswers);
      setLevelAnswers(draft.levelAnswers);
      if (draft.selectedGuildId) setSelectedGuildId(draft.selectedGuildId);
      setNoAiDeclaration(draft.noAiDeclaration);
      if (typeof draft.currentStep === "number" && draft.currentStep >= 0 && draft.currentStep <= 3) {
        setCurrentStep(draft.currentStep);
      }
    });

  // Save draft whenever user-editable fields change
  // eslint-disable-next-line no-restricted-syntax -- persists form draft to localStorage on field changes
  useEffect(() => {
    if (!mounted) return;
    saveDraft({
      formData,
      generalAnswers,
      levelAnswers,
      selectedGuildId,
      noAiDeclaration,
      currentStep,
    });
  }, [formData, generalAnswers, levelAnswers, selectedGuildId, noAiDeclaration, currentStep, mounted, saveDraft]);

  // -----------------------------------------------------------------------
  // Touched state
  // -----------------------------------------------------------------------
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
      "general.learningFromFailure": true,
      "general.decisionUnderUncertainty": true,
      "general.motivationAndConflict": true,
      "general.guildImprovement": true,
    };
    // Also mark individual level answer fields
    if (levelTemplate?.topics) {
      for (const topic of levelTemplate.topics) {
        allFields[`level.${topic.id}`] = true;
      }
    }
    setTouched(allFields);
  }, [levelTemplate]);

  // Mark fields within a specific step as touched
  const markStepTouched = useCallback(
    (step: number) => {
      setTouched((prev) => {
        const updates: Record<string, boolean> = { ...prev };
        if (step === 0) {
          updates.fullName = true;
          updates.email = true;
          updates.linkedinUrl = true;
          updates.portfolioUrl = true;
        } else if (step === 1) {
          updates.guild = true;
          updates.expertiseLevel = true;
          updates.yearsOfExperience = true;
          updates.currentTitle = true;
          updates.currentCompany = true;
          updates.expertiseAreas = true;
        } else if (step === 2) {
          updates.bio = true;
          updates.motivation = true;
          updates.noAiDeclaration = true;
          updates.generalAnswers = true;
          updates.levelAnswers = true;
          updates["general.learningFromFailure"] = true;
          updates["general.decisionUnderUncertainty"] = true;
          updates["general.motivationAndConflict"] = true;
          updates["general.guildImprovement"] = true;
          if (levelTemplate?.topics) {
            for (const topic of levelTemplate.topics) {
              updates[`level.${topic.id}`] = true;
            }
          }
        }
        return updates;
      });
    },
    [levelTemplate]
  );

  // -----------------------------------------------------------------------
  // Field-level errors (computed)
  // -----------------------------------------------------------------------
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

    // Bio & motivation
    if (touched.bio) {
      if (!formData.bio.trim()) {
        errors.bio = "Professional bio is required";
      } else if (formData.bio.length < 50) {
        errors.bio = `${50 - formData.bio.length} more characters needed (minimum 50)`;
      } else if (formData.bio.length > 2000) {
        errors.bio = "Must not exceed 2,000 characters";
      }
    }
    if (touched.motivation) {
      if (!formData.motivation.trim()) {
        errors.motivation = "Motivation is required";
      } else if (formData.motivation.length < 50) {
        errors.motivation = `${50 - formData.motivation.length} more characters needed (minimum 50)`;
      } else if (formData.motivation.length > 2000) {
        errors.motivation = "Must not exceed 2,000 characters";
      }
    }

    // General answers
    if (generalTemplate) {
      const generalKeys = ["learningFromFailure", "decisionUnderUncertainty", "motivationAndConflict", "guildImprovement"] as const;
      for (const key of generalKeys) {
        const fieldKey = `general.${key}`;
        if (touched[fieldKey] || touched.generalAnswers) {
          const val = generalAnswers[key];
          if (!val.trim()) {
            errors[fieldKey] = "This question is required";
          } else if (val.length < 50) {
            errors[fieldKey] = `${50 - val.length} more characters needed (minimum 50)`;
          }
        }
      }
    }

    // Level answers
    if (levelTemplate?.topics) {
      for (const topic of levelTemplate.topics) {
        const fieldKey = `level.${topic.id}`;
        if (touched[fieldKey] || touched.levelAnswers) {
          const val = levelAnswers[topic.id] || "";
          if (!val.trim()) {
            errors[fieldKey] = "This question is required";
          } else if (val.length < 50) {
            errors[fieldKey] = `${50 - val.length} more characters needed (minimum 50)`;
          }
        }
      }
    }

    // No AI declaration
    if (touched.noAiDeclaration && !noAiDeclaration) {
      errors.noAiDeclaration = "You must confirm this declaration to submit";
    }

    return errors;
  }, [touched, formData, selectedGuildId, generalAnswers, levelAnswers, noAiDeclaration, generalTemplate, levelTemplate]);

  // -----------------------------------------------------------------------
  // isFormComplete — checks full form readiness
  // -----------------------------------------------------------------------
  const isFormComplete = useMemo(() => {
    if (!formData.fullName.trim() || formData.fullName.length < 2) return false;
    if (!formData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) return false;
    if (!selectedGuildId) return false;
    if (!formData.expertiseLevel) return false;
    if (!formData.currentTitle.trim()) return false;
    if (!formData.currentCompany.trim()) return false;
    if (formData.expertiseAreas.length === 0) return false;
    if (!noAiDeclaration) return false;
    if (!walletSigned) return false;
    if (formData.bio.length < 50) return false;
    if (formData.motivation.length < 50) return false;
    if (generalTemplate) {
      if (
        generalAnswers.learningFromFailure.trim().length < 50 ||
        generalAnswers.decisionUnderUncertainty.trim().length < 50 ||
        generalAnswers.motivationAndConflict.trim().length < 50 ||
        generalAnswers.guildImprovement.trim().length < 50
      )
        return false;
    }
    if (levelTemplate?.topics) {
      for (const topic of levelTemplate.topics) {
        if ((levelAnswers[topic.id] || "").trim().length < 50) return false;
      }
    }
    return true;
  }, [formData, selectedGuildId, noAiDeclaration, walletSigned, generalAnswers, levelAnswers, generalTemplate, levelTemplate]);

  // -----------------------------------------------------------------------
  // Per-step validation
  // -----------------------------------------------------------------------
  const validateStep = useCallback(
    (step: number): string | null => {
      if (step === 0) {
        if (!formData.fullName.trim() || formData.fullName.length < 2)
          return "Full name is required (at least 2 characters)";
        if (!formData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email))
          return "Please enter a valid email address";
        if (!resumeFile) return "Please upload your resume/CV (PDF, DOC, or DOCX)";
        return null;
      }

      if (step === 1) {
        if (!selectedGuildId) return "Please select a guild";
        if (!formData.expertiseLevel) return "Please select an expertise level";
        if (!formData.currentTitle.trim() || formData.currentTitle.length < 2)
          return "Current title is required (at least 2 characters)";
        if (!formData.currentCompany.trim() || formData.currentCompany.length < 2)
          return "Current company is required (at least 2 characters)";
        if (formData.expertiseAreas.length === 0)
          return "Please add at least one area of expertise";
        return null;
      }

      if (step === 2) {
        if (formData.bio.length < 50) return "Professional bio must be at least 50 characters";
        if (formData.motivation.length < 50) return "Motivation must be at least 50 characters";
        if (!noAiDeclaration) return "You must confirm the no-AI declaration";
        // General answers
        if (generalTemplate) {
          const generalKeys = ["learningFromFailure", "decisionUnderUncertainty", "motivationAndConflict", "guildImprovement"] as const;
          for (const key of generalKeys) {
            if (generalAnswers[key].trim().length < 50)
              return `All general questions require answers of at least 50 characters`;
          }
        }
        // Level answers
        if (levelTemplate?.topics) {
          for (const topic of levelTemplate.topics) {
            if ((levelAnswers[topic.id] || "").trim().length < 50)
              return `All level-specific questions require answers of at least 50 characters`;
          }
        }
        return null;
      }

      if (step === 3) {
        if (!walletSigned) return "Please verify your wallet ownership before submitting";
        return null;
      }

      return null;
    },
    [formData, selectedGuildId, resumeFile, noAiDeclaration, walletSigned, generalAnswers, levelAnswers, generalTemplate, levelTemplate]
  );

  const [stepErrors, setStepErrors] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Field change handlers
  // -----------------------------------------------------------------------
  const handleChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGuildChange = useCallback(
    (guildId: string) => {
      const selected = guildOptions.find((g) => g.id === guildId);
      setSelectedGuildId(guildId);
      setFormData((prev) => ({
        ...prev,
        guild: selected?.name || "",
      }));
    },
    [guildOptions]
  );

  const loadGeneralTemplate = async (guildId: string) => {
    setLoadingTemplates(true);
    try {
      const data = await expertApi.getGuildApplicationTemplate(guildId, "general");
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
      const data = await expertApi.getGuildApplicationTemplate(guildId, "level", level);
      const domainLevel =
        (data as GuildApplicationTemplate).domainQuestions?.[level as keyof GuildApplicationTemplate["domainQuestions"]] ??
        (data as unknown as GuildDomainLevel);
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

  const updateGeneralAnswer = useCallback(
    (questionId: string, _partId: string | null, value: string) => {
      setGeneralAnswers((prev) => {
        const keyMap: Record<string, keyof GeneralAnswers> = {
          learning_from_failure: "learningFromFailure",
          decision_under_uncertainty: "decisionUnderUncertainty",
          motivation_and_conflict: "motivationAndConflict",
          guild_improvement: "guildImprovement",
        };
        const key = keyMap[questionId];
        if (!key) return prev;
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const updateLevelAnswer = useCallback((topicId: string, value: string) => {
    setLevelAnswers((prev) => ({ ...prev, [topicId]: value }));
  }, []);

  const handleAddExpertiseArea = useCallback(() => {
    if (formData.newExpertiseArea.trim()) {
      setFormData((prev) => ({
        ...prev,
        expertiseAreas: [...prev.expertiseAreas, prev.newExpertiseArea.trim()],
        newExpertiseArea: "",
      }));
    }
  }, [formData.newExpertiseArea]);

  const handleRemoveExpertiseArea = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.filter((_, i) => i !== index),
    }));
  }, []);

  const handleVerifyWallet = useCallback(async () => {
    if (!address) return;
    await signChallenge(address);
  }, [address, signChallenge]);

  // -----------------------------------------------------------------------
  // Step navigation
  // -----------------------------------------------------------------------
  const isLastStep = currentStep === STEPS.length - 1;

  const handleContinue = useCallback(() => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      markStepTouched(currentStep);
      setStepErrors(validationError);
      setFormError(validationError);
      return;
    }
    setStepErrors(null);
    setError(null);
    setErrorDetails([]);

    if (isLastStep) {
      // Trigger form submission — the orchestrator will call handleSubmit
      // We fire a synthetic form event since the submit handler expects one
      handleSubmitInternal();
    } else {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, isLastStep, validateStep, markStepTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setError(null);
      setErrorDetails([]);
      setStepErrors(null);
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      // Only allow jumping to completed (earlier) steps
      if (step < currentStep) {
        setError(null);
        setErrorDetails([]);
        setStepErrors(null);
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentStep]
  );

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------
  const handleSubmitInternal = async () => {
    setError(null);
    setErrorDetails([]);

    if (!isConnected || !address) {
      setFormError("Please connect your wallet before submitting");
      return;
    }

    // Mark all fields as touched so inline errors show everywhere
    markAllTouched();

    const hasErrors = !isFormComplete;
    if (hasErrors) {
      setFormError("Please fix the highlighted fields above before submitting");
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

      const expertId = (result as { id?: string; expertId?: string })?.expertId ?? (result as { id?: string })?.id;

      // Submit the pre-signed SIWE signature now that the expert row exists
      if (address && pendingSignature) {
        await submitVerification(address);
      }

      // Upload resume (non-blocking — application already succeeded)
      if (expertId && resumeFile) {
        try {
          await expertApi.uploadResume(expertId, resumeFile);
        } catch (uploadErr) {
          logger.warn("Resume upload failed — application still submitted", uploadErr);
          toast.error("Resume upload failed. You can re-upload from your profile later.");
        }
      }

      clearDraft();
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
          const pathValue = Array.isArray(entry.path) ? entry.path.join(".") : entry.path || "";
          const fieldLabel = friendlyFieldNames[pathValue] || pathValue;
          let msg = entry.message || "";
          msg = msg.replace(/Too small: expected string to have >=(\d+) characters?/i, (_m: string, n: string) => `Must be at least ${n} characters`);
          msg = msg.replace(/Too big: expected string to have <=(\d+) characters?/i, (_m: string, n: string) => `Must not exceed ${n} characters`);
          msg = msg.replace(/Too small: expected number to be >=(\d+)/i, (_m: string, n: string) => `Must be at least ${n}`);
          msg = msg.replace(/Too big: expected number to be <=(\d+)/i, (_m: string, n: string) => `Must not exceed ${n}`);
          msg = msg.replace(/Required/i, "This field is required");
          return fieldLabel ? `${fieldLabel}: ${msg}` : msg;
        });
        setFormError("Please fix the following issues:", detailLines);
        return;
      }
      const validationMessage = (responseData?.message || responseData?.error) as string | undefined;
      setFormError(
        validationMessage || (err instanceof Error ? err.message : "Failed to submit application. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Public-facing handleSubmit that accepts a form event (for backward compatibility)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSubmitInternal();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConnected, address, isFormComplete, resumeFile, levelTemplate, formData, generalAnswers, levelAnswers, noAiDeclaration, pendingSignature, walletSigned, clearDraft, markAllTouched, onSuccess, router, submitVerification]
  );

  // -----------------------------------------------------------------------
  // Grouped props for step components
  // -----------------------------------------------------------------------
  const personalInfoProps: PersonalInfoSectionProps = useMemo(
    () => ({
      fullName: formData.fullName,
      email: formData.email,
      linkedinUrl: formData.linkedinUrl,
      portfolioUrl: formData.portfolioUrl,
      onChange: handleChange,
      resumeFile,
      resumeInputRef,
      onResumeChange: setResumeFile,
      onError: (msg: string) => setFormError(msg),
      clearError: () => setError(null),
      fieldErrors,
      onBlur: handleBlur,
    }),
    [formData.fullName, formData.email, formData.linkedinUrl, formData.portfolioUrl, handleChange, resumeFile, resumeInputRef, fieldErrors, handleBlur, setFormError]
  );

  const professionalBackgroundProps: ProfessionalBackgroundSectionProps = useMemo(
    () => ({
      selectedGuildId,
      guildOptions,
      onGuildChange: handleGuildChange,
      expertiseLevel: formData.expertiseLevel,
      yearsOfExperience: formData.yearsOfExperience,
      currentTitle: formData.currentTitle,
      currentCompany: formData.currentCompany,
      expertiseLevels: EXPERTISE_LEVELS,
      expertiseAreas: formData.expertiseAreas,
      newExpertiseArea: formData.newExpertiseArea,
      onChange: handleChange,
      onAddExpertiseArea: handleAddExpertiseArea,
      onRemoveExpertiseArea: handleRemoveExpertiseArea,
      fieldErrors,
      onBlur: handleBlur,
    }),
    [selectedGuildId, guildOptions, handleGuildChange, formData.expertiseLevel, formData.yearsOfExperience, formData.currentTitle, formData.currentCompany, formData.expertiseAreas, formData.newExpertiseArea, handleChange, handleAddExpertiseArea, handleRemoveExpertiseArea, fieldErrors, handleBlur]
  );

  const applicationQuestionsProps: ApplicationQuestionsSectionProps = useMemo(
    () => ({
      generalTemplate,
      levelTemplate,
      loadingTemplates,
      generalAnswers,
      levelAnswers,
      noAiDeclaration,
      onUpdateGeneralAnswer: updateGeneralAnswer,
      onUpdateLevelAnswer: updateLevelAnswer,
      onNoAiDeclarationChange: setNoAiDeclaration,
      bio: formData.bio,
      motivation: formData.motivation,
      onChange: handleChange,
      fieldErrors,
      onBlur: handleBlur,
    }),
    [generalTemplate, levelTemplate, loadingTemplates, generalAnswers, levelAnswers, noAiDeclaration, updateGeneralAnswer, updateLevelAnswer, formData.bio, formData.motivation, handleChange, fieldErrors, handleBlur]
  );

  const walletVerificationProps = useMemo(
    () => ({
      isVerified: walletSigned,
      isSigning,
      signingError: verificationError,
      onVerify: handleVerifyWallet,
    }),
    [walletSigned, isSigning, verificationError, handleVerifyWallet]
  );

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------
  return {
    // Step management
    currentStep,
    steps: STEPS,
    isLastStep,
    handleContinue,
    handleBack,
    handleStepClick,

    // Per-step validation
    validateStep,
    stepErrors,

    // Loading & status
    isLoading,
    isSubmitting: isLoading,
    error,
    errorDetails,
    errorRef,
    success,
    mounted,

    // Wallet state
    isConnected,
    address,
    walletSigned,
    wasEverConnected,
    isSigning,
    verificationError,
    handleVerifyWallet,

    // Draft persistence
    draftRestored,
    dismissRestored,

    // Form data
    formData,
    selectedGuildId,
    guildOptions,
    generalTemplate,
    levelTemplate,
    loadingTemplates,
    generalAnswers,
    levelAnswers,
    noAiDeclaration,
    resumeFile,
    resumeInputRef,
    fieldErrors,
    isFormComplete,

    // Grouped props for step components
    personalInfoProps,
    professionalBackgroundProps,
    applicationQuestionsProps,
    walletVerificationProps,

    // Form-level actions
    handleSubmit,
    setFormError,
  };
}
