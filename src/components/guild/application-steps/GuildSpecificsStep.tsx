"use client";

import { Check, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import type { GuildApplicationTemplate, GuildDomainLevel } from "@/types";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";

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
    <div className="space-y-10">
      {/* Experience Level */}
      {template.levels && template.levels.length > 0 && (
        <section>
          <SectionHeader
            title={
              <>
                Experience level <span className="text-destructive">*</span>
              </>
            }
            description={
              requiredLevel
                ? "Locked to the level the role requires."
                : "Pick the level that matches your craft. This determines which domain prompts you'll answer next."
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {template.levels.map((level) => {
              const isSelected = selectedLevel === level.id;
              const isLocked = !!requiredLevel && level.id !== requiredLevel;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => !requiredLevel && onLevelChange(level.id)}
                  disabled={isLocked}
                  className={cn(
                    "relative p-4 rounded-xl border text-left transition-all",
                    isSelected &&
                      "border-primary bg-primary/[0.06] ring-1 ring-primary/30",
                    !isSelected &&
                      !isLocked &&
                      "border-border hover:border-primary/40 hover:bg-muted/30",
                    isLocked && "border-border opacity-40 cursor-not-allowed",
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 grid place-items-center w-4 h-4 rounded-full bg-primary text-background">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <p className="font-semibold text-foreground tracking-tight">
                    {level.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {level.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Domain Questions */}
      {currentDomainLevel && currentDomainLevel.topics.length > 0 && (
        <section>
          <SectionHeader
            title={currentDomainLevel.templateName}
            description={currentDomainLevel.description}
          />

          <div className="space-y-2">
            {currentDomainLevel.topics.map((topic, tIndex) => {
              const isExpanded = expandedDomain === topic.id;
              const answerKey = `domain.${topic.id}`;
              const answerValue = domainAnswers[answerKey] || "";
              const answered = answerValue.trim().length >= 50;
              return (
                <div
                  key={topic.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-colors",
                    isExpanded
                      ? "border-primary/30 bg-primary/[0.03]"
                      : "border-border bg-background/30 hover:bg-muted/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onExpandDomain(isExpanded ? null : topic.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={cn(
                          "flex-shrink-0 grid place-items-center w-7 h-7 rounded-full text-[11px] font-bold border",
                          answered
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            : isExpanded
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {answered ? <Check className="w-3.5 h-3.5" /> : tIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {topic.title}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">
                          {answered
                            ? `${answerValue.trim().length} characters · answered`
                            : answerValue.trim()
                              ? `${answerValue.trim().length} characters · needs ${50 - answerValue.trim().length} more`
                              : "Tap to answer"}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {topic.prompt}
                      </div>
                      <textarea
                        value={answerValue}
                        onChange={(e) =>
                          onDomainAnswerChange(answerKey, e.target.value)
                        }
                        placeholder="Your answer…"
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none transition-shadow"
                        rows={8}
                      />
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums",
                            answered
                              ? STATUS_COLORS.positive.text
                              : "text-muted-foreground",
                          )}
                        >
                          {answerValue.trim().length} / 50 min characters
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No-AI Declaration */}
      {template.noAiDeclarationText && (
        <section className="rounded-xl border border-border bg-muted/20 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <span className="flex-shrink-0 mt-0.5">
              <span
                className={cn(
                  "grid place-items-center w-5 h-5 rounded-md border-2 transition-colors",
                  noAiDeclaration
                    ? "bg-primary border-primary"
                    : "border-border bg-background",
                )}
              >
                {noAiDeclaration && (
                  <Check className="w-3 h-3 text-background" strokeWidth={3} />
                )}
              </span>
            </span>
            <input
              type="checkbox"
              checked={noAiDeclaration}
              onChange={(e) => onNoAiDeclarationChange(e.target.checked)}
              className="sr-only"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                Attestation
                <span className="text-destructive">·  required</span>
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {template.noAiDeclarationText}
              </p>
            </div>
          </label>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-display text-lg font-bold text-foreground tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  );
}
