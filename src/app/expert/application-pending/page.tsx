"use client";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import Image from "next/image";
import {
  Clock,
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  Users,
  LogOut,
  Plus,
  Shield,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loadingstate";
import { Alert } from "@/components/ui/alert";
import { expertApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";

interface PendingExpert {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  status: string;
  appliedToGuild: {
    id: string;
    name: string;
    description: string;
  } | null;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
}

export default function ApplicationPendingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [expert, setExpert] = useState<PendingExpert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isConnected && address) {
      fetchPendingStatus();
    } else {
      router.push("/");
    }
  }, [mounted, isConnected, address]);

  const fetchPendingStatus = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getProfile(address);
      const expertData = result.data || result;

      if (expertData.status === "approved") {
        router.push("/expert/dashboard");
        return;
      }

      setExpert(expertData);
    } catch (err: any) {
      if (err.status === 404) {
        router.push("/expert/apply");
        return;
      }
      setError(err.message || "Failed to fetch application status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearAllAuthState();
    disconnect();
    router.push("/");
  };

  if (isLoading) {
    return <LoadingState message="Loading application status..." />;
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load application status"}</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {mounted && address && (
                <>
                  <div className="flex items-center px-3 py-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <span className="text-xs font-mono text-primary">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 md:p-12 mb-6">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/15 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Application Under Review
          </h1>

          {/* Applied To Guild */}
          {expert.appliedToGuild && (
            <div className="text-center mb-8">
              <p className="text-lg text-muted-foreground mb-2">Applied to</p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <p className="text-xl font-semibold text-primary">
                  {expert.appliedToGuild.name}
                </p>
              </div>
            </div>
          )}

          {/* Review Status */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{expert.reviewCount}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>

            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{expert.approvalCount}</p>
              <p className="text-sm text-muted-foreground">Approvals</p>
            </div>

            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <XCircle className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{expert.rejectionCount}</p>
              <p className="text-sm text-muted-foreground">Rejections</p>
            </div>
          </div>

          {/* Progress Info */}
          <div className="bg-primary/10 rounded-lg p-6 mb-8 border border-primary/20">
            <div className="flex items-start">
              <Shield className="w-6 h-6 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-2">Auto-Approval System</p>
                <p className="text-sm text-card-foreground leading-relaxed">
                  Your application needs <strong>1+ approval</strong> from a guild member to be
                  automatically accepted. Once approved, you&apos;ll get instant access to the expert
                  dashboard and join the guild as a &quot;Recruit&quot;.
                </p>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start text-left p-4 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-1">Application Received</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve successfully received your application and wallet information.
                </p>
              </div>
            </div>

            <div className="flex items-start text-left p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Clock className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-1">Under Guild Review</p>
                <p className="text-sm text-muted-foreground">
                  Guild members are reviewing your credentials. You currently have{" "}
                  {expert.approvalCount} approval(s).
                </p>
              </div>
            </div>

            <div className="flex items-start text-left p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Mail className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-1">Auto-Approval Pending</p>
                <p className="text-sm text-muted-foreground">
                  Once you receive 1+ approval, you&apos;ll automatically be accepted as a &quot;Recruit&quot;
                  member and gain access to the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Apply to Another Guild */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Want to Apply to Another Guild?
          </h2>
          <p className="text-muted-foreground mb-4">
            While your current application is under review, you can apply to other guilds
          </p>
          <button
            onClick={() => router.push("/expert/apply")}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-900 bg-gradient-to-r from-primary to-accent rounded-lg hover:opacity-90  transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Apply to Another Guild
          </button>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
