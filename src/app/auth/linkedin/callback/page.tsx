"use client";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";
import { candidateApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDisconnect } from "wagmi";

/**
 * 🔐 SECURITY: Validate that a redirect path is internal (no open redirect)
 * Rejects protocol-relative URLs (//evil.com), external URLs, and javascript: URIs
 */
function isInternalPath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  // Must start with a single slash and not be protocol-relative
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  // Block javascript: and data: URIs
  const lower = path.toLowerCase().trim();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
  // Block URLs with protocol
  if (/^[a-z]+:/i.test(path)) return false;
  return true;
}

function LinkedInCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthContext();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing LinkedIn authentication...");
  const { disconnect } = useDisconnect();
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Schedule a redirect with automatic cleanup on unmount */
  const scheduleRedirect = useCallback((path: string, delayMs: number) => {
    const id = setTimeout(() => router.push(path), delayMs);
    timeoutsRef.current.push(id);
  }, [router]);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`LinkedIn authentication failed: ${error}`);
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("No authorization code received from LinkedIn");
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        // Validate OAuth state token (CSRF protection)
        const savedStateData = sessionStorage.getItem('linkedin_oauth_state');
        if (!savedStateData) {
          setStatus("error");
          setMessage("OAuth state validation failed - session expired");
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        // 🔐 SECURITY: Safely parse sessionStorage data
        let stateData: { token: string; redirect?: string; timestamp: number };
        try {
          stateData = JSON.parse(savedStateData);
        } catch {
          setStatus("error");
          setMessage("OAuth state data is corrupted - please try again");
          sessionStorage.removeItem('linkedin_oauth_state');
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        // Verify state token matches
        if (state !== stateData.token) {
          setStatus("error");
          setMessage("OAuth state validation failed - potential CSRF attack");
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        // Check state token age (max 10 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          setStatus("error");
          setMessage("OAuth state expired - please try again");
          sessionStorage.removeItem('linkedin_oauth_state');
          scheduleRedirect("/auth/login", 3000);
          return;
        }

        // Clear state token after validation
        sessionStorage.removeItem('linkedin_oauth_state');

        // Clear any existing authentication before setting up LinkedIn auth
        clearAllAuthState();
        disconnect();

        // Exchange code for user data via backend
        setMessage("Exchanging authorization code...");
        const data = await candidateApi.linkedinAuth(code);

        // Store authentication data via AuthContext
        auth.login(
          data.token,
          "candidate",
          data.candidate?.id || "",
          data.candidate?.email,
          undefined,
          data.refreshToken,
        );

        setStatus("success");
        setMessage("Successfully authenticated! Redirecting...");

        // 🔐 SECURITY: Validate redirect URL against whitelist of internal paths
        // Prevents open redirect attacks via manipulated sessionStorage
        const rawRedirect = stateData.redirect || "/candidate/dashboard";
        const safeRedirect = isInternalPath(rawRedirect) ? rawRedirect : "/candidate/dashboard";
        scheduleRedirect(safeRedirect, 1500);
      } catch (error: unknown) {
        logger.error("LinkedIn OAuth error", error, { silent: true });
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to authenticate with LinkedIn");
        scheduleRedirect("/auth/login", 3000);
      }
    };

    handleCallback();

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

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
        <style>{`
          :root { --pattern-bg: url(/pattern-light.svg); }
          .dark { --pattern-bg: url(/pattern-dark.svg); }
        `}</style>
        <Image
          src="/vetted-logo.svg"
          alt="Vetted"
          width={480}
          height={83}
          className="relative z-10"
          priority
        />
      </div>

      {/* ===== RIGHT: Callback Status ===== */}
      <div className="flex-1 lg:flex-[0_0_40%] flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            {/* Accent shimmer bar */}
            <div
              className="h-[3px]"
              style={{
                background:
                  status === "error"
                    ? "hsl(var(--destructive))"
                    : status === "success"
                    ? "hsl(142 76% 46%)"
                    : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6), hsl(var(--primary)))",
                backgroundSize: "200% 100%",
                animation: status === "loading" ? "shimmer 4s ease-in-out infinite" : "none",
              }}
            />

            <div className="p-6 sm:p-8">
              {/* LinkedIn branding */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="#0a66c2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-sm font-medium text-muted-foreground">LinkedIn Authentication</span>
              </div>

              {status === "loading" && (
                <div className="text-center">
                  <div className="mb-5 flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2 font-display">
                    Authenticating...
                  </h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "success" && (
                <div className="text-center">
                  <div className="mb-5 flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-emerald-500" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2 font-display">
                    Welcome!
                  </h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "error" && (
                <div className="text-center">
                  <div className="mb-5 flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-7 h-7 text-destructive" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2 font-display">
                    Authentication Failed
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{message}</p>
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-bold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LinkedInCallbackContent />
    </Suspense>
  );
}
