"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { expertApi, jobsApi, guildsApi } from "@/lib/api";
import { clearTokenAuthState } from "@/lib/auth";
import { useAuthContext } from "@/hooks/useAuthContext";
import { WalletConnectModal } from "./home/WalletConnectModal";
import { HeroSection } from "./home/HeroSection";
import { JobBrowser } from "./home/JobBrowser";
import type { Guild } from "@/types";

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min: number | null; max: number | null; currency: string };
  guild: string;
  description: string;
  requirements: string[];
  skills: string[];
  experienceLevel?: string;
  companyName?: string;
  companyLogo?: string;
  createdAt: string;
  featured?: boolean;
}

export function HomePage() {
  const router = useRouter();
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);
  const auth = useAuthContext();

  // Data state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Safety net: if token-based auth (candidate/company) AND wallet are present, disconnect wallet
    // Don't disconnect for experts — they authenticate via wallet
    if (auth.isAuthenticated && auth.userType !== 'expert' && isConnected && address) {
      disconnect();
    }
  }, [isConnected, address]);

  // Fetch guilds on mount
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const data: any = await guildsApi.getAll();
        setGuilds(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch guilds:", error);
        setGuilds([]);
      } finally {
        setIsLoadingGuilds(false);
      }
    };

    fetchGuilds();
  }, []);

  // Fetch active jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data: any = await jobsApi.getAll({ status: "active" });
        const jobsList = Array.isArray(data) ? data : [];
        const normalizedJobs = jobsList.map(
          (job: any) => ({
            ...job,
            title: job.title || "Untitled Position",
            description: job.description || "",
            guild: job.guild || "",
            department: job.department || null,
            requirements: job.requirements || [],
            skills: job.skills || [],
          })
        );
        setJobs(normalizedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        setJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobs();
  }, []);

  // Check expert status after wallet connection
  useEffect(() => {
    if (mounted && isConnected && address && shouldCheckStatus) {
      checkExpertStatus(address);
      setShouldCheckStatus(false);
    }
  }, [mounted, isConnected, address, shouldCheckStatus]);

  const checkExpertStatus = async (walletAddress: string) => {
    try {
      const result: any = await expertApi.getProfile(walletAddress);
      if (result.status === "approved") {
        auth.login("", "expert", result.id, result.email, walletAddress);
        localStorage.setItem("expertId", result.id);
        router.push("/expert/dashboard");
        return;
      } else if (result.status === "pending") {
        localStorage.setItem("expertId", result.id);
        localStorage.setItem("walletAddress", walletAddress);
        router.push("/expert/application-pending");
        return;
      }
      // Expert exists but unknown status — send to apply
      router.push("/expert/apply");
    } catch (error: any) {
      // If 404, no profile found - redirect to application (this is expected for new wallets)
      if (error.status === 404) {
        router.push("/expert/apply");
        return;
      }
      // On error, redirect to home page
      router.push("/");
    }
  };

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        // Clear token-based auth before connecting wallet — preserve wallet state
        clearTokenAuthState();

        await connect({ connector });
        setShowWalletModal(false);
        // Set flag to check status after connection completes
        setShouldCheckStatus(true);
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    }
  };

  const handleExpertJoin = () => {
    if (isConnected && address) {
      // Clear only token-based auth (candidate/company), preserve wallet state
      clearTokenAuthState();
      localStorage.setItem("userType", "expert");
      checkExpertStatus(address);
    } else {
      setShowWalletModal(true);
    }
  };

  const handlePostJob = () => {
    if (auth.isAuthenticated && auth.userType === "company") {
      router.push("/dashboard");
    } else {
      router.push("/auth/signup?type=company");
    }
  };

  const handleJoinAsCandidate = () => {
    if (auth.isAuthenticated && auth.userType === "candidate") {
      router.push("/candidate/profile");
    } else {
      router.push("/auth/signup?type=candidate");
    }
  };

  return (
    <div className="bg-gradient-to-b from-background to-background">
      {/* Hero Section with Action Cards */}
      <HeroSection
        guilds={guilds}
        isLoadingGuilds={isLoadingGuilds}
        onJoinAsCandidate={handleJoinAsCandidate}
        onJoinAsExpert={handleExpertJoin}
        onPostJob={handlePostJob}
      />

      {/* Job Browser */}
      <JobBrowser jobs={jobs} isLoadingJobs={isLoadingJobs} />

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Vetted. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Wallet Connection Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        connectors={connectors}
        onConnect={handleWalletConnect}
        mounted={mounted}
      />
    </div>
  );
}
