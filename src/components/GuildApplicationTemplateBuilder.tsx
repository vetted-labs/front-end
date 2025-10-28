"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  CheckCircle,
  GripVertical,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Alert } from "./ui/Alert";
import { LoadingState } from "./ui/LoadingState";

interface Question {
  id: string;
  type: "text" | "textarea" | "multiple_choice" | "rating";
  question: string;
  required: boolean;
  options?: string[]; // For multiple choice
  maxRating?: number; // For rating questions
}

interface TemplateFormData {
  templateName: string;
  description: string;
  questions: Question[];
}

interface GuildApplicationTemplateBuilderProps {
  guildId: string;
  guildName: string;
  onBack?: () => void;
}

export function GuildApplicationTemplateBuilder({
  guildId,
  guildName,
  onBack,
}: GuildApplicationTemplateBuilderProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TemplateFormData>({
    templateName: "",
    description: "",
    questions: [],
  });

  const addQuestion = (type: Question["type"]) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      question: "",
      required: true,
      ...(type === "multiple_choice" && { options: [""] }),
      ...(type === "rating" && { maxRating: 5 }),
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion],
    });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    });
  };

  const removeQuestion = (id: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== id),
    });
  };

  const addOption = (questionId: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) =>
        q.id === questionId && q.options ? { ...q, options: [...q.options, ""] } : q
      ),
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) =>
        q.id === questionId && q.options
          ? { ...q, options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt)) }
          : q
      ),
    });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) =>
        q.id === questionId && q.options
          ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) }
          : q
      ),
    });
  };

  const handleSubmit = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!formData.templateName.trim()) {
      setError("Template name is required");
      return;
    }

    if (formData.questions.length === 0) {
      setError("Please add at least one question");
      return;
    }

    // Validate questions
    for (const question of formData.questions) {
      if (!question.question.trim()) {
        setError("All questions must have text");
        return;
      }
      if (question.type === "multiple_choice" && (!question.options || question.options.length < 2)) {
        setError("Multiple choice questions must have at least 2 options");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/experts/guilds/${guildId}/templates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,
            templateName: formData.templateName,
            description: formData.description,
            questions: formData.questions.map(({ id, ...rest }) => rest), // Remove temporary IDs
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create template");
      }

      setSuccess(true);
      setTimeout(() => {
        if (onBack) {
          onBack();
        } else {
          router.push("/expert/dashboard");
        }
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert type="error">Please connect your wallet to continue</Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Template Created!</h2>
          <p className="text-slate-600">Your application template has been saved successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => (onBack ? onBack() : router.push("/expert/dashboard"))}
              className="flex items-center text-slate-600 hover:text-slate-900 transition-all mr-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Application Template Builder
              </h1>
              <p className="text-xs text-slate-500">{guildName}</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Template Information</h2>

          <div className="space-y-4">
            <Input
              label="Template Name"
              value={formData.templateName}
              onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
              placeholder="e.g., Senior Engineer Application"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this template is for..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Questions</h2>
            <div className="flex gap-2">
              <Button onClick={() => addQuestion("text")} variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button onClick={() => addQuestion("textarea")} variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Long Text
              </Button>
              <Button
                onClick={() => addQuestion("multiple_choice")}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Multiple Choice
              </Button>
              <Button onClick={() => addQuestion("rating")} variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Rating
              </Button>
            </div>
          </div>

          {formData.questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No questions added yet</p>
              <p className="text-sm text-slate-500">
                Click one of the buttons above to add your first question
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <GripVertical className="w-5 h-5 text-slate-400 mt-2 cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded">
                          {question.type.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-500">Question {index + 1}</span>
                      </div>

                      <Input
                        label="Question Text"
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder="Enter your question..."
                        required
                      />

                      {/* Multiple Choice Options */}
                      {question.type === "multiple_choice" && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {question.options?.map((option, optIdx) => (
                              <div key={optIdx} className="flex gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) =>
                                    updateOption(question.id, optIdx, e.target.value)
                                  }
                                  placeholder={`Option ${optIdx + 1}`}
                                />
                                <Button
                                  onClick={() => removeOption(question.id, optIdx)}
                                  variant="secondary"
                                  size="sm"
                                  disabled={question.options && question.options.length <= 2}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            onClick={() => addOption(question.id)}
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      {/* Rating Max */}
                      {question.type === "rating" && (
                        <div className="mt-4">
                          <Input
                            label="Maximum Rating"
                            type="number"
                            value={question.maxRating?.toString() || "5"}
                            onChange={(e) =>
                              updateQuestion(question.id, {
                                maxRating: parseInt(e.target.value) || 5,
                              })
                            }
                            min={3}
                            max={10}
                          />
                        </div>
                      )}

                      {/* Required Toggle */}
                      <div className="mt-4 flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) =>
                            updateQuestion(question.id, { required: e.target.checked })
                          }
                          className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                        />
                        <label className="ml-2 text-sm text-slate-700">Required question</label>
                      </div>
                    </div>

                    <Button
                      onClick={() => removeQuestion(question.id)}
                      variant="secondary"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => (onBack ? onBack() : router.push("/expert/dashboard"))}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 w-4 h-4" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
