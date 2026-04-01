"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Lock, Loader2, ArrowRight, Linkedin, User, Building2 } from "lucide-react";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { AuthTabSelector } from "@/components/auth/AuthTabSelector";
import type { AuthTab } from "@/components/auth/AuthTabSelector";
import { CandidateSignupFields } from "@/components/auth/CandidateSignupFields";
import { CompanySignupFields } from "@/components/auth/CompanySignupFields";
import { NativeSelect } from "@/components/ui/native-select";
import { candidateApi, companyApi } from "@/lib/api";
import { clearTokenAuthState } from "@/lib/auth";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useApi } from "@/lib/hooks/useFetch";

type UserType = "candidate" | "company";

const tabs: AuthTab[] = [
  { type: "candidate", label: "Job Seeker", icon: User },
  { type: "company", label: "Employer", icon: Building2 },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const typeParam = searchParams.get("type");

  const userType: UserType = typeParam === "company" ? "company" : "candidate";
  const auth = useAuthContext();

  const { execute: executeSignup, isLoading } = useApi();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useMountEffect(() => {
    clearTokenAuthState();
  });

  const handleUserTypeChange = (newType: string) => {
    setErrors({});
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    if (redirectUrl) {
      params.set("redirect", redirectUrl);
    }
    router.push(`/auth/signup?${params.toString()}`);
  };

  // Common fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Company specific
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");

  // Candidate specific
  const [headline, setHeadline] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    const urlPattern = /^https?:\/\/.+\..+/;

    if (userType === "candidate") {
      if (!fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      if (!headline.trim()) {
        newErrors.headline = "Current occupation is required";
      }
      if (!linkedinUrl.trim()) {
        newErrors.linkedinUrl = "LinkedIn profile is required";
      } else if (!urlPattern.test(linkedinUrl)) {
        newErrors.linkedinUrl = "Enter a valid URL (e.g. https://linkedin.com/in/...)";
      }
      if (githubUrl.trim() && !urlPattern.test(githubUrl)) {
        newErrors.githubUrl = "Enter a valid URL (e.g. https://github.com/...)";
      }
      if (portfolioUrl.trim() && !urlPattern.test(portfolioUrl)) {
        newErrors.portfolioUrl = "Enter a valid URL (e.g. https://...)";
      }
    } else {
      if (!companyName.trim()) {
        newErrors.companyName = "Company name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await executeSignup(
      async () => {
        if (userType === "candidate") {
          const socialLinks = [
            { platform: "linkedin", label: "LinkedIn", url: linkedinUrl.trim() },
            ...(githubUrl.trim() ? [{ platform: "github", label: "GitHub", url: githubUrl.trim() }] : []),
            ...(portfolioUrl.trim() ? [{ platform: "portfolio", label: "Portfolio / Website", url: portfolioUrl.trim() }] : []),
          ];

          const data = await candidateApi.signup({
            fullName,
            email,
            password,
            phone,
            headline,
            experienceLevel,
            socialLinks,
          });

          auth.login(data.token, "candidate", data.candidate?.id || "", data.candidate?.email || "", undefined, data.refreshToken);
          router.push(redirectUrl || "/candidate/dashboard");
        } else {
          const data = await companyApi.create({
            companyName,
            email,
            password,
            website,
          });

          auth.login(data.token, "company", data.company?.id || "", data.company?.email || "", undefined, data.refreshToken);
          router.push(redirectUrl || "/dashboard");
        }
        return null;
      },
      {
        onError: (errorMsg) => {
          setErrors({ submit: errorMsg || "Signup failed. Please try again." });
        },
      }
    );
  };

  const handleLinkedInSignup = () => {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const scope = "openid profile email";

    const stateData = {
      token: crypto.randomUUID(),
      redirect: redirectUrl || "/candidate/dashboard",
      timestamp: Date.now()
    };
    sessionStorage.setItem('linkedin_oauth_state', JSON.stringify(stateData));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateData.token)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 text-sm bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none";

  return (
    <AuthPageLayout
      title="Create your account"
      subtitle="Join the Vetted community today"
      maxWidth="max-w-[480px]"
    >
      {/* Tab selector */}
      <AuthTabSelector tabs={tabs} activeType={userType} onSelect={handleUserTypeChange} />

      {/* Form area */}
      <div className="p-6 sm:p-8">
        <p className="text-sm text-muted-foreground mb-6">
          {userType === "company"
            ? "Hire vetted talent — create your employer account"
            : "Find your next role — set up your profile below"}
        </p>

        {errors.submit && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
            <div>
              <span>{errors.submit}</span>
              {errors.submit.includes("already registered") && (
                <button
                  type="button"
                  onClick={() => router.push(`/auth/login?type=${userType}`)}
                  className="block text-primary hover:text-primary/80 text-sm font-medium mt-1"
                >
                  Go to login
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Candidate Fields */}
          {userType === "candidate" && (
            <>
              <CandidateSignupFields
                fullName={fullName}
                onFullNameChange={setFullName}
                headline={headline}
                onHeadlineChange={setHeadline}
                linkedinUrl={linkedinUrl}
                onLinkedinUrlChange={setLinkedinUrl}
                githubUrl={githubUrl}
                onGithubUrlChange={setGithubUrl}
                portfolioUrl={portfolioUrl}
                onPortfolioUrlChange={setPortfolioUrl}
                errors={errors}
              />
              <NativeSelect
                label="Experience Level"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                <option value="junior">Junior (0–2 years)</option>
                <option value="mid">Mid-Level (2–5 years)</option>
                <option value="senior">Senior (5–10 years)</option>
                <option value="lead">Lead / Principal (10+ years)</option>
              </NativeSelect>
            </>
          )}

          {/* Company Fields */}
          {userType === "company" && (
            <CompanySignupFields
              companyName={companyName}
              onCompanyNameChange={setCompanyName}
              website={website}
              onWebsiteChange={setWebsite}
              errors={errors}
            />
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min. 6 characters"
                />
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Confirm <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Phone <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 rounded border-border"
            />
            <span className="text-muted-foreground">
              I agree to the{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading || !agreedToTerms}
            className="w-full py-2.5 px-4 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* LinkedIn Sign Up - Only for Candidates */}
        {userType === "candidate" && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-card text-xs text-muted-foreground uppercase tracking-wider">
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLinkedInSignup}
              className="w-full py-2.5 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.98]"
            >
              <Linkedin className="w-4 h-4" />
              Continue with LinkedIn
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push(`/auth/login?type=${userType}`)}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthPageLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
