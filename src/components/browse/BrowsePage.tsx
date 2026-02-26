"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Users,
  Briefcase,
  TrendingUp,
  MapPin,
  DollarSign,
  Building2,
} from "lucide-react";
import { jobsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface FeaturedJob {
  id: string;
  title: string;
  department: string | null;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min: number | null; max: number | null; currency: string };
  guild: string;
  description: string;
  companyName?: string;
}

interface TalentMetrics {
  totalHired: number;
  activeJobs: number;
  totalCandidates: number;
  averageSalary: number;
}

export default function BrowsePage() {
  const [metrics] = useState<TalentMetrics>({
    // Mock metrics - in production, fetch from API
    totalHired: 1247,
    activeJobs: 89,
    totalCandidates: 3542,
    averageSalary: 125000,
  });

  const { data: featuredJobs, isLoading } = useFetch<FeaturedJob[]>(
    () => jobsApi.getAll({ status: 'active' }).then((response) => {
      const jobs = Array.isArray(response) ? response : [];
      const normalizedJobs: FeaturedJob[] = jobs.map((job) => ({
        id: job.id,
        title: job.title || 'Untitled Position',
        description: job.description || '',
        guild: job.guild || '',
        department: job.department || null,
        location: job.location,
        type: job.type,
        salary: job.salary,
        companyName: job.companyName,
      }));
      return normalizedJobs.slice(0, 6); // Show top 6 featured jobs
    }),
    {
      onError: (err) => {
        toast.error("Failed to load data");
        logger.error("Failed to load featured jobs", err, { silent: true });
      },
    }
  );

  return (
    <div className="min-h-full animate-page-enter">
      {/* Hero Section with Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Find Your Next{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary/80 bg-clip-text text-transparent">
              Web3 Opportunity
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join a decentralized talent marketplace where expertise is validated
            by guilds and opportunities are vetted by the community.
          </p>
          <Link
            href="/browse/jobs"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-primary via-accent to-primary/80 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Find the Job for You
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted/50 border border-border/60 rounded-xl">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.totalHired.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Talent Hired</p>
          </div>

          <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted/50 border border-border/60 rounded-xl">
                <Briefcase className="w-6 h-6 text-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.activeJobs}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Active Jobs</p>
          </div>

          <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted/50 border border-border/60 rounded-xl">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.totalCandidates.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Registered Candidates</p>
          </div>

          <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted/50 border border-border/60 rounded-xl">
                <DollarSign className="w-6 h-6 text-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              ${(metrics.averageSalary / 1000).toFixed(0)}k
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Average Salary</p>
          </div>
        </div>
      </div>

      {/* Featured Jobs Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Opportunities
              </span>
              <h2 className="text-3xl font-bold text-foreground mt-2">
                Featured Jobs
              </h2>
              <p className="text-muted-foreground mt-2">
                Top opportunities from leading Web3 organizations
              </p>
            </div>
            <Link
              href="/browse/jobs"
              className="text-primary hover:text-primary font-medium flex items-center gap-2"
            >
              View All Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? null : featuredJobs && featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/browse/jobs/${job.id}`}
                  className="block bg-card/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-border/60 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-muted/50 border border-border/60 rounded-lg">
                      <Briefcase className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="px-3 py-1 bg-muted/50 text-muted-foreground border border-border/60 rounded-full text-xs font-medium">
                      {job.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>

                  {job.companyName && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Building2 className="w-4 h-4" />
                      {job.companyName}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-muted/50 rounded-md text-xs text-muted-foreground border border-border/60">
                      {job.guild}
                    </span>
                    {job.department && (
                      <span className="px-2 py-1 bg-muted/50 rounded-md text-xs text-muted-foreground border border-border/60">
                        {job.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    {job.salary.min && job.salary.max && (
                      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <DollarSign className="w-4 h-4" />
                        {job.salary.min / 1000}k - {job.salary.max / 1000}k
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-xl">
              <p className="text-muted-foreground mb-4">
                No featured jobs available at the moment
              </p>
              <Link
                href="/browse/jobs"
                className="text-primary hover:text-primary font-medium"
              >
                Browse All Jobs →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-card-glow border border-border/60 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Start Your Web3 Journey?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have found their dream jobs
            through our guild-validated talent marketplace.
          </p>
          <Link
            href="/browse/jobs"
            className="inline-block px-8 py-4 bg-card text-primary rounded-xl hover:bg-muted transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Explore All Opportunities
          </Link>
        </div>
      </div>
    </div>
  );
}
