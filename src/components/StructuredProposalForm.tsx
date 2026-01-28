"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

interface StructuredProposalFormProps {
  guildId: string;
  guildName: string;
  onSubmit: (data: StructuredProposalData) => Promise<void>;
  onCancel: () => void;
}

export interface StructuredProposalData {
  // Basic Info
  candidateName: string;
  candidateEmail: string;
  yearsOfExperience: number;

  // Structured Sections
  skillsSummary: string;
  experienceSummary: string;
  motivationStatement: string;
  credibilityEvidence: string;
  achievements: string[];

  // Voting Parameters
  requiredStake: number;
  votingDurationDays: number;
}

export function StructuredProposalForm({
  guildId,
  guildName,
  onSubmit,
  onCancel,
}: StructuredProposalFormProps) {
  const [formData, setFormData] = useState<StructuredProposalData>({
    candidateName: "",
    candidateEmail: "",
    yearsOfExperience: 0,
    skillsSummary: "",
    experienceSummary: "",
    motivationStatement: "",
    credibilityEvidence: "",
    achievements: [],
    requiredStake: 10,
    votingDurationDays: 7,
  });

  const [currentAchievement, setCurrentAchievement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidateName.trim()) {
      newErrors.candidateName = "Candidate name is required";
    }
    if (!formData.candidateEmail.trim() || !formData.candidateEmail.includes("@")) {
      newErrors.candidateEmail = "Valid email is required";
    }
    if (formData.yearsOfExperience < 0) {
      newErrors.yearsOfExperience = "Years of experience must be positive";
    }
    if (!formData.skillsSummary.trim() || formData.skillsSummary.length < 50) {
      newErrors.skillsSummary = "Skills summary must be at least 50 characters";
    }
    if (!formData.experienceSummary.trim() || formData.experienceSummary.length < 100) {
      newErrors.experienceSummary = "Experience summary must be at least 100 characters";
    }
    if (!formData.motivationStatement.trim() || formData.motivationStatement.length < 50) {
      newErrors.motivationStatement = "Motivation statement must be at least 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAchievement = () => {
    if (currentAchievement.trim()) {
      setFormData({
        ...formData,
        achievements: [...formData.achievements, currentAchievement.trim()],
      });
      setCurrentAchievement("");
    }
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements.filter((_, i) => i !== index),
    });
  };

  const getFieldStatus = (fieldName: keyof StructuredProposalData, minLength?: number) => {
    const value = formData[fieldName];
    if (typeof value === "string") {
      if (!value.trim()) return "empty";
      if (minLength && value.length < minLength) return "incomplete";
      return "complete";
    }
    return "empty";
  };

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle>Create Structured Proposal</CardTitle>
        <CardDescription>
          Propose a candidate for {guildName}. Complete all required sections for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">1. Basic Information</h3>
              <Badge variant={getFieldStatus("candidateName") === "complete" ? "default" : "secondary"}>
                {getFieldStatus("candidateName") === "complete" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {getFieldStatus("candidateName") === "complete" ? "Complete" : "Required"}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Candidate Name *</label>
              <Input
                value={formData.candidateName}
                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                placeholder="Full name"
                className={errors.candidateName ? "border-red-500" : ""}
              />
              {errors.candidateName && (
                <p className="text-xs text-red-500 mt-1">{errors.candidateName}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Candidate Email *</label>
              <Input
                type="email"
                value={formData.candidateEmail}
                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                placeholder="email@example.com"
                className={errors.candidateEmail ? "border-red-500" : ""}
              />
              {errors.candidateEmail && (
                <p className="text-xs text-red-500 mt-1">{errors.candidateEmail}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Years of Experience</label>
              <Input
                type="number"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          {/* Section 2: Skills Summary */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">2. Skills Summary</h3>
              <Badge variant={getFieldStatus("skillsSummary", 50) === "complete" ? "default" : "secondary"}>
                {getFieldStatus("skillsSummary", 50) === "complete" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {formData.skillsSummary.length}/50+ characters
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Core Skills & Technical Competencies *
              </label>
              <Textarea
                value={formData.skillsSummary}
                onChange={(e) => setFormData({ ...formData, skillsSummary: e.target.value })}
                rows={4}
                placeholder="Describe the candidate's key skills, technologies, frameworks, and technical expertise relevant to this guild..."
                className={errors.skillsSummary ? "border-red-500" : ""}
              />
              {errors.skillsSummary && (
                <p className="text-xs text-red-500 mt-1">{errors.skillsSummary}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 50 characters. Be specific about technical skills.
              </p>
            </div>
          </div>

          {/* Section 3: Experience Summary */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">3. Experience Summary</h3>
              <Badge variant={getFieldStatus("experienceSummary", 100) === "complete" ? "default" : "secondary"}>
                {getFieldStatus("experienceSummary", 100) === "complete" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {formData.experienceSummary.length}/100+ characters
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Professional Background & Work History *
              </label>
              <Textarea
                value={formData.experienceSummary}
                onChange={(e) => setFormData({ ...formData, experienceSummary: e.target.value })}
                rows={6}
                placeholder="Describe the candidate's work history, notable projects, companies they've worked for, and relevant professional experience..."
                className={errors.experienceSummary ? "border-red-500" : ""}
              />
              {errors.experienceSummary && (
                <p className="text-xs text-red-500 mt-1">{errors.experienceSummary}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 100 characters. Include specific projects and roles.
              </p>
            </div>
          </div>

          {/* Section 4: Motivation Statement */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">4. Motivation Statement</h3>
              <Badge variant={getFieldStatus("motivationStatement", 50) === "complete" ? "default" : "secondary"}>
                {getFieldStatus("motivationStatement", 50) === "complete" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {formData.motivationStatement.length}/50+ characters
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Why Join This Guild? *
              </label>
              <Textarea
                value={formData.motivationStatement}
                onChange={(e) => setFormData({ ...formData, motivationStatement: e.target.value })}
                rows={4}
                placeholder="Explain why the candidate wants to join this guild and what they hope to contribute..."
                className={errors.motivationStatement ? "border-red-500" : ""}
              />
              {errors.motivationStatement && (
                <p className="text-xs text-red-500 mt-1">{errors.motivationStatement}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 50 characters. Focus on alignment with guild values.
              </p>
            </div>
          </div>

          {/* Section 5: Credibility Evidence */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">5. Credibility Evidence</h3>
              <Badge variant="secondary">Optional</Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Portfolio, GitHub, LinkedIn, or Other Links
              </label>
              <Textarea
                value={formData.credibilityEvidence}
                onChange={(e) => setFormData({ ...formData, credibilityEvidence: e.target.value })}
                rows={3}
                placeholder="Provide links to portfolio, GitHub profile, LinkedIn, published work, or other evidence of expertise..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional but highly recommended. One URL per line.
              </p>
            </div>
          </div>

          {/* Section 6: Key Achievements */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">6. Key Achievements</h3>
              <Badge variant="secondary">
                {formData.achievements.length} {formData.achievements.length === 1 ? "achievement" : "achievements"}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notable Achievements (Optional)
              </label>
              <div className="flex gap-2">
                <Input
                  value={currentAchievement}
                  onChange={(e) => setCurrentAchievement(e.target.value)}
                  placeholder="Add an achievement..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAchievement();
                    }
                  }}
                />
                <Button type="button" onClick={addAchievement}>
                  Add
                </Button>
              </div>

              {formData.achievements.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background rounded border border-border"
                    >
                      <span className="text-sm flex-1">{achievement}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAchievement(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Voting Parameters */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <h3 className="text-lg font-semibold">7. Voting Parameters</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Required Stake (VETD)</label>
                <Input
                  type="number"
                  value={formData.requiredStake}
                  onChange={(e) => setFormData({ ...formData, requiredStake: parseFloat(e.target.value) || 10 })}
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum stake required to vote
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Voting Duration (days)</label>
                <Input
                  type="number"
                  value={formData.votingDurationDays}
                  onChange={(e) => setFormData({ ...formData, votingDurationDays: parseInt(e.target.value) || 7 })}
                  min="1"
                  max="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long voting remains open
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" disabled={isSubmitting} className="min-w-[200px]">
              {isSubmitting ? "Creating Proposal..." : "Create Proposal"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
