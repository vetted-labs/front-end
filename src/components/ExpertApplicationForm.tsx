"use client";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect, useChainId } from "wagmi";
import { Loader2, Send, Upload, X, ArrowLeft, User, Briefcase, FileText, Award, Shield } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import { Alert } from "./ui/alert";
import { expertApi } from "@/lib/api";

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

const getNetworkName = (chainId: number | undefined) => {
  if (!chainId) return "Unknown";
  const networks: Record<number, string> = {
    1: "Ethereum",
    11155111: "Sepolia",
    137: "Polygon",
    42161: "Arbitrum",
  };
  return networks[chainId] || `Chain ${chainId}`;
};

export function ExpertApplicationForm({ onSuccess }: ExpertApplicationFormProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    // Frontend validation
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setError("Full name must be at least 2 characters");
      return;
    }
    if (!formData.guild.trim() || formData.guild.length < 2) {
      setError("Guild must be at least 2 characters");
      return;
    }
    if (!formData.currentTitle.trim() || formData.currentTitle.length < 2) {
      setError("Current title must be at least 2 characters");
      return;
    }
    if (!formData.currentCompany.trim() || formData.currentCompany.length < 2) {
      setError("Current company must be at least 2 characters");
      return;
    }
    if (formData.bio.length < 50) {
      setError("Bio must be at least 50 characters");
      return;
    }
    if (formData.bio.length > 2000) {
      setError("Bio must not exceed 2000 characters");
      return;
    }
    if (formData.motivation.length < 50) {
      setError("Motivation must be at least 50 characters");
      return;
    }
    if (formData.motivation.length > 2000) {
      setError("Motivation must not exceed 2000 characters");
      return;
    }
    if (formData.expertiseAreas.length === 0) {
      setError("Please add at least one area of expertise");
      return;
    }

    setIsLoading(true);

    try {
      await expertApi.apply({
        ...formData,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        walletAddress: address,
      });

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
        <Alert variant="warning">
          Please connect your wallet to apply as an expert.
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert variant="success">
          Application submitted successfully! Redirecting...
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {mounted && address && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-mono text-foreground font-medium">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {getNetworkName(chainId)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      disconnect();
                      router.push("/");
                    }}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Apply as an Expert
            </h1>
          <p className="text-muted-foreground">
            Join our expert guild and start earning by reviewing candidates and endorsing top
            talent.
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          {error && (
            <div className="p-6 bg-destructive/5">
              <Alert variant="error">
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                  <p className="text-sm text-muted-foreground">Tell us about yourself</p>
                </div>
              </div>

            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="John Doe"
              description="Your legal name as it appears on official documents"
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
              description="We'll use this to send you important updates about your application"
              required
            />

            <Input
              label="LinkedIn Profile URL"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => handleChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
              description="Link to your LinkedIn profile for verification"
              required
            />

            <Input
              label="Portfolio / Website URL (Optional)"
              type="url"
              value={formData.portfolioUrl}
              onChange={(e) => handleChange("portfolioUrl", e.target.value)}
              placeholder="https://johndoe.com"
              description="Optional: Link to your personal website, GitHub, or portfolio"
            />
            </div>

            {/* Professional Background Section */}
            <div className="p-8 space-y-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Professional Background</h2>
                  <p className="text-sm text-muted-foreground">Your experience and expertise</p>
                </div>
              </div>

            <NativeSelect
              label="Select Guild"
              value={formData.guild}
              onChange={(e) => handleChange("guild", e.target.value)}
              description="Choose ONE guild that best matches your primary expertise area"
              required
            >
              <option value="" disabled>Choose a guild...</option>
              {GUILDS.map((guild) => (
                <option key={guild} value={guild}>
                  {guild}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              label="Expertise Level"
              value={formData.expertiseLevel}
              onChange={(e) => handleChange("expertiseLevel", e.target.value)}
              description="Select the level that matches your years of experience"
              required
            >
              <option value="" disabled>Choose your level...</option>
              {EXPERTISE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </NativeSelect>

            <Input
              label="Years of Experience"
              type="number"
              value={formData.yearsOfExperience}
              onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
              placeholder="10"
              min="1"
              description="Total years of professional experience in your field"
              required
            />

            <Input
              label="Current Title"
              type="text"
              value={formData.currentTitle}
              onChange={(e) => handleChange("currentTitle", e.target.value)}
              placeholder="Senior Software Engineer"
              description="Your current job title or most recent position"
              required
            />

            <Input
              label="Current Company"
              type="text"
              value={formData.currentCompany}
              onChange={(e) => handleChange("currentCompany", e.target.value)}
              placeholder="Tech Corp"
              description="Your current employer or most recent company"
              required
            />
            </div>

            {/* Areas of Expertise Section */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Areas of Expertise</h2>
                  <p className="text-sm text-muted-foreground">
                    Add specific skills or technologies you can evaluate (e.g., React, Machine Learning, Product Strategy)
                  </p>
                </div>
              </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
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
                </div>
                <Button
                  type="button"
                  onClick={handleAddExpertiseArea}
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add specific skills, technologies, or domains you can evaluate (e.g., React, Machine Learning, Product Strategy). Press Enter or click Add to include each one.
              </p>
            </div>

            {formData.expertiseAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.expertiseAreas.map((area, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded-full text-sm"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpertiseArea(index)}
                      className="hover:text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
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
              label="Professional Bio"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell us about your professional background, key achievements, and what makes you qualified to be an expert reviewer..."
              description="Share your professional background, key achievements, and what makes you qualified to be an expert reviewer (50-2000 characters)"
              rows={4}
              required
              showCounter
              minLength={50}
              maxLength={2000}
            />

            <Textarea
              label="Why do you want to become an expert?"
              value={formData.motivation}
              onChange={(e) => handleChange("motivation", e.target.value)}
              placeholder="Explain your motivation for joining Vetted as an expert reviewer, and how you plan to contribute to the guild..."
              description="Explain why you want to become an expert on Vetted and how you plan to contribute to your guild (50-2000 characters)"
              rows={4}
              required
              showCounter
              minLength={50}
              maxLength={2000}
            />
            </div>

            {/* Submit Section */}
            <div className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-primary via-accent to-primary/80 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Your application will be reviewed by the founding team. You&apos;ll receive an email once
                approved.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
