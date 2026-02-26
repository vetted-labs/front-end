"use client";

import { Shield, FileText, Briefcase } from "lucide-react";
import { Textarea } from "../ui/textarea";
import type { FieldErrors } from "../ExpertApplicationForm";
import type {
  GeneralReviewTemplate,
  GeneralReviewQuestion,
  LevelReviewTemplate,
  ReviewDomainTopic,
  QuestionPart,
} from "@/types";

export interface GeneralAnswers {
  learningFromFailure: string;
  decisionUnderUncertainty: string;
  motivationAndConflict: string;
  guildImprovement: string;
}

export interface ApplicationQuestionsSectionProps {
  generalTemplate: GeneralReviewTemplate | null;
  levelTemplate: LevelReviewTemplate | null;
  loadingTemplates: boolean;
  generalAnswers: GeneralAnswers;
  levelAnswers: Record<string, string>;
  noAiDeclaration: boolean;
  onUpdateGeneralAnswer: (questionId: string, partId: string | null, value: string) => void;
  onUpdateLevelAnswer: (topicId: string, value: string) => void;
  onNoAiDeclarationChange: (checked: boolean) => void;
  bio: string;
  motivation: string;
  onChange: (field: string, value: string) => void;
  fieldErrors?: FieldErrors;
  onBlur?: (field: string) => void;
}

export function ApplicationQuestionsSection({
  generalTemplate,
  levelTemplate,
  loadingTemplates,
  generalAnswers,
  levelAnswers,
  noAiDeclaration,
  onUpdateGeneralAnswer,
  onUpdateLevelAnswer,
  onNoAiDeclarationChange,
  bio,
  motivation,
  onChange,
  fieldErrors = {},
  onBlur,
}: ApplicationQuestionsSectionProps) {
  return (
    <>
      {/* Application Guidance */}
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
            <p key={idx}>{"\u2022"} {line}</p>
          ))}
        </div>

        <div data-field-error={fieldErrors.noAiDeclaration ? "" : undefined}>
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={noAiDeclaration}
              onChange={(e) => {
                onNoAiDeclarationChange(e.target.checked);
                onBlur?.("noAiDeclaration");
              }}
              className={`h-4 w-4 rounded border ${fieldErrors.noAiDeclaration ? "border-destructive" : "border-border"}`}
            />
            {generalTemplate?.noAiDeclarationText ||
              "I wrote this myself and did not use AI or automated tools."}
          </label>
          {fieldErrors.noAiDeclaration && (
            <p className="mt-1 ml-7 text-sm text-destructive">{fieldErrors.noAiDeclaration}</p>
          )}
        </div>
      </div>

      {/* General Application Questions */}
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">General Application</h2>
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
          (generalTemplate.questions || []).map((question: GeneralReviewQuestion, index: number) => {
            const answerKey =
              question.id === "learning_from_failure" ? "learningFromFailure"
              : question.id === "decision_under_uncertainty" ? "decisionUnderUncertainty"
              : question.id === "motivation_and_conflict" ? "motivationAndConflict"
              : "guildImprovement";

            return (
              <div key={question.id} className="space-y-4 p-4 border border-border rounded-lg bg-card/60">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Question {index + 1}</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">{question.title}</p>
                  {question.prompt && (
                    <div className="space-y-2 mt-2">
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
                            {idx === 0 ? line : `\u2022 ${line}`}
                          </p>
                        ))}
                    </div>
                  )}
                  {question.parts && question.parts.length > 0 && (
                    <div className="mt-3 text-sm text-muted-foreground space-y-1">
                      <p className="font-medium">Address the following in your answer:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {question.parts.map((part: QuestionPart) => (
                          <li key={part.id}>{part.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div data-field-error={fieldErrors[`general.${answerKey}`] ? "" : undefined}>
                  <Textarea
                    label="Your Answer"
                    value={generalAnswers[answerKey as keyof typeof generalAnswers]}
                    onChange={(e) => onUpdateGeneralAnswer(question.id, null, e.target.value)}
                    onBlur={() => onBlur?.("generalAnswers")}
                    placeholder={question.parts?.length ? `Address all parts: ${question.parts.map((p: QuestionPart) => p.label).join(", ")}` : "Be specific about what you'd improve and why."}
                    rows={5}
                    error={fieldErrors[`general.${answerKey}`]}
                    required
                  />
                </div>
              </div>
            );
          })
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
          levelTemplate.topics.map((topic: ReviewDomainTopic) => (
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
                          {idx === 0 ? line : `\u2022 ${line}`}
                        </p>
                      ))}
                  </div>
                )}
              </div>
              <div data-field-error={fieldErrors[`level.${topic.id}`] ? "" : undefined}>
                <Textarea
                  label="Your Answer"
                  value={levelAnswers[topic.id] || ""}
                  onChange={(e) => onUpdateLevelAnswer(topic.id, e.target.value)}
                  onBlur={() => onBlur?.("levelAnswers")}
                  placeholder="Provide a clear, structured response."
                  rows={4}
                  error={fieldErrors[`level.${topic.id}`]}
                  required
                />
              </div>
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

        <div data-field-error={fieldErrors.bio ? "" : undefined}>
          <Textarea
            label="Professional Bio (Optional)"
            value={bio}
            onChange={(e) => onChange("bio", e.target.value)}
            onBlur={() => onBlur?.("bio")}
            placeholder="Tell us about your professional background, key achievements, and what makes you qualified to be an expert reviewer..."
            description={bio.length > 0 && bio.length < 50 ? undefined : "Optional context about your professional background"}
            rows={4}
            maxLength={2000}
            minLength={50}
            showCounter={bio.length > 0}
            error={fieldErrors.bio}
          />
        </div>

        <div data-field-error={fieldErrors.motivation ? "" : undefined}>
          <Textarea
            label="Why do you want to become an expert? (Optional)"
            value={motivation}
            onChange={(e) => onChange("motivation", e.target.value)}
            onBlur={() => onBlur?.("motivation")}
            placeholder="Explain your motivation for joining Vetted as an expert reviewer, and how you plan to contribute to the guild..."
            description={motivation.length > 0 && motivation.length < 50 ? undefined : "Optional additional context about your motivation"}
            rows={4}
            maxLength={2000}
            minLength={50}
            showCounter={motivation.length > 0}
            error={fieldErrors.motivation}
          />
        </div>
      </div>
    </>
  );
}
