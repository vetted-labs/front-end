"use client";
import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  User,
  Building2,
  Shield,
  Wallet,
  Users,
  Briefcase,
  Star,
  Info,
} from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { sepolia } from "wagmi/chains";
import { candidateApi, companyApi, expertApi, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { clearTokenAuthState } from "@/lib/auth";
import { useAuthContext } from "@/hooks/useAuthContext";
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
  const { connectAsync, connectors: allConnectors } = useConnect();
  const connectors = allConnectors.filter(
    (c) => c.id === "metaMaskSDK" || c.id === "metaMask" || c.id === "coinbaseWalletSDK"
  );
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
        router.push("/expert/dashboard");
      } else if (profile.status === "pending") {
        auth.login("", "expert", profile.id, profile.email, walletAddress);
        localStorage.setItem("expertStatus", "pending");
        router.push("/expert/application-pending");
      } else {
        router.push("/expert/apply");
      }
    } catch (apiError) {
      if (apiError instanceof ApiError && apiError.status === 404) {
        auth.logout();
        router.push("/expert/apply");
        return;
      }
      setError("Failed to verify expert status. Please try again.");
    }
  };

  handleExpertLoginRef.current = handleExpertLogin;

  useMountEffect(() => {
    clearTokenAuthState();
    setMounted(true);

    const timer = setTimeout(() => {
      if (userType === "expert" && !autoLoginAttempted.current && isConnected && address) {
        autoLoginAttempted.current = true;
        handleExpertLoginRef.current?.(address);
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) return;

    setError("");
    clearTokenAuthState();

    try {
      if (isConnected && address) {
        await handleExpertLogin(address);
        return;
      }
      const result = await connectAsync({ connector, chainId: sepolia.id });
      await handleExpertLogin(result.accounts[0]);
    } catch (error) {
      logger.error("Failed to connect wallet", error, { silent: true });
      setError("Failed to connect wallet. Please try again.");
    }
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
      {/* ===== LEFT: Brand Showcase (hidden on mobile) ===== */}
      <div className="hidden lg:flex flex-[0_0_60%] relative flex-col items-center justify-center p-16 overflow-hidden">
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Dot overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none bg-primary/[0.12] animate-glow-pulse" />
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none bg-info-blue/[0.08] animate-glow-pulse" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none bg-[rgba(139,92,246,0.06)] animate-glow-pulse" style={{ animationDelay: "8s" }} />

        {/* Floating geometric shapes */}
        <div className="absolute top-[12%] right-[15%] w-[120px] h-[120px] border border-border/20 rounded-xl rotate-[15deg] pointer-events-none animate-[spin_30s_linear_infinite]" />
        <div className="absolute bottom-[18%] left-[12%] w-[80px] h-[80px] border border-border/20 rounded-full pointer-events-none animate-[spin_24s_linear_infinite_reverse]" />
        <div className="absolute top-[55%] right-[8%] w-[60px] h-[60px] border border-border/20 rounded-xl rotate-45 pointer-events-none animate-[spin_36s_linear_infinite]" />

        {/* Brand content */}
        <div className="relative z-10 text-center max-w-[560px]">
          <h1 className="text-7xl sm:text-8xl font-bold tracking-[0.12em] leading-none text-foreground mb-4">
            VETTED
          </h1>
          <p className="text-sm sm:text-sm text-muted-foreground mb-14">
            Decentralized Hiring, Verified Talent
          </p>

          {/* Stat pills */}
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border/30 rounded-full text-sm font-medium text-muted-foreground animate-float">
              <Users className="w-4 h-4 opacity-60" />
              <span><span className="text-primary font-bold">2,400+</span> Experts</span>
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border/30 rounded-full text-sm font-medium text-muted-foreground animate-float" style={{ animationDelay: "2s" }}>
              <Briefcase className="w-4 h-4 opacity-60" />
              <span><span className="text-primary font-bold">180+</span> Companies</span>
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border/30 rounded-full text-sm font-medium text-muted-foreground animate-float" style={{ animationDelay: "4s" }}>
              <Star className="w-4 h-4 opacity-60" />
              <span><span className="text-primary font-bold">15</span> Guilds</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT: Auth Form ===== */}
      <div className="flex-1 lg:flex-[0_0_40%] flex items-center justify-center p-6 sm:p-8 relative z-10">
        {/* Vertical separator line (desktop only) */}
        <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-border/30" />

        <div className="w-full max-w-[420px]">
          {/* Auth card */}
          <div className="bg-card border border-border/30 rounded-[20px] overflow-hidden">
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
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
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

                  <div className="space-y-3 mb-6">
                    {mounted && connectors.map((connector) => (
                      <button
                        key={connector.id}
                        type="button"
                        onClick={() => handleWalletConnect(connector.id)}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-all hover:-translate-y-px group"
                        style={
                          connector.name === "MetaMask"
                            ? { ["--hover-border" as string]: "rgba(226,118,27,0.5)" }
                            : { ["--hover-border" as string]: "rgba(0,82,255,0.5)" }
                        }
                      >
                        {connector.name === "MetaMask" ? (
                          <>
                            <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 318 318" xmlns="http://www.w3.org/2000/svg">
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
                            MetaMask
                          </>
                        ) : connector.name === "Coinbase Wallet" ? (
                          <>
                            <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                              <rect width="1024" height="1024" rx="200" fill="#0052FF"/>
                              <path d="M512 692c-99.4 0-180-80.6-180-180s80.6-180 180-180 180 80.6 180 180-80.6 180-180 180z" fill="#fff"/>
                              <path d="M440 468h144v88H440z" fill="#0052FF"/>
                            </svg>
                            Coinbase Wallet
                          </>
                        ) : (
                          <>
                            <Wallet className="w-5 h-5 text-muted-foreground" />
                            {connector.name}
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Wallet note */}
                  <div className="flex items-start gap-2 p-3.5 bg-primary/[0.04] border border-primary/10 rounded-[10px] text-left">
                    <Info className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Expert accounts are wallet-based only. Your on-chain reputation and guild membership are tied directly to your wallet address.
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
                        className="w-full px-4 py-3 text-sm bg-card border border-border rounded-[10px] focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-border hover:bg-card"
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
                        className="w-full px-4 py-3 text-sm bg-card border border-border rounded-[10px] focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-border hover:bg-card"
                        placeholder="Enter your password"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 mt-2 bg-primary text-primary-foreground rounded-[10px] font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0"
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
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-xs text-muted-foreground/40 uppercase tracking-wider font-medium">or continue with</span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>

                      <button
                        type="button"
                        onClick={handleLinkedInLogin}
                        className="w-full py-3 px-4 bg-card border rounded-[10px] font-medium text-sm text-foreground flex items-center justify-center gap-2.5 transition-all hover:-translate-y-px hover:bg-[rgba(10,102,194,0.08)] hover:shadow-[0_2px_16px_rgba(10,102,194,0.15)]"
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
