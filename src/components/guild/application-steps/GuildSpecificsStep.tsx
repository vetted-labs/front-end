"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  GuildApplicationTemplate,
  GuildDomainLevel,
} from "@/types";

interface GuildSpecificsStepProps {
  template: GuildApplicationTemplate;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  requiredLevel: string | null;
  domainAnswers: Record<string, string>;
  onDomainAnswerChange: (key: string, value: string) => void;
  expandedDomain: string | null;
  onExpandDomain: (id: string | null) => void;
  noAiDeclaration: boolean;
  onNoAiDeclarationChange: (val: boolean) => void;
}

export default function GuildSpecificsStep({
  template,
  selectedLevel,
  onLevelChange,
  requiredLevel,
  domainAnswers,
  onDomainAnswerChange,
  expandedDomain,
  onExpandDomain,
  noAiDeclaration,
  onNoAiDeclarationChange,
}: GuildSpecificsStepProps) {
  const currentDomainLevel: GuildDomainLevel | null = selectedLevel
    ? template.domainQuestions[
        selectedLevel as keyof typeof template.domainQuestions
      ]
    : null;

  return (
    <div className="space-y-8">
      {/* Experience Level Selection */}
      {template.levels && template.levels.length > 0 && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Experience Level <span className="text-destructive">*</span>
          </h2>
          {requiredLevel ? (
            <p className="text-sm text-muted-foreground mb-4">
              The experience level is determined by the job you&apos;re applying
              for.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              Select the level that best matches your experience. This determines
              the domain-specific questions you&apos;ll answer.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {template.levels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => !requiredLevel && onLevelChange(level.id)}
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
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8 space-y-6">
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
            const answerValue = domainAnswers[answerKey] || "";

            return (
              <div
                key={topic.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    onExpandDomain(isExpanded ? null : topic.id)
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
                        onDomainAnswerChange(answerKey, e.target.value)
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
      {template.noAiDeclarationText && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noAiDeclaration}
              onChange={(e) => onNoAiDeclarationChange(e.target.checked)}
              className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm text-foreground">
              {template.noAiDeclarationText}{" "}
              <span className="text-destructive">*</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
