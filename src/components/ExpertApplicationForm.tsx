"use client";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect, useChainId } from "wagmi";
import { Loader2, Send, Upload, X, ArrowLeft, User, Briefcase, FileText, Award, Shield, Paperclip, CheckCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import { Alert } from "./ui/alert";
import { expertApi, guildsApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";

interface ExpertApplicationFormProps {
  onSuccess?: () => void;
}

const EXPERTISE_LEVELS = [
  { value: "entry", label: "Entry" },
  { value: "experienced", label: "Experienced" },
  { value: "expert", label: "Expert" },
];

const getNetworkName = (chainId: number | undefined) => {
  if (!chainId) return "Unknown";
  const networks: Record<number, string> = {
    1: "Ethereum",
    11155111: "Sepolia",
    137: "Polygon",
    42161: "Arbitrum",
  };
  return networks[chainId] || `Chain ${chainId}`;
};

export function ExpertApplicationForm({ onSuccess }: ExpertApplicationFormProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
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
          setGuildOptions(response.map((g) => ({ id: g.id, name: g.name })));
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
      const response: any = await expertApi.getGuildApplicationTemplate(
        guildId,
        "general"
      );
      if (response?.success) {
        setGeneralTemplate(response.data);
      }
    } catch (err) {
      console.error("Failed to load general template:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadLevelTemplate = async (guildId: string, level: string) => {
    setLoadingTemplates(true);
    try {
      const response: any = await expertApi.getGuildApplicationTemplate(
        guildId,
        "level",
        level
      );
      if (response?.success) {
        setLevelTemplate(response.data);
        if (response.data?.topics) {
          const initAnswers: Record<string, string> = {};
          response.data.topics.forEach((topic: any) => {
            initAnswers[topic.id] = "";
          });
          setLevelAnswers(initAnswers);
        }
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

    if (!resumeFile) {
      setFormError("Please upload your resume/CV (PDF, DOC, or DOCX)");
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
      const expertId = result?.data?.expertId;
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
        router.push("/");
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Thanks for Applying!</h2>
          <p className="text-muted-foreground">
            Your application has been submitted successfully. Guild members will review your
            credentials and you&apos;ll be notified once a decision is made.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {mounted && address && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-mono text-foreground font-medium">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {getNetworkName(chainId)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      clearAllAuthState();
                      disconnect();
                      router.push("/");
                    }}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
            {/* Personal Information Section */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                  <p className="text-sm text-muted-foreground">Tell us about yourself</p>
                </div>
              </div>

            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="John Doe"
              description="Your legal name as it appears on official documents"
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
              description="We'll use this to send you important updates about your application"
              required
            />

            <Input
              label="LinkedIn Profile URL"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => handleChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
              description="Link to your LinkedIn profile for verification"
              required
            />

            <Input
              label="Portfolio / Website URL (Optional)"
              type="url"
              value={formData.portfolioUrl}
              onChange={(e) => handleChange("portfolioUrl", e.target.value)}
              placeholder="https://johndoe.com"
              description="Optional: Link to your personal website, GitHub, or portfolio"
            />

            {/* Resume Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Resume / CV <span className="text-destructive">*</span>
              </label>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setFormError("Resume must be under 5MB");
                    return;
                  }
                  setResumeFile(file);
                  setError(null);
                }}
              />
              {resumeFile ? (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/40">
                  <Paperclip className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {resumeFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(resumeFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeFile(null);
                      if (resumeInputRef.current) resumeInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
                >
                  <Upload className="w-4 h-4" />
                  Click to upload your resume (PDF, DOC, DOCX - max 5MB)
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Upload your resume or CV. Accepted formats: PDF, DOC, DOCX (max 5MB)
              </p>
            </div>
            </div>

            {/* Professional Background Section */}
            <div className="p-8 space-y-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Professional Background</h2>
                  <p className="text-sm text-muted-foreground">Your experience and expertise</p>
                </div>
              </div>

            <NativeSelect
              label="Select Guild"
              value={selectedGuildId}
              onChange={(e) => handleGuildChange(e.target.value)}
              description="Choose ONE guild that best matches your primary expertise area"
              required
            >
              <option value="" disabled>Choose a guild...</option>
              {guildOptions.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              label="Expertise Level"
              value={formData.expertiseLevel}
              onChange={(e) => handleChange("expertiseLevel", e.target.value)}
              description="Select the level that matches your years of experience"
              required
            >
              <option value="" disabled>Choose your level...</option>
              {EXPERTISE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </NativeSelect>

            <Input
              label="Years of Experience"
              type="number"
              value={formData.yearsOfExperience}
              onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
              placeholder="10"
              min="1"
              description="Total years of professional experience in your field"
              required
            />

            <Input
              label="Current Title"
              type="text"
              value={formData.currentTitle}
              onChange={(e) => handleChange("currentTitle", e.target.value)}
              placeholder="Senior Software Engineer"
              description="Your current job title or most recent position"
              required
            />

            <Input
              label="Current Company"
              type="text"
              value={formData.currentCompany}
              onChange={(e) => handleChange("currentCompany", e.target.value)}
              placeholder="Tech Corp"
              description="Your current employer or most recent company"
              required
            />
            </div>

            {/* Areas of Expertise Section */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Areas of Expertise</h2>
                  <p className="text-sm text-muted-foreground">
                    Add specific skills or technologies you can evaluate (e.g., React, Machine Learning, Product Strategy)
                  </p>
                </div>
              </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.newExpertiseArea}
                    onChange={(e) => handleChange("newExpertiseArea", e.target.value)}
                    placeholder="e.g., React, TypeScript, AWS"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExpertiseArea();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddExpertiseArea}
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add specific skills, technologies, or domains you can evaluate (e.g., React, Machine Learning, Product Strategy). Press Enter or click Add to include each one.
              </p>
            </div>

            {formData.expertiseAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.expertiseAreas.map((area, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded-full text-sm"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpertiseArea(index)}
                      className="hover:text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Proposal Guidance */}
            <div className="p-8 space-y-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Before You Start</h2>
                  <p className="text-sm text-muted-foreground">Read this carefully</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {(generalTemplate?.guidance || [
                  "This is not a throwaway application. Take your time.",
                  "Do not use AI. Reviewers will spot it.",
                  "Be honest. Realistic gaps are better than exaggeration.",
                  "Reviewers are staking their reputation. Return the favor.",
                  "If you do not get in, you will receive specific feedback.",
                ]).map((line: string, idx: number) => (
                  <p key={idx}>• {line}</p>
                ))}
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={noAiDeclaration}
                  onChange={(e) => setNoAiDeclaration(e.target.checked)}
                  className="h-4 w-4 rounded border border-border"
                />
                {generalTemplate?.noAiDeclarationText ||
                  "I wrote this myself and did not use AI or automated tools."}
              </label>
            </div>

            {/* General Proposal Questions */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">General Proposal</h2>
                  <p className="text-sm text-muted-foreground">
                    These questions are the same across all guilds
                  </p>
                </div>
              </div>

              {loadingTemplates && !generalTemplate ? (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              ) : !generalTemplate ? (
                <p className="text-sm text-muted-foreground">Select a guild to load the questions.</p>
              ) : (
                (generalTemplate.questions || []).map((question: any) => (
                  <div key={question.id} className="space-y-4 p-4 border border-border rounded-lg bg-card/60">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{question.title}</h3>
                      {question.prompt && (
                        <div className="space-y-2">
                          {question.prompt
                            .split("\n")
                            .map((line: string) => line.trim())
                            .filter(Boolean)
                            .map((line: string, idx: number) => (
                              <p
                                key={idx}
                                className={`text-sm text-muted-foreground ${
                                  idx === 0 ? "" : "pl-5"
                                }`}
                              >
                                {idx === 0 ? line : `• ${line}`}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>

                    {question.parts?.length ? (
                      <div className="space-y-4">
                        {question.parts.map((part: any) => (
                          <Textarea
                            key={part.id}
                            label={part.label}
                            value={
                              question.id === "learning_from_failure"
                                ? (generalAnswers.learningFromFailure as any)[part.id]
                                : question.id === "decision_under_uncertainty"
                                ? (generalAnswers.decisionUnderUncertainty as any)[part.id]
                                : (generalAnswers.motivationAndConflict as any)[part.id]
                            }
                            onChange={(e) => updateGeneralAnswer(question.id, part.id, e.target.value)}
                            placeholder={part.placeholder}
                            rows={3}
                            required
                          />
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        label="Your Answer"
                        value={generalAnswers.guildImprovement}
                        onChange={(e) => updateGeneralAnswer(question.id, null, e.target.value)}
                        placeholder="Be specific about what you'd improve and why."
                        rows={3}
                        required
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Level-Specific Questions */}
            <div className="p-8 space-y-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Level-Specific Questions</h2>
                  <p className="text-sm text-muted-foreground">
                    Based on your selected level
                  </p>
                </div>
              </div>

              {loadingTemplates && !levelTemplate ? (
                <p className="text-sm text-muted-foreground">Loading level questions...</p>
              ) : levelTemplate?.topics?.length ? (
                levelTemplate.topics.map((topic: any) => (
                  <div key={topic.id} className="space-y-4 p-4 border border-border rounded-lg bg-card/60">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{topic.title}</h3>
                      {topic.prompt && (
                        <div className="space-y-2">
                          {topic.prompt
                            .split("\n")
                            .map((line: string) => line.trim())
                            .filter(Boolean)
                            .map((line: string, idx: number) => (
                              <p
                                key={idx}
                                className={`text-sm text-muted-foreground ${
                                  idx === 0 ? "" : "pl-5"
                                }`}
                              >
                                {idx === 0 ? line : `• ${line}`}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>
                    <Textarea
                      label="Your Answer"
                      value={levelAnswers[topic.id] || ""}
                      onChange={(e) => updateLevelAnswer(topic.id, e.target.value)}
                      placeholder="Provide a clear, structured response."
                      rows={4}
                      required
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a guild and level to load the questions.
                </p>
              )}
            </div>

            {/* Bio & Motivation Section */}
            <div className="p-8 space-y-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">About You</h2>
                  <p className="text-sm text-muted-foreground">Share your story and motivation</p>
                </div>
              </div>

            <Textarea
              label="Professional Bio (Optional)"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell us about your professional background, key achievements, and what makes you qualified to be an expert reviewer..."
              description="Optional context about your professional background"
              rows={4}
              maxLength={2000}
            />

            <Textarea
              label="Why do you want to become an expert? (Optional)"
              value={formData.motivation}
              onChange={(e) => handleChange("motivation", e.target.value)}
              placeholder="Explain your motivation for joining Vetted as an expert reviewer, and how you plan to contribute to the guild..."
              description="Optional additional context about your motivation"
              rows={4}
              maxLength={2000}
            />
            </div>

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
