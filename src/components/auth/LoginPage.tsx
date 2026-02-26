"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  User,
  Building2,
  Linkedin,
  Shield,
  Wallet,
} from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { AuthTabSelector } from "@/components/auth/AuthTabSelector";
import type { AuthTab } from "@/components/auth/AuthTabSelector";
import { candidateApi, companyApi, expertApi, sanitizeErrorMessage, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { clearTokenAuthState } from "@/lib/auth";
import { useAuthContext } from "@/hooks/useAuthContext";

type UserType = "candidate" | "company" | "expert";

const tabs: AuthTab[] = [
  { type: "candidate", label: "Job Seeker", icon: User },
  { type: "company", label: "Employer", icon: Building2 },
  { type: "expert", label: "Expert", icon: Shield },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const typeParam = searchParams.get("type");

  const userType: UserType = typeParam === "company" ? "company" : typeParam === "expert" ? "expert" : "candidate";
  const auth = useAuthContext();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    clearTokenAuthState();
    setMounted(true);
  }, []);

  const checkExpertStatus = useCallback(async (walletAddress: string) => {
    try {
      const result = await expertApi.getProfile(walletAddress);
      if (result.status === "approved") {
        auth.login("", "expert", result.id, result.email, walletAddress);
        localStorage.setItem("expertId", result.id);
        localStorage.setItem("expertStatus", "approved");
        router.push("/expert/dashboard");
        return;
      } else if (result.status === "pending") {
        localStorage.setItem("expertId", result.id);
        localStorage.setItem("walletAddress", walletAddress);
        localStorage.setItem("expertStatus", "pending");
        router.push("/expert/application-pending");
        return;
      }
      router.push("/expert/apply");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        router.push("/expert/apply");
        return;
      }
      setError("Failed to verify expert status. Please try again.");
    }
  }, [auth, router]);

  useEffect(() => {
    if (mounted && isConnected && address && shouldCheckStatus) {
      checkExpertStatus(address);
      setShouldCheckStatus(false);
    }
  }, [mounted, isConnected, address, shouldCheckStatus, checkExpertStatus]);

  const handleUserTypeChange = (newType: string) => {
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    if (redirectUrl) {
      params.set("redirect", redirectUrl);
    }
    router.push(`/auth/login?${params.toString()}`);
  };

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        clearTokenAuthState();
        await connect({ connector });
        setShouldCheckStatus(true);
      } catch (error) {
        logger.error("Failed to connect wallet", error, { silent: true });
        setError("Failed to connect wallet. Please try again.");
      }
    }
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
        const data = await candidateApi.login(email, password);
        auth.login(data.token, "candidate", data.candidate!.id, data.candidate!.email);
        router.push(redirectUrl || "/candidate/dashboard");
      } else {
        const data = await companyApi.login(email, password);
        auth.login(data.token, "company", data.company!.id, data.company!.email);
        router.push(redirectUrl || "/dashboard");
      }
    } catch (error: unknown) {
      logger.error("Login failed", error, { silent: true });

      let errorMessage = "Something went wrong. Please try again.";

      const apiErr = error as { response?: { status: number; data: { message?: string; error?: string } }; message?: string };
      if (apiErr.response) {
        const status = apiErr.response.status;
        const data = apiErr.response.data;

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
          errorMessage = sanitizeErrorMessage(data.message || data.error) || errorMessage;
        }
      } else if (apiErr.message) {
        if (apiErr.message.includes("Network Error") || apiErr.message.includes("fetch")) {
          errorMessage = "Cannot connect to server. Please check your internet connection.";
        } else {
          errorMessage = sanitizeErrorMessage(apiErr.message);
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

    const stateData = {
      token: crypto.randomUUID(),
      redirect: redirectUrl || "/candidate/dashboard",
      timestamp: Date.now()
    };
    sessionStorage.setItem('linkedin_oauth_state', JSON.stringify(stateData));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateData.token)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  return (
    <AuthPageLayout title="Welcome back" subtitle="Sign in to your Vetted account">
      {/* Tab selector */}
      <AuthTabSelector tabs={tabs} activeType={userType} onSelect={handleUserTypeChange} />

      {/* Form area */}
      <div className="p-6 sm:p-8">
        {/* Contextual subtitle */}
        <p className="text-sm text-muted-foreground mb-6">
          {userType === "expert"
            ? "Vet & earn — connect your wallet to get started"
            : userType === "company"
            ? "Hire vetted talent — enter your credentials below"
            : "Find your next role — enter your credentials below"}
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
            <span>{error}</span>
          </div>
        )}

        {userType === "expert" ? (
          <div className="space-y-3">
            {mounted && connectors.map((connector) => (
              <button
                key={connector.id}
                type="button"
                onClick={() => handleWalletConnect(connector.id)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-border/60 bg-background/50 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted/70 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                  {connector.name === "MetaMask" ? (
                    <svg className="w-6 h-6" viewBox="0 0 318 318" xmlns="http://www.w3.org/2000/svg">
                      <path d="M274.1 35.5l-99.5 73.9L193 65.8z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M44.4 35.5l98.7 74.6-17.5-44.3zm193.9 171.3l-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M103.6 138.2l-15.8 23.9 56.3 2.5-2-60.5zm111.3 0l-39-34.8-1.3 61.2 56.2-2.5zM106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5l33.9 16.5-4.7-39.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M211.8 247.4l-33.9-16.5 2.7 22.1-.3 9.3zm-105 0l31.5 14.9-.2-9.3 2.5-22.1z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M138.8 193.5l-28.2-8.3 19.9-9.1zm40.9 0l8.3-17.4 20 9.1z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M106.8 247.4l4.8-40.6-31.3.9zM206.9 206.8l4.9 40.6 26.4-39.7zm23.8-44.7l-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-120.2 23.1l20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M87.8 162.1l23.6 46-.8-22.9zm120.3 23.1l-1 22.9 23.7-46zm-64-20.6l-5.3 28.9 6.6 34.1 1.5-44.9zm30.5 0l-2.7 18 1.2 45 6.7-34.1z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M179.8 193.5l-6.7 34.1 4.8 3.3 29.2-22.8 1-22.9zm-69.2-8.3l.8 22.9 29.2 22.8 4.8-3.3-6.6-34.1z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M180.3 262.3l.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M177.9 230.9l-4.8-3.3h-27.7l-4.8 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M278.3 114.2l8.5-40.8-12.7-37.9-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 8-7.3-6.2-4.8 8-6.1zM31.8 73.4l8.5 40.8-5.4 4 8 6.1-6.1 4.8 8 7.3-5 3.6 11.5 13.5 52.3-15.3 37-31.3L44.4 35.5z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M267.2 153.5l-52.3-15.3 15.9 23.9-23.7 46 31.2-.4h46.5zm-163.6-15.3l-52.3 15.3-17.4 54.2h46.4l31.1.4-23.6-46zm71 26.4l3.3-57.7 15.2-41.1h-67.5l15 41.1 3.5 57.7 1.2 18.2.1 44.8h27.7l.2-44.8z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : connector.name === "Coinbase Wallet" ? (
                    <svg className="w-6 h-6" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                      <rect width="1024" height="1024" rx="200" fill="#0052FF"/>
                      <path d="M512 692c-99.4 0-180-80.6-180-180s80.6-180 180-180 180 80.6 180 180-80.6 180-180 180z" fill="#fff"/>
                      <path d="M440 468h144v88H440z" fill="#0052FF"/>
                    </svg>
                  ) : (
                    <Wallet className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {connector.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connector.name === "MetaMask"
                      ? "Browser extension"
                      : connector.name === "Coinbase Wallet"
                      ? "Coinbase Wallet app"
                      : "Connect wallet"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background/50 border border-border/60 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background/50 border border-border/60 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {userType === "candidate" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/40"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-card/70 text-xs text-muted-foreground uppercase tracking-wider">
                      or
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLinkedInLogin}
                  className="w-full py-2.5 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.98]"
                >
                  <Linkedin className="w-4 h-4" />
                  Continue with LinkedIn
                </button>
              </>
            )}
          </>
        )}

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {userType === "expert" ? (
            <>
              New expert?{" "}
              <button
                onClick={() => router.push("/expert/apply")}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Apply to become an expert
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => router.push(`/auth/signup?type=${userType}`)}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </AuthPageLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
