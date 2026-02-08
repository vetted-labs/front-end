"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  X,
  Briefcase,
  Clock,
  Linkedin,
  Globe,
  AlertTriangle,
  Award,
  Target,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { expertApi, getAssetUrl } from "@/lib/api";

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

const renderPromptLines = (prompt?: string) => {
  if (!prompt) return null;
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1 text-xs text-slate-400">
      {lines.map((line, idx) => (
        <p key={idx} className={idx === 0 ? "" : "pl-4"}>
          {idx === 0 ? line : `• ${line}`}
        </p>
      ))}
    </div>
  );
};

const ScoreButtons = ({
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
              : "bg-white/[0.04] text-slate-400 border border-white/10 hover:border-amber-400/40 hover:text-amber-200 hover:bg-white/[0.08]"
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
                    : "bg-white/10"
                }`}
              />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_0_16px_rgba(251,146,60,0.5)]"
                    : isActive
                    ? "bg-amber-500/15 text-amber-200 border-2 border-amber-400/60 shadow-[0_0_20px_rgba(251,146,60,0.3)]"
                    : "bg-white/[0.04] text-slate-500 border border-white/10"
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
                  isActive ? "text-amber-200" : isCompleted ? "text-slate-300" : "text-slate-500"
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
    <div className="space-y-5">
      {/* Applicant Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1f35]/80 via-[#151824]/90 to-[#0f1219]/90 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.08),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-50 tracking-tight">
                {application.fullName}
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">{application.email}</p>
            </div>
            {level && (
              <span className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-200 border border-amber-400/30 text-xs font-bold rounded-full uppercase tracking-wider">
                {level}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(application.currentTitle || application.currentCompany) && (
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Position</p>
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {application.currentTitle}{application.currentCompany ? ` at ${application.currentCompany}` : ""}
                  </p>
                </div>
              </div>
            )}
            {application.yearsOfExperience && (
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Experience</p>
                  <p className="text-sm font-medium text-slate-200">{application.yearsOfExperience} years</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2.5">
        {application.resumeUrl && (
          <a
            href={getAssetUrl(application.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-200 border border-amber-400/25 rounded-xl text-sm font-medium hover:border-amber-400/50 hover:shadow-[0_0_16px_rgba(251,146,60,0.15)] transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            Resume / CV
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
        {application.linkedinUrl && (
          <a
            href={application.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] text-slate-300 border border-white/10 rounded-xl text-sm font-medium hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
          </a>
        )}
        {application.portfolioUrl && (
          <a
            href={application.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] text-slate-300 border border-white/10 rounded-xl text-sm font-medium hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
          >
            <Globe className="w-4 h-4" />
            Portfolio
            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" />
          </a>
        )}
      </div>

      {/* Bio & Motivation */}
      <div className="grid gap-4">
        {application.bio && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-2">Bio</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {application.bio}
            </p>
          </div>
        )}
        {application.motivation && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-2">Motivation</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {application.motivation}
            </p>
          </div>
        )}
      </div>

      {/* Expertise Areas */}
      {application.expertiseAreas && application.expertiseAreas.length > 0 && (
        <div>
          <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-3">
            Expertise Areas
          </p>
          <div className="flex flex-wrap gap-2">
            {application.expertiseAreas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white/[0.05] text-slate-300 text-xs font-medium rounded-lg border border-white/10"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: General Questions ────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>
        <h3 className="text-base font-bold text-slate-100">General Review</h3>
      </div>

      {loadingTemplates && !generalTemplate ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading general rubric...</p>
        </div>
      ) : Object.keys(generalRubricQuestions).length === 0 ? (
        <p className="text-sm text-slate-500">No general scoring rubric available for this guild.</p>
      ) : (
        generalQuestions
          .filter((question: any) => generalRubricQuestions[question.id])
          .map((question: any) => {
            const rubric = generalRubricQuestions[question.id] || {};
            const criteria = rubric.criteria || [];
            const maxPoints =
              rubric.maxPoints ||
              criteria.reduce((acc: number, c: any) => acc + (c.maxPoints || c.max || 0), 0);
            const score = generalTotals[question.id] || 0;
            const pct = maxPoints > 0 ? (score / maxPoints) * 100 : 0;

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden"
              >
                {/* Question header with score */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="text-sm font-semibold text-slate-200">{question.title}</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-200 tabular-nums">
                      {score}/{maxPoints}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Applicant responses */}
                  <div className="space-y-3">
                    {renderPromptLines(question.prompt)}
                    {question.parts?.length ? (
                      <div className="space-y-3">
                        {question.parts.map((part: any) => (
                          <div key={part.id} className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3.5">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">{part.label}</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {getGeneralResponseValue(question.id, part.id) || <span className="text-slate-600 italic">No response</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3.5">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {getGeneralResponseValue(question.id) || <span className="text-slate-600 italic">No response</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Scoring area */}
                  <div className="rounded-xl bg-[#0d1117]/60 border border-white/[0.06] p-4 space-y-4">
                    <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-bold">Scoring</p>
                    {criteria.map((criterion: any) => (
                      <div key={criterion.id} className="space-y-2">
                        <p className="text-xs text-slate-400">
                          {criterion.label}{" "}
                          <span className="text-slate-600">(max {criterion.maxPoints || criterion.max || 0})</span>
                        </p>
                        <ScoreButtons
                          value={generalScores[question.id]?.[criterion.id] || 0}
                          max={criterion.maxPoints || criterion.max || 0}
                          onChange={(val) =>
                            setGeneralScores((prev) => ({
                              ...prev,
                              [question.id]: { ...prev[question.id], [criterion.id]: val },
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">
                        Justification <span className="text-red-400/60">*</span>
                      </p>
                      <textarea
                        value={generalJustifications[question.id] || ""}
                        onChange={(e) =>
                          setGeneralJustifications((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        placeholder="Explain why you gave these points..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
      )}

      {/* Interpretation Guide */}
      {interpretationGuide.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
            <p className="text-sm font-semibold text-slate-200">Interpretation Guide</p>
          </div>
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {interpretationGuide.map((item: any) => (
                <div
                  key={item.range}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-2"
                >
                  <p className="text-xs font-bold text-amber-200">
                    {item.range} — {item.label}
                  </p>
                  <ul className="space-y-1">
                    {(item.notes || []).map((note: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-400 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-slate-600">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Running subtotal */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.06] border border-amber-400/15">
        <p className="text-sm text-slate-400 font-medium">General Subtotal</p>
        <p className="text-sm font-bold text-amber-200 tabular-nums">
          {generalTotal}{generalMax ? ` / ${generalMax}` : ""}
        </p>
      </div>
    </div>
  );

  // ── Step 3: Domain Review + Deductions + Submit ──────────────
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Domain / Level Questions */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-300" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Domain Review</h3>
        </div>

        {loadingTemplates && !levelTemplate ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading topic rubric...</p>
          </div>
        ) : topicList.length === 0 ? (
          <p className="text-sm text-slate-500">No level-specific rubric available for this guild.</p>
        ) : (
          topicList.map((topic: any) => {
            const score = topicScores[topic.id] || 0;
            const pct = (score / 5) * 100;

            return (
              <div
                key={topic.id}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="text-sm font-semibold text-slate-200">
                    {topic.title || topic.id}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-200 tabular-nums">
                      {score}/5
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-3">
                    {renderPromptLines(topic.prompt)}
                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3.5">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {topicAnswers[topic.id] || <span className="text-slate-600 italic">No response</span>}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#0d1117]/60 border border-white/[0.06] p-4 space-y-4">
                    <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-bold">Scoring</p>
                    {topic.whatToLookFor?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-300">What to look for</p>
                        <ul className="space-y-1">
                          {topic.whatToLookFor.map((item: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-400 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-slate-600">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {topic.scoring && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "5 pts", value: topic.scoring.five, color: "text-green-400" },
                          { label: "3-4", value: topic.scoring.threeToFour, color: "text-amber-300" },
                          { label: "1-2", value: topic.scoring.oneToTwo, color: "text-orange-400" },
                          { label: "0", value: topic.scoring.zero, color: "text-red-400" },
                        ].map((s) => (
                          <div key={s.label} className="text-xs text-slate-400 rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                            <span className={`font-bold ${s.color}`}>{s.label}:</span> {s.value}
                          </div>
                        ))}
                      </div>
                    )}
                    <ScoreButtons
                      value={topicScores[topic.id] || 0}
                      max={5}
                      onChange={(val) =>
                        setTopicScores((prev) => ({
                          ...prev,
                          [topic.id]: val,
                        }))
                      }
                    />
                    <div>
                      <p className="text-xs text-slate-400 mb-2">
                        Justification <span className="text-red-400/60">*</span>
                      </p>
                      <textarea
                        value={topicJustifications[topic.id] || ""}
                        onChange={(e) =>
                          setTopicJustifications((prev) => ({
                            ...prev,
                            [topic.id]: e.target.value,
                          }))
                        }
                        placeholder="Tie the score to specific criteria from the rubric..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Red Flags */}
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-red-500/10 bg-red-500/[0.03]">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-slate-200">Red Flags (Deductions)</h3>
        </div>
        <div className="p-5">
          {generalRedFlags.length === 0 ? (
            <p className="text-sm text-slate-500">No red flags defined for this rubric.</p>
          ) : (
            <div className="space-y-2.5">
              {generalRedFlags.map((flag: any) => (
                <label
                  key={flag.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    redFlags[flag.id]
                      ? "bg-red-500/10 border border-red-500/25"
                      : "bg-white/[0.02] border border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={redFlags[flag.id] || false}
                    onChange={(e) =>
                      setRedFlags((prev) => ({
                        ...prev,
                        [flag.id]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/[0.05] accent-red-500"
                  />
                  <span className={`text-sm flex-1 ${redFlags[flag.id] ? "text-red-300" : "text-slate-400"}`}>
                    {flag.label}
                  </span>
                  <span className={`text-xs font-bold ${redFlags[flag.id] ? "text-red-400" : "text-slate-600"}`}>
                    -{Math.abs(flag.points || 0)} pts
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overall Score Summary */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.05] to-transparent p-5">
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-200">Overall Score</p>
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 tabular-nums">
              {overallScore}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-0.5">General</p>
              <p className="text-sm font-bold text-slate-200 tabular-nums">
                {generalTotal}{generalMax ? `/${generalMax}` : ""}
              </p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-0.5">Domain</p>
              <p className="text-sm font-bold text-slate-200 tabular-nums">
                {topicTotal}{topicMax ? `/${topicMax}` : ""}
              </p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/15">
              <p className="text-xs text-slate-500 mb-0.5">Deductions</p>
              <p className="text-sm font-bold text-red-400 tabular-nums">-{redFlagDeductions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div>
        <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-3">
          Feedback (Optional)
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your reasoning and key feedback..."
          className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 resize-none transition-all"
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-slate-600 mt-1.5 text-right">
          {feedback.length}/1000
        </p>
      </div>
    </div>
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
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1f35] via-[#141827] to-[#0e1119] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_100px_rgba(0,0,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Review Expert Application
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all"
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
                <p className="text-sm text-amber-200/80">Loading review template and rubric...</p>
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
          <div className="relative flex gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0d1017]/50">
            {currentStep === 1 ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-200"
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
                  className="flex-1 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-200 flex items-center justify-center gap-2"
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
                  className="flex-1 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-200 flex items-center justify-center gap-2"
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
