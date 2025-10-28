"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { Loader2, Send, Upload, X, ArrowLeft } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";
import { Alert } from "./ui/Alert";

interface ExpertApplicationFormProps {
  onSuccess?: () => void;
}

const GUILDS = [
  "Engineering & Technology",
  "Product Management",
  "Design & UX",
  "Data & Analytics",
  "Marketing & Growth",
  "Sales & Business Development",
  "Operations & Strategy",
  "Finance & Accounting",
  "People & HR",
  "Legal & Compliance",
];

const EXPERTISE_LEVELS = [
  { value: "junior", label: "Junior (1-3 years)" },
  { value: "mid", label: "Mid-Level (3-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8-12 years)" },
  { value: "principal", label: "Principal (12+ years)" },
];

export function ExpertApplicationForm({ onSuccess }: ExpertApplicationFormProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    linkedinUrl: "",
    portfolioUrl: "",
    guild: "",
    expertiseLevel: "",
    yearsOfExperience: "",
    currentTitle: "",
    currentCompany: "",
    bio: "",
    motivation: "",
    expertiseAreas: [] as string[],
    newExpertiseArea: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddExpertiseArea = () => {
    if (formData.newExpertiseArea.trim()) {
      setFormData((prev) => ({
        ...prev,
        expertiseAreas: [...prev.expertiseAreas, prev.newExpertiseArea.trim()],
        newExpertiseArea: "",
      }));
    }
  };

  const handleRemoveExpertiseArea = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet before submitting");
      return;
    }

    if (formData.expertiseAreas.length === 0) {
      setError("Please add at least one area of expertise");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/experts/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          yearsOfExperience: parseInt(formData.yearsOfExperience),
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit application");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        router.push("/expert/application-pending");
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if expert already exists
  // Remove auto-redirect check - allow pending users to apply to new guilds
  // If approved users land here, they can apply to new guilds too

  if (!isConnected || !address) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert type="warning">
          Please connect your wallet to apply as an expert.
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert type="success">
          Application submitted successfully! Redirecting...
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push("/expert")}
              className="flex items-center text-slate-600 hover:text-slate-900 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <button
              onClick={() => {
                disconnect();
                router.push("/expert");
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all border border-slate-200 rounded-lg hover:border-slate-300"
            >
              Disconnect Wallet
            </button>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Apply as an Expert
          </h1>
          <p className="text-slate-600">
            Join our expert guild and start earning by reviewing candidates and endorsing top
            talent.
          </p>
          <div className="mt-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
            <p className="text-sm text-violet-700">
              <span className="font-semibold">Connected Wallet:</span>{" "}
              <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
            </p>
          </div>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Personal Information</h2>

            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
              required
            />

            <Input
              label="LinkedIn Profile URL"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => handleChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
              required
            />

            <Input
              label="Portfolio / Website URL (Optional)"
              type="url"
              value={formData.portfolioUrl}
              onChange={(e) => handleChange("portfolioUrl", e.target.value)}
              placeholder="https://johndoe.com"
            />
          </div>

          {/* Professional Background */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Professional Background</h2>

            <Select
              label="Select Guild"
              value={formData.guild}
              onChange={(e) => handleChange("guild", e.target.value)}
              required
            >
              <option value="">Choose a guild...</option>
              {GUILDS.map((guild) => (
                <option key={guild} value={guild}>
                  {guild}
                </option>
              ))}
            </Select>

            <Select
              label="Expertise Level"
              value={formData.expertiseLevel}
              onChange={(e) => handleChange("expertiseLevel", e.target.value)}
              required
            >
              <option value="">Choose your level...</option>
              {EXPERTISE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>

            <Input
              label="Years of Experience"
              type="number"
              value={formData.yearsOfExperience}
              onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
              placeholder="10"
              min="1"
              required
            />

            <Input
              label="Current Title"
              type="text"
              value={formData.currentTitle}
              onChange={(e) => handleChange("currentTitle", e.target.value)}
              placeholder="Senior Software Engineer"
              required
            />

            <Input
              label="Current Company"
              type="text"
              value={formData.currentCompany}
              onChange={(e) => handleChange("currentCompany", e.target.value)}
              placeholder="Tech Corp"
              required
            />
          </div>

          {/* Areas of Expertise */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Areas of Expertise</h2>
            <p className="text-sm text-slate-600">
              Add specific skills or technologies you can evaluate (e.g., "React", "Machine
              Learning", "Product Strategy")
            </p>

            <div className="flex gap-2">
              <Input
                label=""
                type="text"
                value={formData.newExpertiseArea}
                onChange={(e) => handleChange("newExpertiseArea", e.target.value)}
                placeholder="e.g., React, TypeScript, AWS"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExpertiseArea();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddExpertiseArea}
                className="mt-0 whitespace-nowrap"
              >
                Add
              </Button>
            </div>

            {formData.expertiseAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.expertiseAreas.map((area, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-sm"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpertiseArea(index)}
                      className="hover:text-violet-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bio & Motivation */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">About You</h2>

            <Textarea
              label="Professional Bio"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell us about your professional background, key achievements, and what makes you qualified to be an expert reviewer..."
              rows={4}
              required
            />

            <Textarea
              label="Why do you want to become an expert?"
              value={formData.motivation}
              onChange={(e) => handleChange("motivation", e.target.value)}
              placeholder="Explain your motivation for joining Vetted as an expert reviewer, and how you plan to contribute to the guild..."
              rows={4}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-5 h-5" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <Send className="mr-2 w-5 h-5" />
                  Submit Application
                </>
              )}
            </Button>
            <p className="mt-4 text-sm text-slate-500 text-center">
              Your application will be reviewed by the founding team. You'll receive an email once
              approved.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
