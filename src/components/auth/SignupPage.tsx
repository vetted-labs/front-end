"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Lock, Loader2, ArrowRight, Linkedin, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
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
import { useFormPersistence, useDraftAutosave } from "@/lib/hooks/useFormPersistence";

type UserType = "candidate" | "company";

const tabs: AuthTab[] = [
  { type: "candidate", label: "Job Seeker", icon: "profile" },
  { type: "company", label: "Employer", icon: Building2 },
];

const EYEBROW_LABEL: Record<UserType, string> = {
  candidate: "JOB SEEKER · CREATE ACCOUNT",
  company: "EMPLOYER · CREATE ACCOUNT",
};

const SUBTITLE: Record<UserType, string> = {
  candidate: "Find your next role — set up your profile below.",
  company: "Hire vetted talent — create your employer account.",
};

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

  // Draft persistence — anonymous (pre-signup). Passwords are explicitly excluded.
  const {
    save: saveDraft,
    clear: clearDraft,
    wasRestored: draftRestored,
    dismissRestored,
  } = useFormPersistence<{
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    website: string;
    headline: string;
    experienceLevel: string;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
  }>({
    namespace: "signup",
    identity: null,
    variant: userType,
    version: 1,
    excludeFields: ["password", "confirmPassword"],
    onRestore: (draft) => {
      if (typeof draft.fullName === "string") setFullName(draft.fullName);
      if (typeof draft.email === "string") setEmail(draft.email);
      if (typeof draft.phone === "string") setPhone(draft.phone);
      if (typeof draft.companyName === "string") setCompanyName(draft.companyName);
      if (typeof draft.website === "string") setWebsite(draft.website);
      if (typeof draft.headline === "string") setHeadline(draft.headline);
      if (typeof draft.experienceLevel === "string") setExperienceLevel(draft.experienceLevel);
      if (typeof draft.linkedinUrl === "string") setLinkedinUrl(draft.linkedinUrl);
      if (typeof draft.githubUrl === "string") setGithubUrl(draft.githubUrl);
      if (typeof draft.portfolioUrl === "string") setPortfolioUrl(draft.portfolioUrl);
    },
  });

  useDraftAutosave(saveDraft, {
    fullName,
    email,
    phone,
    companyName,
    website,
    headline,
    experienceLevel,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
  });

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
            ...(githubUrl.trim()
              ? [{ platform: "github", label: "GitHub", url: githubUrl.trim() }]
              : []),
            ...(portfolioUrl.trim()
              ? [{ platform: "portfolio", label: "Portfolio / Website", url: portfolioUrl.trim() }]
              : []),
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

          clearDraft();
          auth.login(
            data.token,
            "candidate",
            data.candidate?.id || "",
            data.candidate?.email || "",
            undefined,
            data.refreshToken
          );
          router.push(redirectUrl || "/candidate/dashboard");
        } else {
          const data = await companyApi.create({
            companyName,
            email,
            password,
            website,
          });

          clearDraft();
          auth.login(
            data.token,
            "company",
            data.company?.id || "",
            data.company?.email || "",
            undefined,
            data.refreshToken
          );
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
      timestamp: Date.now(),
    };
    sessionStorage.setItem("linkedin_oauth_state", JSON.stringify(stateData));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(stateData.token)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const inputClass =
    "w-full pl-10 pr-3.5 py-3 text-sm bg-background/60 border border-border rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40 transition-all outline-none";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT — brand panel */}
      <AuthBrandPanel
        eyebrow="VETTED · JOIN THE NETWORK"
        headline={
          <>
            Join the
            <br />
            <span className="text-primary">Vetted</span> network.
          </>
        }
        subhead="Set up your account and start working with people whose expertise has been verified — not just claimed."
      />

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border/40">
        <Link href="/" className="inline-flex">
          <Logo size="sm" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {EYEBROW_LABEL[userType]}
        </p>
      </header>

      {/* RIGHT — form pane */}
      <div className="flex-1 lg:order-2 flex items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:p-12">
        <div className="w-full max-w-[480px]">
          {/* Eyebrow + heading (desktop) */}
          <div className="hidden lg:block mb-8">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {EYEBROW_LABEL[userType]}
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight mt-2">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{SUBTITLE[userType]}</p>
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden mb-7">
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{SUBTITLE[userType]}</p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <AuthTabSelector
              tabs={tabs}
              activeType={userType}
              onSelect={handleUserTypeChange}
            />

            <div className="p-6 sm:p-7">
              {draftRestored && (
                <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span>We restored your previous signup details on this device.</span>
                  <button
                    type="button"
                    onClick={dismissRestored}
                    className="text-foreground hover:opacity-80 text-xs font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

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
                  <label className="block text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">
                    Email <span className="text-destructive normal-case">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
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
                    <label className="block text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">
                      Password <span className="text-destructive normal-case">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
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
                    <label className="block text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">
                      Confirm <span className="text-destructive normal-case">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
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
                  <label className="block text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">
                    Phone{" "}
                    <span className="text-muted-foreground/60 normal-case font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-sm pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 rounded border-border accent-[hsl(var(--primary))]"
                  />
                  <span className="text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading || !agreedToTerms}
                  className="w-full mt-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* LinkedIn Sign Up — Candidates only */}
              {userType === "candidate" && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <span className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground/60">
                      or continue with
                    </span>
                    <span className="flex-1 h-px bg-border/60" />
                  </div>

                  <button
                    type="button"
                    onClick={handleLinkedInSignup}
                    className="w-full py-2.5 px-4 bg-card border border-border rounded-lg text-sm font-medium text-foreground flex items-center justify-center gap-2.5 transition-all hover:border-[rgba(10,102,194,0.45)] hover:bg-[rgba(10,102,194,0.06)] hover:-translate-y-px"
                  >
                    <Linkedin className="w-4 h-4 text-[#0a66c2]" />
                    Continue with LinkedIn
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer link */}
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

          {/* Mobile-only legal */}
          <div className="lg:hidden mt-8 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/60">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span aria-hidden className="opacity-40">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
