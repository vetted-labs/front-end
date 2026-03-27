"use client";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  MapPin,
  DollarSign,
  Search,
} from "lucide-react";
import { jobsApi, getAssetUrl } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildBadgeColors } from "@/config/colors";
import { getTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Job } from "@/types";

export default function BrowsePage() {
  const { data: featuredJobs, isLoading } = useFetch<Job[]>(
    () => jobsApi.getAll({ status: 'active' }).then((response) => {
      const jobs = Array.isArray(response) ? response : [];
      return jobs.slice(0, 6); // Show top 6 featured jobs
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
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/[0.08] border border-primary/15 rounded-full px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-5">
            <Search className="w-3.5 h-3.5" />
            Decentralized Talent Marketplace
          </div>
          <h1 className="font-display text-5xl font-bold text-foreground mb-6 tracking-tight">
            Find Your Next{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary/80 bg-clip-text text-transparent">
              Web3 Opportunity
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Join a decentralized talent marketplace where expertise is validated
            by guilds and opportunities are vetted by the community.
          </p>
          <Link
            href="/browse/jobs"
            className="inline-flex items-center px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary/80 rounded-[14px] hover:opacity-90 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transform hover:-translate-y-0.5"
          >
            Find the Job for You
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
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
              <h2 className="font-display text-3xl font-bold text-foreground mt-2 tracking-tight">
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
              {featuredJobs.map((job) => {
                const guildColors = job.guild ? getGuildBadgeColors(job.guild) : null;
                return (
                  <Link
                    key={job.id}
                    href={`/browse/jobs/${job.id}`}
                    className="block bg-card/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-border/60 group overflow-hidden relative"
                  >
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-primary/[0.04] to-transparent" />

                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {job.companyLogo ? (
                            <img
                              src={getAssetUrl(job.companyLogo)}
                              alt={job.companyName || "Company"}
                              className="w-10 h-10 rounded-[10px] object-cover border border-border/60 flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="p-2 bg-muted/50 border border-border/60 rounded-[10px]">
                              <Briefcase className="w-5 h-5 text-foreground" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-muted-foreground">
                            {job.companyName || "Company"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground/50">
                          {getTimeAgo(job.createdAt)}
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">
                        {job.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {guildColors && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${guildColors.bg} ${guildColors.text} border ${guildColors.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${guildColors.dot}`} />
                            {job.guild?.replace(/ Guild$/i, "")}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-muted/30 rounded-full text-xs text-muted-foreground border border-border/40">
                          {job.type}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-border/40">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 opacity-60" />
                          {job.location}
                        </div>
                        {job.salary.min && job.salary.max && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <DollarSign className="w-3.5 h-3.5" />
                            {job.salary.min / 1000}k - {job.salary.max / 1000}k
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card/70 backdrop-blur-sm rounded-2xl border border-border/60">
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
          <h2 className="font-display text-3xl font-bold text-foreground mb-4 tracking-tight">
            Ready to Start Your Web3 Journey?
          </h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of professionals who have found their dream jobs
            through our guild-validated talent marketplace.
          </p>
          <Link
            href="/browse/jobs"
            className="inline-block px-8 py-4 bg-card text-primary rounded-[14px] hover:bg-muted transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Explore All Opportunities
          </Link>
        </div>
      </div>
    </div>
  );
}
