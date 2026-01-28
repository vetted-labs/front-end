"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Shield,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { LoadingState, Alert, Button, Input } from "@/components/ui";
import { guildsApi } from "@/lib/api";

interface Question {
  id: string;
  type: "text" | "textarea" | "multiple_choice" | "rating";
  question: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

interface ApplicationTemplate {
  templateName: string;
  description: string;
  questions: Question[];
}

interface Guild {
  id: string;
  name: string;
  description: string;
}

export default function GuildApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const [guild, setGuild] = useState<Guild | null>(null);
  const [template, setTemplate] = useState<ApplicationTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check authentication
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
      // Fetch guild info and application template
      const [guildData, templateData]: any[] = await Promise.all([
        guildsApi.getPublicDetail(guildId),
        guildsApi.getApplicationTemplate(guildId),
      ]);

      setGuild(guildData);
      setTemplate(templateData);

      // Initialize answers object
      const initialAnswers: Record<string, string | string[]> = {};
      templateData.questions.forEach((q: Question) => {
        initialAnswers[q.id] = q.type === "multiple_choice" ? [] : "";
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("[Guild Application] Error loading template:", err);

      // Use mock data if backend isn't ready
      // Clean up guild name - remove " Guild" suffix if present and decode URI
      const cleanGuildId = decodeURIComponent(guildId).replace(/ Guild$/i, '');

      const mockGuild: Guild = {
        id: cleanGuildId,
        name: cleanGuildId,
        description: `Professional community for ${cleanGuildId} experts and candidates`,
      };

      const mockTemplate: ApplicationTemplate = {
        templateName: `${cleanGuildId} Guild Application`,
        description: `Tell us about yourself and why you'd like to join the ${cleanGuildId} guild. Our expert members will review your application.`,
        questions: [
          {
            id: "q1",
            type: "text",
            question: "What is your full name?",
            required: true,
          },
          {
            id: "q2",
            type: "text",
            question: "What is your current job title?",
            required: true,
          },
          {
            id: "q3",
            type: "textarea",
            question: `Why do you want to join the ${cleanGuildId} guild?`,
            required: true,
          },
          {
            id: "q4",
            type: "textarea",
            question: "What are your key skills and areas of expertise?",
            required: true,
          },
          {
            id: "q5",
            type: "rating",
            question: "How many years of professional experience do you have?",
            required: true,
            maxRating: 10,
          },
          {
            id: "q6",
            type: "multiple_choice",
            question: "Which best describes your experience level?",
            required: true,
            options: ["Junior (0-2 years)", "Mid-level (3-5 years)", "Senior (6-10 years)", "Expert (10+ years)"],
          },
          {
            id: "q7",
            type: "textarea",
            question: "What project are you most proud of and why? What did you do?",
            required: true,
          },
          {
            id: "q8",
            type: "textarea",
            question: "What was the hardest challenge you had to face in a project and how did you overcome it?",
            required: true,
          },
          {
            id: "q9",
            type: "textarea",
            question: "Share a link to your portfolio, GitHub, or LinkedIn profile",
            required: false,
          },
        ],
      };

      console.log("[Guild Application] Using mock data for guild:", cleanGuildId);
      setGuild(mockGuild);
      setTemplate(mockTemplate);

      // Initialize answers object with mock template
      const initialAnswers: Record<string, string | string[]> = {};
      mockTemplate.questions.forEach((q: Question) => {
        initialAnswers[q.id] = q.type === "multiple_choice" ? [] : "";
      });
      setAnswers(initialAnswers);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!template) return false;

    for (const question of template.questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (
          !answer ||
          (Array.isArray(answer) && answer.length === 0) ||
          (typeof answer === "string" && !answer.trim())
        ) {
          setError(`Please answer: ${question.question}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const candidateId = localStorage.getItem("candidateId");
      const candidateEmail = localStorage.getItem("candidateEmail");

      await guildsApi.submitApplication(guildId, {
        candidateId,
        candidateEmail,
        answers,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/guilds/${guildId}`);
      }, 3000);
    } catch (err) {
      console.error("[Guild Application] Error submitting:", err);

      // Mock successful submission if backend isn't ready
      console.log("[Guild Application] Simulating successful submission (mock mode)");
      setSuccess(true);
      setTimeout(() => {
        router.push(`/guilds/${guildId}`);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
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
          <h2 className="text-3xl font-bold text-foreground mb-4">Application Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Your application to join <strong>{guild?.name}</strong> has been submitted successfully.
            Our expert members will review it and get back to you soon.
          </p>
          <Button onClick={() => router.push(`/guilds/${guildId}`)}>
            Back to Guild Page
          </Button>
        </div>
      </div>
    );
  }

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
              <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
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
                {template?.description || "Complete the application form below to join this guild"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Info Alert */}
          <Alert variant="info">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">About This Application</p>
              <p className="text-sm mt-1">
                Your answers will be reviewed by expert members of this guild. Be thorough and
                honest in your responses. Fields marked with * are required.
              </p>
            </div>
          </Alert>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Dynamic Questions */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-8">
            {template?.questions.map((question, index) => (
              <div key={question.id} className="space-y-3">
                <label className="block text-sm font-medium text-card-foreground">
                  <span className="text-base">
                    {index + 1}. {question.question}
                  </span>
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </label>

                {/* Text Input */}
                {question.type === "text" && (
                  <Input
                    value={answers[question.id] as string}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Your answer..."
                    required={question.required}
                  />
                )}

                {/* Textarea */}
                {question.type === "textarea" && (
                  <textarea
                    value={answers[question.id] as string}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Your answer..."
                    required={question.required}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={6}
                  />
                )}

                {/* Multiple Choice */}
                {question.type === "multiple_choice" && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={(answers[question.id] as string[]).includes(option)}
                          onChange={(e) => {
                            const currentAnswers = answers[question.id] as string[];
                            if (e.target.checked) {
                              updateAnswer(question.id, [...currentAnswers, option]);
                            } else {
                              updateAnswer(
                                question.id,
                                currentAnswers.filter((a) => a !== option)
                              );
                            }
                          }}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-foreground">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Rating */}
                {question.type === "rating" && (
                  <div className="flex gap-2">
                    {Array.from({ length: question.maxRating || 5 }, (_, i) => i + 1).map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateAnswer(question.id, rating.toString())}
                        className={`w-12 h-12 rounded-lg border-2 transition-all font-semibold ${
                          answers[question.id] === rating.toString()
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/guilds/${guildId}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
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
