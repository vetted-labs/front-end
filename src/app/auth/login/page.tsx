"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Building2,
  Linkedin,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { candidateApi, companyApi, sanitizeErrorMessage } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";
import { useDisconnect } from "wagmi";

type UserType = "candidate" | "company";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const typeParam = searchParams.get("type");

  // Derive userType from URL parameter (default to candidate)
  const userType: UserType = typeParam === "company" ? "company" : "candidate";
  const { disconnect } = useDisconnect();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear any existing auth on mount
  useEffect(() => {
    clearAllAuthState();
    disconnect();
  }, []);

  // Function to update userType by updating the URL
  const handleUserTypeChange = (newType: UserType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    if (redirectUrl) {
      params.set("redirect", redirectUrl);
    }
    router.push(`/auth/login?${params.toString()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);
    try {
      if (userType === "candidate") {
        // Login as candidate
        const data: any = await candidateApi.login(email, password);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("candidateId", data.id);
        localStorage.setItem("candidateEmail", data.email);
        localStorage.setItem("userType", "candidate");
        router.push(redirectUrl || "/candidate/profile");
      } else {
        // Login as company
        const data: any = await companyApi.login(email, password);
        localStorage.setItem("companyAuthToken", data.token);
        localStorage.setItem("companyId", data.company.id);
        localStorage.setItem("companyEmail", data.company.email);
        localStorage.setItem("userType", "company");
        router.push(redirectUrl || "/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle different types of errors
      let errorMessage = "Something went wrong. Please try again.";

      if (error.response) {
        // HTTP error response from server
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          errorMessage = sanitizeErrorMessage(data.message || data.error) || "Invalid input. Please check your information.";
        } else if (status === 401) {
          errorMessage = "Invalid credentials. Please check your email and password.";
        } else if (status === 403) {
          errorMessage = "Access denied. Your account may be suspended.";
        } else if (status === 404) {
          errorMessage = "Account not found. Please check your email or sign up.";
        } else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          // 🔐 SECURITY: Sanitize error messages to prevent XSS
          errorMessage = sanitizeErrorMessage(data.message || data.error) || errorMessage;
        }
      } else if (error.message) {
        // Network or other errors
        if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Cannot connect to server. Please check your internet connection.";
        } else {
          errorMessage = sanitizeErrorMessage(error.message);
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const scope = "openid profile email";

    // Generate cryptographic state token for CSRF protection
    const stateData = {
      token: crypto.randomUUID(),
      redirect: redirectUrl || "/candidate/profile",
      timestamp: Date.now()
    };
    sessionStorage.setItem('linkedin_oauth_state', JSON.stringify(stateData));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateData.token)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted flex items-center justify-center p-4">
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0">
        <nav className="border-b bg-card/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Logo onClick={() => router.push("/")} />
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <button
                  onClick={() => router.push("/")}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Welcome Back
          </h1>
          <p className="text-lg text-muted-foreground">
            Sign in to your Vetted account
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border">
          {/* User Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              I am signing in as a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleUserTypeChange("candidate")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === "candidate"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-medium">Job Seeker</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleUserTypeChange("company")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === "company"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">Employer</span>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-primary to-accent text-gray-900 dark:text-gray-900 rounded-xl hover:opacity-90 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* LinkedIn Sign In - Only for Candidates */}
          {userType === "candidate" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLinkedInLogin}
                className="w-full py-3 px-6 bg-[#0A66C2] text-white rounded-xl hover:bg-[#004182] transition-all font-semibold flex items-center justify-center gap-3 shadow-md"
              >
                <Linkedin className="w-5 h-5" />
                Sign in with LinkedIn
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => router.push(`/auth/signup?type=${userType}`)}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
