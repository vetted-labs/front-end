"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationQuestion, ApplicationQuestionType } from "@/types";
import { MAX_APPLICATION_QUESTIONS } from "@/types";
import { cn } from "@/lib/utils";
import { QuestionCard } from "../QuestionCard";
import { QuestionTypePicker } from "../QuestionTypePicker";
import type { StepProps } from "../wizard-types";

const DEFAULT_QUESTION_BY_TYPE: Record<
  ApplicationQuestionType,
  Omit<ApplicationQuestion, "id">
> = {
  short_text: { type: "short_text", label: "", required: false, maxLength: 200 },
  long_text: { type: "long_text", label: "", required: false, maxLength: 800 },
  single_choice: {
    type: "single_choice",
    label: "",
    required: false,
    options: ["Option 1", "Option 2"],
  },
  multi_choice: {
    type: "multi_choice",
    label: "",
    required: false,
    options: ["Option 1", "Option 2"],
  },
  file_upload: {
    type: "file_upload",
    label: "",
    required: false,
    allowedFileTypes: ["pdf", "doc", "docx"],
  },
  url: { type: "url", label: "", required: false },
};

function newId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+; this
  // wizard runs client-side. Fallback in case it's missing under tests.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function StepQuestions({ formData, updateField }: StepProps) {
  const questions = formData.applicationQuestions ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const setQuestions = (next: ApplicationQuestion[]) => {
    updateField("applicationQuestions", next);
  };

  const handleAdd = (type: ApplicationQuestionType) => {
    if (questions.length >= MAX_APPLICATION_QUESTIONS) return;
    const id = newId();
    const question: ApplicationQuestion = {
      id,
      ...DEFAULT_QUESTION_BY_TYPE[type],
    };
    setQuestions([...questions, question]);
    setEditingId(id);
    setShowPicker(false);
  };

  const handleDuplicate = (id: string) => {
    if (questions.length >= MAX_APPLICATION_QUESTIONS) return;
    const idx = questions.findIndex((q) => q.id === id);
    if (idx === -1) return;
    const original = questions[idx];
    const copy: ApplicationQuestion = { ...original, id: newId() };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next);
  };

  const handleRemove = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleSave = (q: ApplicationQuestion) => {
    setQuestions(questions.map((x) => (x.id === q.id ? q : x)));
    setEditingId(null);
  };

  const progressPct = Math.min(
    100,
    Math.round((questions.length / MAX_APPLICATION_QUESTIONS) * 100)
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-[0.2em] uppercase text-primary font-semibold mb-2">
          Step 05
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Build the application form
        </h2>
        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mt-2 max-w-2xl">
          Add the questions every applicant must answer. Keep it short — strong
          candidates abandon long forms. Six question types, max{" "}
          {MAX_APPLICATION_QUESTIONS}.
        </p>
      </div>

      {/* Counter row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex items-center gap-3 px-3.5 py-2 border border-border bg-muted rounded-full text-xs text-muted-foreground tabular-nums w-fit">
          <span className="block w-20 h-[3px] rounded-sm bg-card overflow-hidden">
            <span
              className="block h-full bg-primary rounded-sm transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </span>
          <span>
            <strong className="text-foreground font-bold">
              {questions.length}
            </strong>{" "}
            / {MAX_APPLICATION_QUESTIONS} questions
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the handle on the left edge to reorder
        </p>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Editor column */}
        <div>
          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center mx-auto mb-4">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                No questions yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                Build the form your candidates will see — choose from six question
                types and toggle required.
              </p>
              <Button type="button" onClick={() => setShowPicker(true)}>
                Add your first question
              </Button>
              {showPicker && (
                <div className="mt-6 text-left">
                  <QuestionTypePicker
                    count={questions.length}
                    onPick={handleAdd}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  isEditing={editingId === q.id}
                  onEdit={() => setEditingId(q.id)}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  onDuplicate={() => handleDuplicate(q.id)}
                  onRemove={() => handleRemove(q.id)}
                />
              ))}
              <div className="mt-1.5">
                <QuestionTypePicker count={questions.length} onPick={handleAdd} />
              </div>
            </div>
          )}
        </div>

        {/* Candidate preview column */}
        <CandidatePreview
          jobTitle={formData.title || "Untitled role"}
          questions={questions}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate preview (right column, sticky on wide screens)
// ---------------------------------------------------------------------------

interface CandidatePreviewProps {
  jobTitle: string;
  questions: ApplicationQuestion[];
}

function CandidatePreview({ jobTitle, questions }: CandidatePreviewProps) {
  return (
    <aside className="xl:sticky xl:top-6">
      <div className="rounded-2xl border border-border bg-muted overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">
            Candidate preview
          </span>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <div className="p-5">
          <div className="pb-4 border-b border-border mb-5">
            <span className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-semibold">
              Apply · Vetted
            </span>
            <span className="block text-base font-bold tracking-tight text-foreground leading-tight mt-1">
              {jobTitle}
            </span>
          </div>

          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Your candidate-facing form will render here as you add questions.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {questions.map((q, i) => (
                <PreviewQuestion key={q.id} question={q} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11.5px] text-muted-foreground leading-snug px-1">
        Preview updates as you edit. Reorder, required state, and help text are
        reflected live.
      </p>
    </aside>
  );
}

interface PreviewQuestionProps {
  question: ApplicationQuestion;
  index: number;
}

function PreviewQuestion({ question, index }: PreviewQuestionProps) {
  const num = String(index + 1).padStart(2, "0");
  const labelNode = (
    <div className="text-[13px] font-semibold text-foreground leading-snug tracking-tight">
      {num} · {question.label || <em className="text-muted-foreground">Untitled</em>}
      {question.required && <span className="text-primary ml-1">*</span>}
    </div>
  );
  const help = question.helpText && (
    <p className="text-[11.5px] text-muted-foreground leading-snug">
      {question.helpText}
    </p>
  );

  return (
    <div className="flex flex-col gap-2">
      {labelNode}
      {help}
      <PreviewControl question={question} />
    </div>
  );
}

function PreviewControl({ question }: { question: ApplicationQuestion }) {
  switch (question.type) {
    case "short_text":
    case "url":
      return (
        <div className="px-3 py-2 rounded-md bg-card border border-border text-[13px] text-muted-foreground italic">
          {question.type === "url"
            ? "https://example.com"
            : "Single-line answer"}
        </div>
      );
    case "long_text":
      return (
        <div className="px-3 py-3 rounded-md bg-card border border-border text-[13px] text-muted-foreground italic min-h-[72px]">
          Multi-line answer (max {question.maxLength ?? 800} chars)
        </div>
      );
    case "single_choice":
    case "multi_choice": {
      const options = question.options ?? ["Option 1", "Option 2"];
      return (
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-card border border-border text-[13px] text-foreground"
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 border-[1.5px] border-muted-foreground flex-shrink-0",
                  question.type === "multi_choice" ? "rounded-sm" : "rounded-full"
                )}
              />
              <span>{opt || `Option ${i + 1}`}</span>
            </div>
          ))}
        </div>
      );
    }
    case "file_upload": {
      const types = (question.allowedFileTypes ?? ["pdf"]).map((t) =>
        t.toUpperCase()
      );
      return (
        <div className="rounded-md border border-dashed border-border bg-card p-4 text-center">
          <div className="text-[12.5px] font-semibold text-muted-foreground">
            Drop file here, or click to browse
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground font-mono">
            {types.join(", ")} · max 10 MB
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
