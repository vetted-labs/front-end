"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { candidateApi } from "@/lib/api";

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

        // Exchange code for user data via backend
        setMessage("Exchanging authorization code...");
        const data: any = await candidateApi.linkedinAuth(code);

        // Store authentication data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("candidateId", data.id);
        localStorage.setItem("candidateEmail", data.email);
        localStorage.setItem("userType", "candidate");
        if (data.walletAddress) {
          localStorage.setItem("candidateWallet", data.walletAddress);
        }

        setStatus("success");
        setMessage("Successfully authenticated! Redirecting...");

        // Redirect to the state value or default to profile
        const redirectUrl = state || "/candidate/profile";
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
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-indigo-600 rounded-full flex items-center justify-center">
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
                className="px-6 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all"
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
