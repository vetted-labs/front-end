"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Info, Mail, Lock, ArrowRight } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { Logo } from "@/components/Logo";
import { useAccount, useAccountEffect, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { candidateApi, companyApi, expertApi, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { clearTokenAuthState } from "@/lib/auth";
import { clearWalletConnectState } from "@/lib/walletConnectCleanup";
import { useAuthContext } from "@/hooks/useAuthContext";
import { isRecentExplicitLogout } from "@/contexts/AuthContext";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useApi } from "@/lib/hooks/useFetch";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthTabSelector, type AuthTab } from "@/components/auth/AuthTabSelector";

type UserType = "candidate" | "company" | "expert";

const tabs: AuthTab[] = [
  { type: "candidate", label: "Job Seeker", icon: "profile" },
  { type: "company", label: "Company", icon: "job" },
  { type: "expert", label: "Expert", icon: "guild-ranks" },
];

const EYEBROW_LABEL: Record<UserType, string> = {
  candidate: "JOB SEEKER · SIGN IN",
  company: "COMPANY · SIGN IN",
  expert: "EXPERT · SIGN IN",
};

const SUBTITLE: Record<UserType, string> = {
  candidate: "Sign in to your account to continue",
  company: "Sign in to manage your job listings",
  expert: "Connect your wallet to access your guild",
};

/**
 * Module-level cache of wallets we've already auto-logged for. Persists across
 * the StrictMode unmount/remount cycle in dev — without this, the second mount
 * sees the wallet still connected, fires `handleExpertLogin` a second time,
 * and produces a spurious duplicate "Expert login failed" log + a duplicate
 * GET /api/experts/profile request.
 */
const recentAutoLoginAttempts = new Map<string, number>();
const AUTO_LOGIN_LOCK_TTL_MS = 5_000;

function shouldAttemptAutoLogin(address: string | undefined): boolean {
  if (!address) return false;
  const key = address.toLowerCase();
  const last = recentAutoLoginAttempts.get(key);
  if (last && Date.now() - last < AUTO_LOGIN_LOCK_TTL_MS) return false;
  recentAutoLoginAttempts.set(key, Date.now());
  return true;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const typeParam = searchParams.get("type");

  const userType: UserType =
    typeParam === "company" ? "company" : typeParam === "expert" ? "expert" : "candidate";
  const auth = useAuthContext();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { execute: executeLogin, isLoading } = useApi();
  const [error, setError] = useState("");
  // True between deciding to navigate and the new route actually rendering.
  // Dev-mode Next.js can take seconds (or longer on cold-compile) to switch
  // pages, during which the login form would otherwise sit visible — making
  // users think the click did nothing.
  const [redirectingTo, setRedirectingTo] = useState<
    null | "expert/apply" | "expert/dashboard" | "expert/application-pending"
  >(null);

  const autoLoginAttempted = useRef(false);
  const pendingModalOpen = useRef(false);
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
        setRedirectingTo("expert/dashboard");
        router.push(redirectUrl || "/expert/dashboard");
      } else if (profile.status === "pending" || profile.status === "rejected") {
        auth.login("", "expert", profile.id, profile.email, walletAddress);
        localStorage.setItem("expertStatus", profile.status);
        setRedirectingTo("expert/application-pending");
        router.push("/expert/application-pending");
      } else {
        setRedirectingTo("expert/apply");
        router.push("/expert/apply");
      }
    } catch (apiError) {
      const is404 = apiError instanceof ApiError && apiError.status === 404;
      if (!is404) {
        logger.error("Expert login failed", apiError, { component: "LoginPage" });
      }

      if (apiError instanceof ApiError) {
        if (apiError.status === 404) {
          setRedirectingTo("expert/apply");
          auth.logout();
          router.push("/expert/apply");
          return;
        }
        if (apiError.status === 403) {
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

  // eslint-disable-next-line react-hooks/refs -- ref kept stable across renders so useMountEffect/useAccountEffect always call the latest handler
  handleExpertLoginRef.current = handleExpertLogin;

  // Auto-login when wallet is already connected on mount (returning user).
  useMountEffect(() => {
    clearTokenAuthState();
    setMounted(true);

    if (isRecentExplicitLogout()) return;

    const timer = setTimeout(() => {
      if (
        userType === "expert" &&
        !autoLoginAttempted.current &&
        isConnected &&
        address &&
        shouldAttemptAutoLogin(address)
      ) {
        autoLoginAttempted.current = true;
        handleExpertLoginRef.current?.(address);
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  // Auto-login when a fresh wallet connection completes via the RainbowKit modal.
  useAccountEffect({
    onConnect: ({ address: connectedAddress }) => {
      if (isRecentExplicitLogout()) return;
      if (
        userType === "expert" &&
        !autoLoginAttempted.current &&
        connectedAddress &&
        shouldAttemptAutoLogin(connectedAddress)
      ) {
        autoLoginAttempted.current = true;
        handleExpertLoginRef.current?.(connectedAddress);
      }
    },
  });

  const isWalletProviderReady = mounted && (!!openConnectModal || (isConnected && !!address));

  // After disconnect, openConnectModal only becomes available on the next render.
  // eslint-disable-next-line no-restricted-syntax -- depends on runtime wallet provider state
  useEffect(() => {
    if (pendingModalOpen.current && openConnectModal) {
      pendingModalOpen.current = false;
      try {
        openConnectModal();
      } catch (err) {
        logger.error("Failed to open wallet modal", err, { silent: true });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- rare failure path, error needs to surface to user
        setError("Failed to open wallet connection dialog. Please try again.");
      }
    }
  }, [openConnectModal]);

  const handleOpenWalletModal = () => {
    setError("");
    clearTokenAuthState();
    autoLoginAttempted.current = false;

    if (isConnected) {
      pendingModalOpen.current = true;
      disconnect();
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
          auth.login(
            data.token,
            "candidate",
            data.candidate!.id,
            data.candidate!.email,
            undefined,
            data.refreshToken
          );
          router.push(redirectUrl || "/candidate/dashboard");
        } else {
          const data = await companyApi.login(email, password);
          auth.login(
            data.token,
            "company",
            data.company!.id,
            data.company!.email,
            undefined,
            data.refreshToken
          );
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
      timestamp: Date.now(),
    };
    sessionStorage.setItem("linkedin_oauth_state", JSON.stringify(stateData));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(stateData.token)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  // While the router is mid-navigation, show a spinner instead of the login
  // form. Dev-mode route compilation (especially first hit) can take seconds.
  if (redirectingTo) {
    const label =
      redirectingTo === "expert/apply"
        ? "Setting up your application…"
        : redirectingTo === "expert/dashboard"
        ? "Loading your dashboard…"
        : "Loading your application status…";
    return (
      <div className="flex min-h-screen bg-background items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT — brand panel (desktop) */}
      <AuthBrandPanel
        eyebrow="VETTED · WEB3 HIRING"
        headline={
          <>
            Welcome
            <br />
            back to <span className="text-primary">Vetted</span>.
          </>
        }
        subhead="Sign in to keep moving on roles, reviews, and reputation — wherever you left off."
      />

      {/* Mobile top bar — logo + theme-agnostic header */}
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
        <div className="w-full max-w-[440px]">
          {/* Eyebrow + heading (desktop) */}
          <div className="hidden lg:block mb-8">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {EYEBROW_LABEL[userType]}
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight mt-2">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{SUBTITLE[userType]}</p>
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden mb-7">
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{SUBTITLE[userType]}</p>
          </div>

          {/* Tab selector card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <AuthTabSelector
              tabs={tabs}
              activeType={userType}
              onSelect={handleUserTypeChange}
            />

            <div className="p-6 sm:p-7">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
                  <span>{error}</span>
                </div>
              )}

              {userType === "expert" ? (
                <ExpertWalletPanel
                  mounted={mounted}
                  isWalletProviderReady={isWalletProviderReady}
                  onOpenWallet={handleOpenWalletModal}
                  onForceReset={handleForceResetWalletState}
                />
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field
                    label={userType === "company" ? "Company email" : "Email"}
                    icon={Mail}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        userType === "company" ? "hiring@company.com" : "you@example.com"
                      }
                      required
                      className="w-full pl-10 pr-3.5 py-3 text-sm bg-background/60 border border-border rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40 transition-all outline-none"
                    />
                  </Field>

                  <Field
                    label="Password"
                    icon={Lock}
                    trailing={
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    }
                  >
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full pl-10 pr-3.5 py-3 text-sm bg-background/60 border border-border rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40 transition-all outline-none"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

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
                        onClick={handleLinkedInLogin}
                        className="w-full py-2.5 px-4 bg-card border border-border rounded-lg text-sm font-medium text-foreground flex items-center justify-center gap-2.5 transition-all hover:border-[rgba(10,102,194,0.45)] hover:bg-[rgba(10,102,194,0.06)] hover:-translate-y-px"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0a66c2">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        Continue with LinkedIn
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>

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

interface FieldProps {
  label: string;
  icon: typeof Mail;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, icon: Icon, trailing, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
          {label}
        </label>
        {trailing}
      </div>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

interface ExpertWalletPanelProps {
  mounted: boolean;
  isWalletProviderReady: boolean;
  onOpenWallet: () => void;
  onForceReset: () => void;
}

function ExpertWalletPanel({
  mounted,
  isWalletProviderReady,
  onOpenWallet,
  onForceReset,
}: ExpertWalletPanelProps) {
  return (
    <div>
      <div className="text-center mb-5">
        <h3 className="text-sm font-semibold text-foreground">Connect your wallet</h3>
        <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed max-w-[320px] mx-auto">
          Experts authenticate with their Web3 wallet. No email or password required.
        </p>
      </div>

      {!mounted ? (
        <div className="w-full h-[52px] mb-5 rounded-lg bg-muted/30 animate-pulse" />
      ) : isWalletProviderReady ? (
        <button
          type="button"
          onClick={onOpenWallet}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
        >
          <VettedIcon name="wallet" className="w-4 h-4" />
          Connect wallet
        </button>
      ) : (
        <div className="mb-5 space-y-2">
          <div className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg bg-muted/40 text-muted-foreground text-sm font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            Initializing wallet provider…
          </div>
          <button
            type="button"
            onClick={onForceReset}
            className="text-xs text-muted-foreground/70 hover:text-primary transition-colors underline block mx-auto"
          >
            Taking too long? Reset and try again
          </button>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3.5 bg-primary/[0.04] border border-primary/10 rounded-lg">
        <Info className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
        <span className="text-[11.5px] text-muted-foreground/90 leading-relaxed">
          Expert accounts are wallet-based only. Your on-chain reputation and guild membership
          are tied directly to your wallet address. Supports MetaMask, Coinbase, Rainbow, Trust,
          and 300+ wallets via WalletConnect.
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
