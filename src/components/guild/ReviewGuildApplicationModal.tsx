"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Award,
  Target,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { expertApi } from "@/lib/api";
import { ReviewProfileStep } from "@/components/guild/review/ReviewProfileStep";
import { GeneralReviewStep } from "@/components/guild/review/GeneralReviewStep";
import { DomainReviewStep } from "@/components/guild/review/DomainReviewStep";

interface GuildApplication {
  id: string;
  fullName: string;
  email: string;
  expertiseLevel?: string;
  applicationResponses?: any;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  bio?: string;
  motivation?: string;
  expertiseAreas?: string[];
}

interface ReviewPayload {
  feedback?: string;
  criteriaScores: Record<string, any>;
  criteriaJustifications: Record<string, any>;
  overallScore: number;
  redFlagDeductions: number;
}

interface ReviewGuildApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: GuildApplication | null;
  guildId: string;
  onSubmitReview: (payload: ReviewPayload) => void;
  isReviewing: boolean;
}

const GENERAL_RESPONSE_KEY_MAP: Record<string, string> = {
  learning_from_failure: "learningFromFailure",
  decision_under_uncertainty: "decisionUnderUncertainty",
  motivation_and_conflict: "motivationAndConflict",
  guild_improvement: "guildImprovement",
};

const FALLBACK_GENERAL_QUESTIONS = [
  {
    id: "learning_from_failure",
    title: "Learning from Failure",
    prompt: "Describe a specific professional or academic failure from recent years where you were the primary owner.",
    parts: [
      { id: "event", label: "The Event" },
      { id: "response", label: "The Response" },
      { id: "pivot", label: "The Pivot/Learning" },
    ],
  },
  {
    id: "decision_under_uncertainty",
    title: "Decision-Making Under Uncertainty",
    prompt: "Walk us through a complex technical or strategic decision you made without full information.",
    parts: [
      { id: "constraints", label: "The Constraints" },
      { id: "logic", label: "The Logic" },
      { id: "reflection", label: "The Reflection" },
    ],
  },
  {
    id: "motivation_and_conflict",
    title: "Motivation and Conflict",
    prompt: "Think about your transition into your current or most recent role.",
    parts: [
      { id: "driver", label: "The Driver" },
      { id: "friction", label: "The Friction" },
    ],
  },
  {
    id: "guild_improvement",
    title: "First Improvement",
    prompt: "If accepted into the Vetted guild, what is the first thing you would improve or change, and why?",
  },
];

export const renderPromptLines = (prompt?: string) => {
  if (!prompt) return null;
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {lines.map((line, idx) => (
        <p key={idx} className={idx === 0 ? "" : "pl-4"}>
          {idx === 0 ? line : `• ${line}`}
        </p>
      ))}
    </div>
  );
};

export const ScoreButtons = ({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max + 1 }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onChange(idx)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            value === idx
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(251,146,60,0.4)] border border-amber-400/50"
              : "bg-muted/50 text-muted-foreground border border-border hover:border-primary/40 hover:text-primary hover:bg-muted"
          }`}
        >
          {idx}
        </button>
      ))}
    </div>
  );
};

const STEPS = [
  { number: 1, label: "Review Profile", icon: Target },
  { number: 2, label: "General Questions", icon: Sparkles },
  { number: 3, label: "Domain Review", icon: Award },
] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const StepIcon = step.icon;

        return (
          <div key={step.number} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-12 h-[2px] mx-1 transition-all duration-500 ${
                  currentStep > step.number
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_0_16px_rgba(251,146,60,0.5)]"
                    : isActive
                    ? "bg-amber-500/15 text-primary border-2 border-amber-400/60 shadow-[0_0_20px_rgba(251,146,60,0.3)]"
                    : "bg-muted/50 text-muted-foreground border border-border"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-pulse" />
                )}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline tracking-wide ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewGuildApplicationModal({
  isOpen,
  onClose,
  application,
  guildId,
  onSubmitReview,
  isReviewing,
}: ReviewGuildApplicationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [generalScores, setGeneralScores] = useState<Record<string, Record<string, number>>>({});
  const [generalJustifications, setGeneralJustifications] = useState<Record<string, string>>({});
  const [topicScores, setTopicScores] = useState<Record<string, number>>({});
  const [topicJustifications, setTopicJustifications] = useState<Record<string, string>>({});
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>({});
  const [generalTemplate, setGeneralTemplate] = useState<any>(null);
  const [levelTemplate, setLevelTemplate] = useState<any>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!application) return;
    setCurrentStep(1);
    setFeedback("");
    setGeneralScores({});
    setGeneralJustifications({});
    setTopicScores({});
    setTopicJustifications({});
    setRedFlags({});
    setGeneralTemplate(null);
    setLevelTemplate(null);
    setTemplateError(null);
    setValidationError(null);
  }, [application, isOpen]);

  const responses = application?.applicationResponses || {};
  const generalResponses = responses.general || {};
  const domainResponses = responses.domain || {};
  const level = responses.level || application?.expertiseLevel || "";
  const topicAnswers: Record<string, string> = domainResponses.topics || {};

  useEffect(() => {
    if (!application || !isOpen || !guildId) return;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setTemplateError(null);

      try {
        const generalResponse: any = await expertApi.getGuildApplicationTemplate(
          guildId,
          "general"
        );
        const generalData = generalResponse?.data || generalResponse;
        setGeneralTemplate(generalResponse?.success ? generalData : generalData);

        if (level) {
          const levelResponse: any = await expertApi.getGuildApplicationTemplate(
            guildId,
            "level",
            level
          );
          const levelData = levelResponse?.data || levelResponse;
          setLevelTemplate(levelResponse?.success ? levelData : levelData);
        }
      } catch (err: any) {
        setTemplateError(err?.message || "Failed to load review templates");
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [application?.id, guildId, isOpen, level]);

  const generalQuestions = generalTemplate?.questions?.length
    ? generalTemplate.questions
    : FALLBACK_GENERAL_QUESTIONS;
  const generalRubric = generalTemplate?.rubric || {};
  const generalRubricQuestions = generalRubric?.questions || {};
  const generalRedFlags = Array.isArray(generalRubric?.redFlags) ? generalRubric.redFlags : [];
  const interpretationGuide = Array.isArray(generalRubric?.interpretationGuide)
    ? generalRubric.interpretationGuide
    : [];

  const topicList = levelTemplate?.topics?.length
    ? levelTemplate.topics
    : Object.keys(topicAnswers).map((topicId) => ({ id: topicId, title: topicId }));

  const getGeneralResponseValue = (questionId: string, partId?: string) => {
    const responseKey = GENERAL_RESPONSE_KEY_MAP[questionId];
    if (!responseKey) return "";
    const responseValue = generalResponses[responseKey];
    if (partId && responseValue && typeof responseValue === "object") {
      return responseValue[partId] || "";
    }
    if (!partId && typeof responseValue === "string") {
      return responseValue;
    }
    return "";
  };

  const generalTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const rubricEntries = Object.entries(generalRubricQuestions);

    if (rubricEntries.length === 0) {
      Object.keys(generalScores).forEach((questionId) => {
        const scores = Object.values(generalScores[questionId] || {});
        totals[questionId] = scores.reduce((acc, val) => acc + (val || 0), 0);
      });
      return totals;
    }

    rubricEntries.forEach(([questionId, questionRubric]: any) => {
      const criteria = questionRubric?.criteria || [];
      const sum = criteria.reduce(
        (acc: number, c: any) => acc + (generalScores[questionId]?.[c.id] || 0),
        0
      );
      totals[questionId] = sum;
    });
    return totals;
  }, [generalRubricQuestions, generalScores]);

  const generalTotal = Object.values(generalTotals).reduce((a, b) => a + b, 0);
  const generalMax =
    generalRubric?.totalPoints ||
    Object.values(generalRubricQuestions).reduce((sum: number, question: any) => {
      if (question?.maxPoints) return sum + question.maxPoints;
      const criteria = question?.criteria || [];
      return (
        sum +
        criteria.reduce((acc: number, c: any) => acc + (c.maxPoints || c.max || 0), 0)
      );
    }, 0);

  const topicTotal = topicList.reduce(
    (acc: number, topic: any) => acc + (topicScores[topic.id] || 0),
    0
  );
  const topicMax = levelTemplate?.totalPoints || topicList.length * 5;

  const redFlagDeductions = Object.keys(redFlags)
    .filter((key) => redFlags[key])
    .reduce((sum, key) => {
      const flag = generalRedFlags.find((f: any) => f.id === key);
      const points = typeof flag?.points === "number" ? Math.abs(flag.points) : 0;
      return sum + points;
    }, 0);

  const overallScore = generalTotal + topicTotal - redFlagDeductions;

  if (!application || !isOpen) return null;

  const validateStep2 = () => {
    const scoredGeneralQuestionIds = generalQuestions
      .filter((question: any) => question.scored !== false && question.id !== "guild_improvement")
      .map((question: any) => question.id);

    const missingGeneralJustifications = scoredGeneralQuestionIds.filter(
      (questionId: string) =>
        generalRubricQuestions[questionId] && !generalJustifications[questionId]?.trim()
    );

    if (missingGeneralJustifications.length > 0) {
      setValidationError("Please add a justification for every scored general question.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const validateStep3 = () => {
    const scoredTopicIds = topicList.map((topic: any) => topic.id);
    const missingTopicJustifications = scoredTopicIds.filter(
      (topicId: string) => !topicJustifications[topicId]?.trim()
    );

    if (missingTopicJustifications.length > 0) {
      setValidationError("Please add a justification for every scored domain topic.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!generalTemplate || !levelTemplate) {
      setValidationError("Review templates are still loading. Please try again in a moment.");
      return;
    }

    if (!validateStep3()) return;

    setValidationError(null);

    const domainScoresPayload = { topics: topicScores, total: topicTotal, max: topicMax };
    const domainJustificationsPayload = topicJustifications;

    onSubmitReview({
      feedback: feedback || undefined,
      criteriaScores: {
        general: { ...generalScores, totals: generalTotals, total: generalTotal, max: generalMax },
        marketing: domainScoresPayload,
        domain: domainScoresPayload,
        overallMax: (generalMax || 0) + (topicMax || 0),
        overallScore,
        redFlagDeductions,
      },
      criteriaJustifications: {
        general: generalJustifications,
        marketing: domainJustificationsPayload,
        domain: domainJustificationsPayload,
      },
      overallScore,
      redFlagDeductions,
    });
  };

  // ── Step 1: Review Profile ───────────────────────────────────
  const renderStep1 = () => (
    <ReviewProfileStep application={application} level={level} />
  );

  // ── Step 2: General Questions ────────────────────────────────
  const renderStep2 = () => (
    <GeneralReviewStep
      loadingTemplates={loadingTemplates}
      generalTemplate={generalTemplate}
      generalRubricQuestions={generalRubricQuestions}
      generalQuestions={generalQuestions}
      generalTotals={generalTotals}
      generalScores={generalScores}
      generalJustifications={generalJustifications}
      interpretationGuide={interpretationGuide}
      generalTotal={generalTotal}
      generalMax={generalMax}
      getGeneralResponseValue={getGeneralResponseValue}
      onGeneralScoresChange={setGeneralScores}
      onGeneralJustificationsChange={setGeneralJustifications}
    />
  );

  // ── Step 3: Domain Review + Deductions + Submit ──────────────
  const renderStep3 = () => (
    <DomainReviewStep
      loadingTemplates={loadingTemplates}
      levelTemplate={levelTemplate}
      topicList={topicList}
      topicAnswers={topicAnswers}
      topicScores={topicScores}
      topicJustifications={topicJustifications}
      redFlags={redFlags}
      generalRedFlags={generalRedFlags}
      redFlagDeductions={redFlagDeductions}
      generalTotal={generalTotal}
      generalMax={generalMax}
      topicTotal={topicTotal}
      topicMax={topicMax}
      overallScore={overallScore}
      feedback={feedback}
      onTopicScoresChange={setTopicScores}
      onTopicJustificationsChange={setTopicJustifications}
      onRedFlagsChange={setRedFlags}
      onFeedbackChange={setFeedback}
    />
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Review Expert Application
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto px-6 py-5">
            <StepIndicator currentStep={currentStep} />

            {templateError && <Alert variant="error">{templateError}</Alert>}
            {loadingTemplates && (
              <div className="flex items-center gap-3 p-3.5 mb-4 rounded-xl bg-amber-500/[0.06] border border-amber-400/15">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <p className="text-sm text-primary/80">Loading review template and rubric...</p>
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {validationError && (
              <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{validationError}</p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
            {currentStep === 1 ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_28px_rgba(251,146,60,0.45)] hover:from-amber-400 hover:to-orange-400 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : currentStep === 2 ? (
              <>
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_28px_rgba(251,146,60,0.45)] hover:from-amber-400 hover:to-orange-400 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isReviewing}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_28px_rgba(251,146,60,0.45)] hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isReviewing ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit Review
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
