"use client";

import { useState, useEffect } from "react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { jobsApi, guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
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

  // Fetch guilds on mount
  const { data: guilds, isLoading: isLoadingGuilds } = useFetch<Guild[]>(
    () => guildsApi.getAll(),
    { onError: () => {} }
  );

  // Fetch active jobs on mount
  const { data: jobs, isLoading: isLoadingJobs } = useFetch<Job[]>(
    () => jobsApi.getAll({ status: "active" }),
    { onError: () => {} }
  );

  useMountEffect(() => {
    setMounted(true);
  });

  // Safety net: if token-based auth (candidate/company) AND wallet are present, disconnect wallet
  // Don't disconnect for experts — they authenticate via wallet
  // eslint-disable-next-line no-restricted-syntax -- disconnects wallet for non-expert auth users
  useEffect(() => {
    if (!mounted) return;
    if (auth.isAuthenticated && auth.userType !== 'expert' && isConnected && address) {
      disconnect();
    }
  }, [mounted, isConnected, address, auth.isAuthenticated, auth.userType]);

  const handleExpertJoin = () => {
    if (auth.isAuthenticated && auth.userType === "expert" && isConnected) {
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
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero Section with Action Cards */}
      <HeroSection
        guilds={guilds ?? []}
        isLoadingGuilds={isLoadingGuilds}
        onJoinAsCandidate={handleJoinAsCandidate}
        onJoinAsExpert={handleExpertJoin}
        onPostJob={handlePostJob}
      />

      {/* Stats Bar */}
      <StatsBar guilds={guilds ?? []} jobs={jobs ?? []} />

      {/* Job Browser */}
      <JobBrowser jobs={jobs ?? []} isLoadingJobs={isLoadingJobs} />

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1120px] mx-auto px-6 py-12">
          <div className="grid md:grid-cols-[1.5fr_1fr_1fr] gap-12">
            {/* Brand */}
            <div>
              <div className="font-display font-bold text-xl mb-2.5">
                vetted<span className="text-primary">.</span>
              </div>
              <p className="text-sm text-muted-foreground/50 leading-relaxed max-w-[260px]">
                The credibility layer for hiring. Expert signals you can trust.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-3.5">
                Platform
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/browse/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link href="/guilds" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Guilds
                  </Link>
                </li>
                <li>
                  <button onClick={handleExpertJoin} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Expert Portal
                  </button>
                </li>
                <li>
                  <button onClick={handlePostJob} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Post a Job
                  </button>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-3.5">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-9 pt-5 border-t border-border/20 text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Vetted. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
