"use client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Shield,
  Send,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LoadingState, Alert, Button, Input } from "@/components/ui";
import { guildsApi, candidateApi } from "@/lib/api";

interface QuestionPart {
  id: string;
  label: string;
  placeholder: string;
}

interface GeneralQuestion {
  id: string;
  title: string;
  prompt: string;
  parts: QuestionPart[] | null;
  required: boolean;
  scored: boolean;
  maxPoints: number | null;
}

interface DomainTopic {
  id: string;
  title: string;
  prompt: string;
}

interface DomainLevel {
  templateName: string;
  description: string;
  totalPoints: number | null;
  topics: DomainTopic[];
}

interface LevelOption {
  id: string;
  label: string;
  description: string;
}

interface FullTemplate {
  templateName: string;
  description: string;
  guidance: string[];
  noAiDeclarationText: string | null;
  requiresResume: boolean;
  generalQuestions: GeneralQuestion[];
  levels: LevelOption[];
  domainQuestions: {
    entry: DomainLevel | null;
    experienced: DomainLevel | null;
    expert: DomainLevel | null;
  };
}

interface Guild {
  id: string;
  name: string;
  description: string;
}

export default function GuildApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = params.guildId as string;
  const jobId = searchParams.get("jobId") || undefined;

  const [guild, setGuild] = useState<Guild | null>(null);
  const [template, setTemplate] = useState<FullTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [noAiDeclaration, setNoAiDeclaration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [requiredLevel, setRequiredLevel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push(`/auth/signup?redirect=/guilds/${guildId}/apply`);
      return;
    }
    fetchApplicationTemplate();
  }, [guildId]);

  const fetchApplicationTemplate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [guildData, templateData]: any[] = await Promise.all([
        guildsApi.getPublicDetail(guildId),
        guildsApi.getApplicationTemplate(guildId, jobId),
      ]);

      setGuild(guildData);
      setTemplate(templateData);

      // If the backend returned a required level (from job's experience level), lock it
      if (templateData.requiredLevel) {
        setRequiredLevel(templateData.requiredLevel);
        setSelectedLevel(templateData.requiredLevel);
      }

      // Initialize answers for general questions
      const initialAnswers: Record<string, string | string[]> = {};
      if (templateData.generalQuestions) {
        templateData.generalQuestions.forEach((q: GeneralQuestion) => {
          if (q.parts) {
            q.parts.forEach((p: QuestionPart) => {
              initialAnswers[`${q.id}.${p.id}`] = "";
            });
          } else {
            initialAnswers[q.id] = "";
          }
        });
      }
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("[Guild Application] Error loading template:", err);
      setError("Failed to load application form. Please try again.");
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

    setAnswers((prev) => {
      const updated = { ...prev };
      domainLevel.topics.forEach((topic) => {
        const key = `domain.${topic.id}`;
        if (!(key in updated)) {
          updated[key] = "";
        }
      });
      return updated;
    });
    // Auto-expand first topic
    if (domainLevel.topics.length > 0) {
      setExpandedDomain(domainLevel.topics[0].id);
    }
  }, [selectedLevel, template]);

  const handleResumeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Upload immediately
    const candidateId = localStorage.getItem("candidateId");
    if (!candidateId) return;

    setUploadingResume(true);
    try {
      const result: any = await candidateApi.uploadResume(candidateId, file);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): boolean => {
    if (!template) return false;

    // Validate resume
    if (template.requiresResume && !resumeUrl) {
      setError("Please upload your resume/CV.");
      return false;
    }

    // Validate general questions
    for (const q of template.generalQuestions) {
      if (!q.required) continue;
      if (q.parts) {
        for (const part of q.parts) {
          const val = answers[`${q.id}.${part.id}`];
          if (!val || (typeof val === "string" && !val.trim())) {
            setError(`Please complete: ${q.title} — ${part.label}`);
            return false;
          }
        }
      } else {
        const val = answers[q.id];
        if (!val || (typeof val === "string" && !val.trim())) {
          setError(`Please answer: ${q.title}`);
          return false;
        }
      }
    }

    // Validate level selection
    if (!selectedLevel) {
      setError("Please select your experience level.");
      return false;
    }

    // Validate domain questions
    const domainLevel =
      template.domainQuestions[
        selectedLevel as keyof typeof template.domainQuestions
      ];
    if (domainLevel) {
      for (const topic of domainLevel.topics) {
        const val = answers[`domain.${topic.id}`];
        if (!val || (typeof val === "string" && !val.trim())) {
          setError(`Please answer the domain question: ${topic.title}`);
          return false;
        }
      }
    }

    // Validate no-AI declaration
    if (template.noAiDeclarationText && !noAiDeclaration) {
      setError("Please confirm the no-AI declaration.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const candidateEmail =
        localStorage.getItem("candidateEmail") || "";

      await guildsApi.submitApplication(guildId, {
        candidateEmail,
        answers,
        level: selectedLevel,
        jobId,
        resumeUrl,
        noAiDeclaration,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("[Guild Application] Error submitting:", err);
      const message =
        err?.data?.error || err?.message || "Failed to submit application.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading application form..." />;
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your application to join <strong>{guild?.name}</strong> has been
            submitted successfully. Our expert members will review it and get
            back to you soon.
          </p>
          <Button onClick={() => router.push(`/guilds/${guildId}`)}>
            Back to Guild Page
          </Button>
        </div>
      </div>
    );
  }

  const currentDomainLevel = selectedLevel
    ? template?.domainQuestions[
        selectedLevel as keyof typeof template.domainQuestions
      ]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
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
                {template?.description ||
                  "Complete the application form below to join this guild"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Guidance */}
          {template?.guidance && template.guidance.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-foreground mb-3">
                Before You Start
              </h3>
              <ul className="space-y-2">
                {template.guidance.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {/* Resume Upload */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Resume / CV <span className="text-destructive">*</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your resume so reviewers can evaluate your background.
              PDF, DOC, or DOCX (max 5MB).
            </p>

            {resumeFile ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border">
                <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {resumeFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(resumeFile.size / 1024).toFixed(0)} KB
                    {uploadingResume
                      ? " — Uploading..."
                      : resumeUrl
                        ? " — Uploaded"
                        : ""}
                  </p>
                </div>
                {!uploadingResume && (
                  <button
                    type="button"
                    onClick={removeResume}
                    className="p-1 hover:bg-background rounded"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Click to upload your resume
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, or DOCX up to 5MB
                  </p>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeSelect}
              className="hidden"
            />
          </div>

          {/* General Questions */}
          {template?.generalQuestions &&
            template.generalQuestions.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    General Questions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    These questions assess your professional maturity and
                    judgment.
                  </p>
                </div>

                {template.generalQuestions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="space-y-4 pt-6 first:pt-0 border-t first:border-t-0 border-border"
                  >
                    <div>
                      <h3 className="text-base font-medium text-foreground">
                        {qIndex + 1}. {q.title}
                        {q.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {q.prompt}
                      </p>
                    </div>

                    {q.parts ? (
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        {q.parts.map((part) => (
                          <div key={part.id} className="space-y-2">
                            <label className="block text-sm font-medium text-card-foreground">
                              {part.label}
                            </label>
                            <textarea
                              value={
                                (answers[`${q.id}.${part.id}`] as string) || ""
                              }
                              onChange={(e) =>
                                updateAnswer(
                                  `${q.id}.${part.id}`,
                                  e.target.value
                                )
                              }
                              placeholder={part.placeholder}
                              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                              rows={4}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        value={(answers[q.id] as string) || ""}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                        placeholder="Your answer..."
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={6}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* Experience Level Selection */}
          {template?.levels && template.levels.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-8">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Experience Level{" "}
                <span className="text-destructive">*</span>
              </h2>
              {requiredLevel ? (
                <p className="text-sm text-muted-foreground mb-4">
                  The experience level is determined by the job you&apos;re applying for.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Select the level that best matches your experience. This
                  determines the domain-specific questions you&apos;ll answer.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {template.levels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => !requiredLevel && setSelectedLevel(level.id)}
                    disabled={!!requiredLevel && level.id !== requiredLevel}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedLevel === level.id
                        ? "border-primary bg-primary/10"
                        : requiredLevel && level.id !== requiredLevel
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="font-medium text-foreground">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {level.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Domain Questions */}
          {currentDomainLevel && currentDomainLevel.topics.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {currentDomainLevel.templateName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentDomainLevel.description}
                </p>
              </div>

              {currentDomainLevel.topics.map((topic, tIndex) => {
                const isExpanded = expandedDomain === topic.id;
                const answerKey = `domain.${topic.id}`;
                const answerValue = (answers[answerKey] as string) || "";

                return (
                  <div
                    key={topic.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDomain(isExpanded ? null : topic.id)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {tIndex + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">
                            {topic.title}
                          </span>
                          {answerValue.trim() && (
                            <span className="ml-2 text-xs text-green-600">
                              Answered
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 rounded-lg p-4">
                          {topic.prompt}
                        </div>
                        <textarea
                          value={answerValue}
                          onChange={(e) =>
                            updateAnswer(answerKey, e.target.value)
                          }
                          placeholder="Your answer..."
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          rows={8}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No-AI Declaration */}
          {template?.noAiDeclarationText && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noAiDeclaration}
                  onChange={(e) => setNoAiDeclaration(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {template.noAiDeclarationText}{" "}
                  <span className="text-destructive">*</span>
                </span>
              </label>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/guilds/${guildId}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingResume}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
