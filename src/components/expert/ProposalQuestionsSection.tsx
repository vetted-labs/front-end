"use client";

import { Shield, FileText, Briefcase } from "lucide-react";
import { Textarea } from "../ui/textarea";

export interface GeneralAnswers {
  learningFromFailure: { event: string; response: string; pivot: string };
  decisionUnderUncertainty: { constraints: string; logic: string; reflection: string };
  motivationAndConflict: { driver: string; friction: string };
  guildImprovement: string;
}

export interface ProposalQuestionsSectionProps {
  generalTemplate: any;
  levelTemplate: any;
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
}

export function ProposalQuestionsSection({
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
}: ProposalQuestionsSectionProps) {
  return (
    <>
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
            <p key={idx}>{"\u2022"} {line}</p>
          ))}
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={noAiDeclaration}
            onChange={(e) => onNoAiDeclarationChange(e.target.checked)}
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
                          {idx === 0 ? line : `\u2022 ${line}`}
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
                      onChange={(e) => onUpdateGeneralAnswer(question.id, part.id, e.target.value)}
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
                  onChange={(e) => onUpdateGeneralAnswer(question.id, null, e.target.value)}
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
                          {idx === 0 ? line : `\u2022 ${line}`}
                        </p>
                      ))}
                  </div>
                )}
              </div>
              <Textarea
                label="Your Answer"
                value={levelAnswers[topic.id] || ""}
                onChange={(e) => onUpdateLevelAnswer(topic.id, e.target.value)}
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
          value={bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Tell us about your professional background, key achievements, and what makes you qualified to be an expert reviewer..."
          description="Optional context about your professional background"
          rows={4}
          maxLength={2000}
        />

        <Textarea
          label="Why do you want to become an expert? (Optional)"
          value={motivation}
          onChange={(e) => onChange("motivation", e.target.value)}
          placeholder="Explain your motivation for joining Vetted as an expert reviewer, and how you plan to contribute to the guild..."
          description="Optional additional context about your motivation"
          rows={4}
          maxLength={2000}
        />
      </div>
    </>
  );
}
