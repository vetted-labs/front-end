"use client";

import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Star,
  TrendingUp,
  User,
  Wallet,
  LucideIcon,
} from "lucide-react";
import { apiRequest, getAssetUrl } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch } from "@/lib/hooks/useFetch";
import { formatDateMonthYear, truncateAddress } from "@/lib/utils";
import { getPersonAvatar } from "@/lib/avatars";
import { STATUS_COLORS } from "@/config/colors";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PatternBackground } from "@/components/ui/pattern-background";
import { DataSection } from "@/lib/motion";
import { toast } from "sonner";
import type { CandidateProfile, SocialLink } from "@/types";

// ── Extended profile shape returned by the /profile endpoint ──
interface CandidatePublicProfile extends CandidateProfile {
  applicationCount?: number;
  endorsementCount?: number;
  avgGuildScore?: number | null;
  profilePictureUrl?: string;
  createdAt?: string;
  location?: string;
}

// ── Guild membership shape returned by the /guilds endpoint ──
interface CandidateGuildMembership {
  guildId: string;
  guildName: string;
  description: string;
  category?: string;
  membershipStatus: string;
  joinedAt?: string;
  appliedAt?: string;
}

interface CandidateProfileViewProps {
  candidateId: string;
}

// ── Stat Cell ──
interface StatCellProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

function StatCell({ icon: Icon, value, label }: StatCellProps) {
  return (
    <div className="rounded-xl border border-border p-5 text-center transition-all hover:border-primary/30">
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-2xl font-bold font-display text-foreground mb-0.5">
        {value}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ── Social Link Icon Resolver ──
function getSocialIcon(platform: string): LucideIcon {
  switch (platform.toLowerCase()) {
    case "linkedin":
      return Linkedin;
    case "github":
      return Github;
    default:
      return ExternalLink;
  }
}

// ── Guild membership status → STATUS_COLORS mapping ──
function getGuildStatusColors(status: string) {
  switch (status) {
    case "approved":
    case "active":
      return STATUS_COLORS.positive;
    case "pending":
      return STATUS_COLORS.pending;
    case "rejected":
      return STATUS_COLORS.negative;
    default:
      return STATUS_COLORS.neutral;
  }
}

// ── Loading Skeleton ──
function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-5">
      {/* Hero skeleton */}
      <div className="rounded-[14px] border border-border overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/10 to-primary/5" />
        <div className="px-6 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Skeleton className="w-24 h-24 rounded-full ring-4 ring-background flex-shrink-0" />
            <div className="flex-1 pt-2 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-72" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 text-center">
            <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2.5" />
            <Skeleton className="h-7 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-[14px] border border-border p-6">
            <Skeleton className="h-4 w-16 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="rounded-[14px] border border-border p-6">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-[14px] border border-border p-6">
            <Skeleton className="h-4 w-12 mb-4" />
            <Skeleton className="h-9 w-full rounded-lg mb-2" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="rounded-[14px] border border-border p-6">
            <Skeleton className="h-4 w-16 mb-4" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CandidateProfileView({ candidateId }: CandidateProfileViewProps) {
  const { userType, userId } = useAuthContext();

  const isOwner = userType === "candidate" && userId === candidateId;

  // Primary profile data (uses the authenticated profile endpoint for stats)
  const {
    data: profile,
    isLoading,
    error,
  } = useFetch<CandidatePublicProfile>(
    () =>
      apiRequest<CandidatePublicProfile>(
        `/api/candidates/${candidateId}/profile`,
        { method: "GET" }
      ),
    {
      onError: (message) => {
        toast.error(message);
      },
    }
  );

  // Guild memberships (only available for owner — endpoint requires candidate token)
  const { data: guildMemberships } = useFetch<CandidateGuildMembership[]>(
    () =>
      apiRequest<CandidateGuildMembership[]>(
        `/api/candidates/${candidateId}/guilds`,
        { requiresAuth: true }
      ),
    {
      skip: !isOwner,
      onError: () => {
        // Silently fail — guild memberships are supplementary
      },
    }
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <PatternBackground mask="none" className="!opacity-[0.80] dark:!opacity-[0.28]" />
        <div className="relative z-10">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="rounded-[14px] border border-border bg-card p-12 max-w-md w-full">
          <EmptyState
            icon={User}
            title="Candidate Not Found"
            description={error || "The candidate profile you're looking for doesn't exist."}
          />
        </div>
      </div>
    );
  }

  // ── Derived values ──
  const joinDate = profile.createdAt
    ? formatDateMonthYear(profile.createdAt, "long")
    : null;

  const socialLinks: SocialLink[] = profile.socialLinks?.length
    ? profile.socialLinks
    : [
        ...(profile.linkedIn
          ? [{ platform: "linkedin", label: "LinkedIn", url: profile.linkedIn }]
          : []),
        ...(profile.github
          ? [{ platform: "github", label: "GitHub", url: profile.github }]
          : []),
      ];

  const hasLinks = socialLinks.length > 0 || !!profile.resumeUrl;
  const skills = profile.skills ?? [];
  const guilds = guildMemberships ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <PatternBackground mask="none" className="!opacity-[0.80] dark:!opacity-[0.28]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <DataSection isLoading={isLoading}>
          {/* ═══ Hero Card ═══ */}
          <div className="rounded-[14px] border border-border bg-card overflow-hidden animate-fade-up">
            {/* Gradient header band */}
            <div className="h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />

            {/* Profile info overlapping the gradient */}
            <div className="px-6 sm:px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full ring-4 ring-background bg-muted overflow-hidden">
                    <img
                      src={
                        profile.profilePictureUrl ||
                        getPersonAvatar(profile.fullName)
                      }
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getPersonAvatar(profile.fullName);
                      }}
                    />
                  </div>
                </div>

                {/* Name, headline, meta */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground truncate">
                        {profile.fullName}
                      </h1>
                      {profile.headline && (
                        <p className="text-base text-muted-foreground mt-0.5 line-clamp-2">
                          {profile.headline}
                        </p>
                      )}
                    </div>

                    {isOwner && (
                      <Link
                        href="/candidate/profile"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Profile
                      </Link>
                    )}
                  </div>

                  {/* Meta badges row */}
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    {profile.experienceLevel && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15 text-xs font-medium text-primary">
                        <Briefcase className="w-3 h-3" />
                        {profile.experienceLevel}
                      </span>
                    )}
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {profile.location}
                      </span>
                    )}
                    {joinDate && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {joinDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Stats Row ═══ */}
          <div className="grid grid-cols-3 gap-4 mt-5 animate-fade-up animate-delay-100">
            <StatCell
              icon={Briefcase}
              value={profile.applicationCount ?? 0}
              label="Applications"
            />
            <StatCell
              icon={TrendingUp}
              value={profile.endorsementCount ?? 0}
              label="Endorsements"
            />
            <StatCell
              icon={Star}
              value={
                profile.avgGuildScore != null
                  ? profile.avgGuildScore.toFixed(1)
                  : "N/A"
              }
              label="Avg Guild Score"
            />
          </div>

          {/* ═══ Content Grid: Main (2/3) + Sidebar (1/3) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
            {/* ── Main Column ── */}
            <div className="lg:col-span-2 space-y-5">
              {/* About */}
              {profile.bio && (
                <div className="rounded-[14px] border border-border bg-card p-6 animate-fade-up animate-delay-200">
                  <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
                    About
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="rounded-[14px] border border-border bg-card p-6 animate-fade-up animate-delay-300">
                  <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full bg-muted text-sm text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Guild Memberships (owner only) */}
              {isOwner && guilds.length > 0 && (
                <div className="rounded-[14px] border border-border bg-card p-6 animate-fade-up animate-delay-400">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground">
                      Guild Memberships
                    </h2>
                    <span className="ml-auto font-mono text-xs text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                      {guilds.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {guilds.map((guild) => {
                      const statusKey = guild.membershipStatus || "pending";
                      const colors = getGuildStatusColors(statusKey);
                      return (
                        <Link
                          key={guild.guildId}
                          href={`/guilds/${guild.guildId}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors group"
                        >
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {guild.guildName}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors.badge}`}
                          >
                            {statusKey}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-5">
              {/* Links */}
              {hasLinks && (
                <div className="rounded-[14px] border border-border bg-card p-6 animate-fade-up animate-delay-200">
                  <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
                    Links
                  </h2>
                  <div className="space-y-2">
                    {socialLinks.map((link) => {
                      const Icon = getSocialIcon(link.platform);
                      return (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/60 text-sm text-foreground hover:border-primary/30 hover:text-primary transition-colors group"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="flex-1 truncate">
                            {link.label || link.platform}
                          </span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                        </a>
                      );
                    })}
                    {profile.resumeUrl && (
                      <a
                        href={getAssetUrl(profile.resumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="flex-1">View Resume</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="rounded-[14px] border border-border bg-card p-6 animate-fade-up animate-delay-300">
                <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground mb-3">
                  Details
                </h2>
                <div className="space-y-3">
                  {profile.experienceLevel && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {profile.experienceLevel} level
                      </span>
                    </div>
                  )}
                  {joinDate && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Joined {joinDate}
                      </span>
                    </div>
                  )}
                  {profile.resumeUrl && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Resume uploaded
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Private Information (owner only) */}
              {isOwner &&
                (profile.email || profile.phone || profile.walletAddress) && (
                  <div className="rounded-[14px] border border-primary/20 bg-card p-6 animate-fade-up animate-delay-400">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <h2 className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground">
                        Private Information
                      </h2>
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                        Only You
                      </span>
                    </div>
                    <div className="space-y-3">
                      {profile.email && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {profile.email}
                          </span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {profile.phone}
                          </span>
                        </div>
                      )}
                      {profile.walletAddress && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                            {truncateAddress(profile.walletAddress)}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </DataSection>
      </div>
    </div>
  );
}
