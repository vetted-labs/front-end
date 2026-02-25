"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { jobsApi, guildsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Logo } from "@/components/Logo";
import { HeroSection } from "./home/HeroSection";
import { StatsBar } from "./home/StatsBar";
import { JobBrowser } from "./home/JobBrowser";
import type { Guild, Job } from "@/types";

export function HomePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  const auth = useAuthContext();

  // Data state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safety net: if token-based auth (candidate/company) AND wallet are present, disconnect wallet
  // Don't disconnect for experts — they authenticate via wallet
  useEffect(() => {
    if (!mounted) return;
    if (auth.isAuthenticated && auth.userType !== 'expert' && isConnected && address) {
      disconnect();
    }
  }, [mounted, isConnected, address, auth.isAuthenticated, auth.userType]);

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

  const handleExpertJoin = () => {
    if (auth.isAuthenticated && auth.userType === "expert") {
      router.push("/expert/dashboard");
    } else {
      router.push("/auth/login?type=expert");
    }
  };

  const handlePostJob = () => {
    if (auth.isAuthenticated && auth.userType === "company") {
      router.push("/dashboard");
    } else {
      router.push("/auth/login?type=company");
    }
  };

  const handleJoinAsCandidate = () => {
    if (auth.isAuthenticated && auth.userType === "candidate") {
      router.push("/candidate/profile");
    } else {
      router.push("/auth/login?type=candidate");
    }
  };

  return (
    <div className="bg-gradient-to-b from-background to-background animate-page-enter">
      {/* Hero Section with Action Cards */}
      <HeroSection
        guilds={guilds}
        isLoadingGuilds={isLoadingGuilds}
        onJoinAsCandidate={handleJoinAsCandidate}
        onJoinAsExpert={handleExpertJoin}
        onPostJob={handlePostJob}
      />

      {/* Stats Bar */}
      <StatsBar guilds={guilds} jobs={jobs} />

      {/* Job Browser */}
      <JobBrowser jobs={jobs} isLoadingJobs={isLoadingJobs} />

      {/* Footer */}
      <footer className="bg-card/30 backdrop-blur-sm border-t border-border/40 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              <Logo size="md" />
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Decentralized hiring powered by reputation-staked expert guilds.
                Transparent, accountable, on-chain.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] font-semibold text-foreground mb-4">
                Platform
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/browse/jobs"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guilds"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Explore Guilds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get Started */}
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] font-semibold text-foreground mb-4">
                Get Started
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={handleJoinAsCandidate}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Find Work
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleExpertJoin}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Become an Expert
                  </button>
                </li>
                <li>
                  <button
                    onClick={handlePostJob}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Post a Job
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Vetted. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
