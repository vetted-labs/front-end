"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { candidateApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";

function LinkedInCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing LinkedIn authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`LinkedIn authentication failed: ${error}`);
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("No authorization code received from LinkedIn");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        // Validate OAuth state token (CSRF protection)
        const savedStateData = sessionStorage.getItem('linkedin_oauth_state');
        if (!savedStateData) {
          setStatus("error");
          setMessage("OAuth state validation failed - session expired");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        const stateData = JSON.parse(savedStateData);

        // Verify state token matches
        if (state !== stateData.token) {
          setStatus("error");
          setMessage("OAuth state validation failed - potential CSRF attack");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        // Check state token age (max 10 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          setStatus("error");
          setMessage("OAuth state expired - please try again");
          sessionStorage.removeItem('linkedin_oauth_state');
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        // Clear state token after validation
        sessionStorage.removeItem('linkedin_oauth_state');

        // Clear any existing authentication before setting up LinkedIn auth
        clearAllAuthState();

        // Exchange code for user data via backend
        setMessage("Exchanging authorization code...");
        const data: any = await candidateApi.linkedinAuth(code);

        // Store authentication data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("candidateId", data.id);
        localStorage.setItem("candidateEmail", data.email);
        localStorage.setItem("userType", "candidate");

        setStatus("success");
        setMessage("Successfully authenticated! Redirecting...");

        // Redirect to the saved redirect URL
        const redirectUrl = stateData.redirect || "/candidate/profile";
        setTimeout(() => router.push(redirectUrl), 1500);
      } catch (error: any) {
        console.error("LinkedIn OAuth error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to authenticate with LinkedIn");
        setTimeout(() => router.push("/auth/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 border max-w-md w-full">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Authenticating with LinkedIn
              </h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Success!
              </h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-destructive mb-3">
                Authentication Failed
              </h1>
              <p className="text-muted-foreground mb-4">{message}</p>
              <button
                onClick={() => router.push("/auth/login")}
                className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-gray-900 dark:text-gray-900 rounded-lg hover:opacity-90 transition-all"
              >
                Back to Login
              </button>
            </>
          )}
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
