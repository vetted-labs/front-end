"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnect, useAccount, useDisconnect, useChainId } from "wagmi";
import { expertApi, jobsApi, guildsApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";
import { HomeNavbar } from "./home/HomeNavbar";
import { WalletConnectModal } from "./home/WalletConnectModal";
import { HeroSection } from "./home/HeroSection";
import { JobBrowser } from "./home/JobBrowser";

interface Guild {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

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
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Data state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Check authentication status
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("companyAuthToken");
      const storedUserType = localStorage.getItem("userType");
      const storedEmail =
        localStorage.getItem("candidateEmail") ||
        localStorage.getItem("companyEmail");

      // Check if user is authenticated via token OR wallet connection
      const isTokenAuth = !!token;
      const isWalletAuth = !!(isConnected && address);

      setIsAuthenticated(isTokenAuth || isWalletAuth);
      setUserType(storedUserType || (isWalletAuth ? "expert" : null));
      setUserEmail(storedEmail || (isWalletAuth ? address : null));
    }
  }, [isConnected, address]);

  // Fetch guilds on mount
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const data: any = await guildsApi.getAll();
        setGuilds(data.guilds || data || []);
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
        const normalizedJobs = (Array.isArray(data) ? data : []).map(
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

  const handleLogout = () => {
    // Clear all auth data using centralized function
    clearAllAuthState();

    // Disconnect wallet if expert
    if (userType === "expert" && isConnected) {
      disconnect();
    }

    // Update state immediately
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserType(null);
    setShowUserMenu(false);

    // Use router navigation to avoid theme flash
    router.push("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showUserMenu]);

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
      if (result.success && result.data) {
        const expert = result.data;
        // Redirect based on status
        if (expert.status === "approved") {
          router.push("/expert/dashboard");
          return;
        } else if (expert.status === "pending") {
          router.push("/expert/application-pending");
          return;
        }
      }
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
        // Clear any existing auth before connecting wallet
        clearAllAuthState();

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
      // Check expert status
      checkExpertStatus(address);
    } else {
      // Show wallet modal
      setShowWalletModal(true);
    }
  };

  const handlePostJob = () => {
    if (isAuthenticated && userType === "company") {
      router.push("/dashboard");
    } else {
      router.push("/auth/signup?type=company");
    }
  };

  const handleJoinAsCandidate = () => {
    if (isAuthenticated && userType === "candidate") {
      router.push("/candidate/profile");
    } else {
      router.push("/auth/signup?type=candidate");
    }
  };

  const handleNavigateDashboard = () => {
    setShowUserMenu(false);
    if (userType === "expert") {
      router.push("/expert/dashboard");
    } else if (userType === "company") {
      router.push("/dashboard");
    } else if (userType === "candidate") {
      router.push("/candidate/profile");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background">
      {/* Navigation Header */}
      <HomeNavbar
        isAuthenticated={isAuthenticated}
        userType={userType}
        userEmail={userEmail}
        address={address}
        chainId={chainId}
        showUserMenu={showUserMenu}
        onToggleMenu={() => setShowUserMenu(!showUserMenu)}
        onFindJob={() => router.push("/browse/jobs")}
        onStartVetting={handleExpertJoin}
        onStartHiring={handlePostJob}
        onViewGuilds={() => router.push("/guilds")}
        onNavigateDashboard={handleNavigateDashboard}
        onLogout={handleLogout}
        onLogoClick={() => router.push("/")}
      />

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
