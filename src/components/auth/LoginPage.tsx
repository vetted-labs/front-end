"use client";
import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  User,
  Building2,
  Shield,
  Wallet,
  Info,
} from "lucide-react";
import Image from "next/image";
import { useAccount, useAccountEffect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { candidateApi, companyApi, expertApi, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { clearTokenAuthState } from "@/lib/auth";
import { clearWalletConnectState } from "@/lib/walletConnectCleanup";
import { useAuthContext } from "@/hooks/useAuthContext";
import { isRecentExplicitLogout } from "@/contexts/AuthContext";
import { Divider } from "@/components/ui/divider";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useApi } from "@/lib/hooks/useFetch";

type UserType = "candidate" | "company" | "expert";

interface TabDef {
  type: UserType;
  label: string;
  icon: typeof User;
}

const tabs: TabDef[] = [
  { type: "candidate", label: "Job Seeker", icon: User },
  { type: "company", label: "Company", icon: Building2 },
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
  const { openConnectModal } = useConnectModal();
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { execute: executeLogin, isLoading } = useApi();
  const [error, setError] = useState("");

  const autoLoginAttempted = useRef(false);
  const handleExpertLoginRef = useRef<((addr: string) => Promise<void>) | undefined>(undefined);

  const handleUserTypeChange = (newType: string) => {
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    if (redirectUrl) {
      params.set("redirect", redirectUrl);
    }
    router.push(`/auth/login?${params.toString()}`);
  };

  const handleExpertLogin = async (walletAddress: string) => {
    try {
      const profile = await expertApi.getProfile(walletAddress);
      if (profile.status === "approved") {
        auth.login("", "expert", profile.id, profile.email, walletAddress);
        localStorage.setItem("expertId", profile.id);
        localStorage.setItem("expertStatus", "approved");
        router.push(redirectUrl || "/expert/dashboard");
      } else if (profile.status === "pending" || profile.status === "rejected") {
        // Both in-progress ("pending") and terminal rejection share the same
        // status page — ApplicationPendingPage renders a different variant
        // based on profile.status. Log the user in so the page can fetch
        // their profile via expertApi.getProfile.
        auth.login("", "expert", profile.id, profile.email, walletAddress);
        localStorage.setItem("expertStatus", profile.status);
        router.push("/expert/application-pending");
      } else {
        router.push("/expert/apply");
      }
    } catch (apiError) {
      logger.error("Expert login failed", apiError, { component: "LoginPage" });

      if (apiError instanceof ApiError) {
        if (apiError.status === 404) {
          // Expert doesn't exist yet — send them to the application flow
          auth.logout();
          router.push("/expert/apply");
          return;
        }
        if (apiError.status === 403) {
          // Suspended / banned / truly blocked accounts
          setError(
            "Your expert account is not active. Please contact support if you think this is a mistake."
          );
          return;
        }
        setError(
          `Failed to verify expert status: ${apiError.message || apiError.statusText} (${apiError.status})`
        );
        return;
      }
      const message = apiError instanceof Error ? apiError.message : "Unknown error";
      setError(`Failed to verify expert status. ${message}`);
    }
  };

  handleExpertLoginRef.current = handleExpertLogin;

  // Auto-login when wallet is already connected on mount (e.g. returning user).
  // Skipped if the user JUST clicked Disconnect — we want them to pick a wallet
  // explicitly instead of silently reconnecting to the same one.
  useMountEffect(() => {
    clearTokenAuthState();
    setMounted(true);

    if (isRecentExplicitLogout()) return;

    const timer = setTimeout(() => {
      if (userType === "expert" && !autoLoginAttempted.current && isConnected && address) {
        autoLoginAttempted.current = true;
        handleExpertLoginRef.current?.(address);
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  // Auto-login when a fresh wallet connection completes via the RainbowKit modal.
  // Same logout-guard applies — if the user explicitly disconnected, the modal
  // must be opened manually by them, not auto-fired from a stale session.
  useAccountEffect({
    onConnect: ({ address: connectedAddress }) => {
      if (isRecentExplicitLogout()) return;
      if (userType === "expert" && !autoLoginAttempted.current && connectedAddress) {
        autoLoginAttempted.current = true;
        handleExpertLoginRef.current?.(connectedAddress);
      }
    },
  });

  // RainbowKit's useConnectModal returns undefined until its provider context
  // finishes initializing. Treat the provider as "ready" only once we're past
  // mount AND openConnectModal exists — OR the user already has a connected
  // wallet (in which case we'll retry login directly, no modal needed).
  const isWalletProviderReady = mounted && (!!openConnectModal || (isConnected && !!address));

  const handleOpenWalletModal = () => {
    setError("");
    clearTokenAuthState();
    // Reset so useAccountEffect can re-trigger login after disconnect + reconnect
    autoLoginAttempted.current = false;

    // If wallet is already connected, just retry the login directly instead of
    // opening the modal (which would only show the already-connected state)
    if (isConnected && address) {
      autoLoginAttempted.current = true;
      handleExpertLogin(address);
      return;
    }

    if (!openConnectModal) {
      setError("Wallet provider is still initializing. Please wait a moment and try again.");
      return;
    }

    try {
      openConnectModal();
    } catch (err) {
      logger.error("Failed to open wallet modal", err, { silent: true });
      setError("Failed to open wallet connection dialog. Please try again.");
    }
  };

  const handleForceResetWalletState = () => {
    const { keysCleared } = clearWalletConnectState();
    logger.info(`Cleared ${keysCleared} WalletConnect state keys`);
    // Full reload lets wagmi + RainbowKit re-initialize from scratch
    window.location.reload();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    await executeLogin(
      async () => {
        if (userType === "candidate") {
          const data = await candidateApi.login(email, password);
          auth.login(data.token, "candidate", data.candidate!.id, data.candidate!.email, undefined, data.refreshToken);
          router.push(redirectUrl || "/candidate/dashboard");
        } else {
          const data = await companyApi.login(email, password);
          auth.login(data.token, "company", data.company!.id, data.company!.email, undefined, data.refreshToken);
          router.push(redirectUrl || "/dashboard");
        }
        return null;
      },
      {
        onError: (errorMsg) => {
          logger.error("Login failed", errorMsg, { silent: true });
          setError(errorMsg);
        },
      }
    );
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

  const subtitleText = userType === "expert"
    ? "Connect your wallet to access your guild"
    : userType === "company"
    ? "Sign in to manage your job listings"
    : "Sign in to your account to continue";

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== LEFT: Brand Banner (hidden on mobile) ===== */}
      <div
        className="hidden lg:flex flex-[0_0_60%] relative items-center justify-center overflow-hidden bg-[#E7E6E4] dark:bg-[#111113]"
        style={{
          backgroundImage: "var(--pattern-bg)",
          backgroundSize: "100% auto",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "center",
        }}
      >
        {/* Light pattern (set via CSS custom property) */}
        <style>{`
          :root { --pattern-bg: url(/pattern-light.svg); }
          .dark { --pattern-bg: url(/pattern-dark.svg); }
        `}</style>
        {/* Centered VETTED logo */}
        <Image
          src="/vetted-logo.svg"
          alt="Vetted"
          width={480}
          height={83}
          className="relative z-10"
          priority
        />
      </div>

      {/* ===== RIGHT: Auth Form ===== */}
      <div className="flex-1 lg:flex-[0_0_40%] flex items-center justify-center p-6 sm:p-8 relative z-10">
        {/* Vertical separator line (desktop only) */}
        <Divider orientation="vertical" className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] opacity-30" />

        <div className="w-full max-w-[420px]">
          {/* Auth card */}
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            {/* Accent shimmer bar */}
            <div
              className="h-[3px]"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6), hsl(var(--primary)))",
                backgroundSize: "200% 100%",
                animation: "shimmer 4s ease-in-out infinite",
              }}
            />

            <div className="p-6 sm:p-8">
              {/* Title */}
              <h2 className="text-2xl font-bold text-foreground mb-1 font-display">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-7">{subtitleText}</p>

              {/* Tab selector */}
              <div className="flex bg-muted/20 rounded-xl p-1 mb-7">
                {tabs.map((tab) => {
                  const isActive = userType === tab.type;
                  return (
                    <button
                      key={tab.type}
                      type="button"
                      onClick={() => handleUserTypeChange(tab.type)}
                      className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-[9px] transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground/70"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
                  <span>{error}</span>
                </div>
              )}

              {/* Expert panel: wallet connect */}
              {userType === "expert" ? (
                <div className="text-center">
                  <h3 className="text-sm font-bold text-foreground mb-1">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Experts authenticate with their Web3 wallet. No email or password required.
                  </p>

                  {!mounted ? (
                    // SSR / pre-hydration skeleton — prevents hydration mismatch
                    <div className="w-full h-[54px] mb-6 rounded-xl bg-muted/30 animate-pulse" />
                  ) : isWalletProviderReady ? (
                    <button
                      type="button"
                      onClick={handleOpenWalletModal}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                    >
                      <Wallet className="w-5 h-5" />
                      {isConnected && address ? "Continue with Connected Wallet" : "Connect Wallet"}
                    </button>
                  ) : (
                    // RainbowKit modal context not ready yet — show loading state
                    // with an escape hatch for users stuck in this state
                    <div className="mb-6 space-y-2">
                      <div className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-muted/40 text-muted-foreground text-sm font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Initializing wallet provider...
                      </div>
                      <button
                        type="button"
                        onClick={handleForceResetWalletState}
                        className="text-xs text-muted-foreground/70 hover:text-primary transition-colors underline"
                      >
                        Taking too long? Reset and try again
                      </button>
                    </div>
                  )}

                  {/* Wallet note */}
                  <div className="flex items-start gap-2 p-4 bg-primary/[0.04] border border-primary/10 rounded-lg text-left">
                    <Info className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Expert accounts are wallet-based only. Your on-chain reputation and guild membership are tied directly to your wallet address. Supports MetaMask, Coinbase, Rainbow, Trust, and 300+ wallets via WalletConnect.
                    </span>
                  </div>
                </div>
              ) : (
                /* Candidate / Company panels: email + password form */
                <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground/80 mb-1">
                        {userType === "company" ? "Company Email" : "Email"}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-border hover:bg-card"
                        placeholder={userType === "company" ? "hiring@company.com" : "you@example.com"}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground/80 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-border hover:bg-card"
                        placeholder="Enter your password"
                        required
                      />
                      <div className="flex justify-end mt-1">
                        <a
                          href="/auth/forgot-password"
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </a>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 mt-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </form>

                  {userType === "candidate" && (
                    <>
                      <div className="flex items-center gap-4 my-6">
                        <Divider className="flex-1 opacity-30" />
                        <span className="text-xs text-muted-foreground/40 uppercase tracking-wider font-medium">or continue with</span>
                        <Divider className="flex-1 opacity-30" />
                      </div>

                      <button
                        type="button"
                        onClick={handleLinkedInLogin}
                        className="w-full py-3 px-4 bg-card border rounded-lg font-medium text-sm text-foreground flex items-center justify-center gap-3 transition-all hover:-translate-y-px hover:bg-[rgba(10,102,194,0.08)] hover:shadow-[0_2px_16px_rgba(10,102,194,0.15)]"
                        style={{ borderColor: "rgba(10,102,194,0.3)" }}
                      >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#0a66c2">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
