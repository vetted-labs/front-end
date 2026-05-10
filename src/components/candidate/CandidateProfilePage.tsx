"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Pencil,
  ExternalLink,
  Edit,
  X,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  User as UserIcon,
  Briefcase,
  FileText,
  Link2,
  Tag,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { candidateApi, getAssetUrl } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import { getProfileCompletion } from "@/lib/profileCompletion";
import { STATUS_COLORS } from "@/config/colors";
import { cn, truncateAddress } from "@/lib/utils";
import { DataSection } from "@/lib/motion";
import { HelpLink } from "@/components/ui/HelpLink";
import { DOC_LINKS } from "@/config/docLinks";
import type { CandidateProfile, SocialLink, WorkHistoryEntry } from "@/types";
import SocialLinksEditor from "./SocialLinksEditor";
import ResumeSection from "./ResumeSection";
import {
  BasicsView,
  BasicsEdit,
  AboutView,
  AboutEdit,
  WorkHistoryView,
  WorkHistoryEdit,
  SkillsView,
  SkillsEdit,
} from "./profile/CandidateProfileSections";

// ---------------------------------------------------------------------------
// Helpers / labels
// ---------------------------------------------------------------------------

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior (0-2 years)",
  mid: "Mid-level (2-5 years)",
  senior: "Senior (5-8 years)",
  lead: "Lead (8+ years)",
  executive: "Executive",
};

function getExperienceLabel(level?: string): string | null {
  if (!level) return null;
  return EXPERIENCE_LABELS[level] ?? level;
}

function getInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

// CandidateProfile may surface optional fields (avatarUrl) from the backend
// that aren't yet in the shared type. Read them via this narrow accessor so
// we never reach for `any`.
function getAvatarUrl(profile: CandidateProfile): string | undefined {
  const maybe = (profile as CandidateProfile & { avatarUrl?: string }).avatarUrl;
  return typeof maybe === "string" && maybe ? maybe : undefined;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CandidateProfilePage() {
  const router = useRouter();
  const { auth, ready } = useRequireAuth("candidate");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { execute: executeSave, isLoading: isSaving } = useApi();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  // Snapshot of profile before editing so we can cancel
  const [editSnapshot, setEditSnapshot] = useState<{
    profile: CandidateProfile;
    socialLinks: SocialLink[];
  } | null>(null);

  const { isLoading } = useFetch(() => candidateApi.getProfile(), {
    skip: !ready,
    onSuccess: (data) => {
      const p = data as CandidateProfile;
      setProfile(p);
      if (p.socialLinks && p.socialLinks.length > 0) {
        setSocialLinks(p.socialLinks);
      } else {
        const legacy: SocialLink[] = [];
        if (p.linkedIn)
          legacy.push({ platform: "linkedin", label: "LinkedIn", url: p.linkedIn });
        if (p.github)
          legacy.push({ platform: "github", label: "GitHub", url: p.github });
        setSocialLinks(legacy);
      }
      // Auto-enter edit mode when profile is incomplete
      const { percentage } = getProfileCompletion(p);
      if (percentage < 100) {
        setIsEditing(true);
      }
    },
  });

  const startEditing = () => {
    if (!profile) return;
    setEditSnapshot({
      profile: { ...profile },
      socialLinks: socialLinks.map((l) => ({ ...l })),
    });
    setIsEditing(true);
    setErrors({});
  };

  const cancelEditing = () => {
    if (editSnapshot) {
      setProfile(editSnapshot.profile);
      setSocialLinks(editSnapshot.socialLinks);
    }
    setIsEditing(false);
    setErrors({});
    setResumeFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ resume: "Please upload a PDF or Word document" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ resume: "File size must be less than 5MB" });
        return;
      }
      setResumeFile(file);
      setErrors({});
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile || !profile) return;
    if (!auth.token) return;

    const candidateId = auth.userId || profile.id;
    if (!candidateId) {
      setErrors({ resume: "Unable to identify your account. Please log in again." });
      return;
    }

    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 200);

    await executeSave(() => candidateApi.uploadResume(candidateId, resumeFile), {
      onSuccess: (result) => {
        const data = result as { resumeUrl: string; fileName?: string };
        clearInterval(progressInterval);
        setUploadProgress(100);
        setProfile({
          ...profile,
          resumeUrl: data.resumeUrl,
          resumeFileName: data.fileName,
        });
        toast.success("Resume uploaded successfully!");
        setResumeFile(null);
        setUploadProgress(0);
      },
      onError: () => {
        clearInterval(progressInterval);
        setErrors({ resume: "Failed to upload resume. Please try again." });
        setUploadProgress(0);
      },
    });
  };

  const updateWorkEntry = (
    index: number,
    field: keyof WorkHistoryEntry,
    value: string
  ) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workHistory: (prev.workHistory || []).map((e, i) =>
          i === index ? { ...e, [field]: value } : e
        ),
      };
    });
  };

  const addWorkEntry = () => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            workHistory: [
              ...(prev.workHistory || []),
              {
                company: "",
                role: "",
                startDate: "",
                endDate: "",
                description: "",
              },
            ],
          }
        : prev
    );
  };

  const removeWorkEntry = (index: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workHistory: (prev.workHistory || []).filter((_, i) => i !== index),
      };
    });
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!auth.token) return;

    const candidateId = auth.userId || profile.id;
    if (!candidateId) {
      setErrors({
        submit: "Unable to identify your account. Please log in again.",
      });
      return;
    }

    const filledLinks = socialLinks.filter((l) => l.url.trim());

    setErrors({});
    await executeSave(
      () =>
        candidateApi.updateProfile(candidateId, {
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone || "",
          experienceLevel: profile.experienceLevel,
          headline: profile.headline,
          bio: profile.bio || "",
          skills: profile.skills || [],
          socialLinks: filledLinks,
          workHistory: profile.workHistory || [],
        }),
      {
        onSuccess: () => {
          toast.success("Profile updated successfully!");
          setIsEditing(false);
          setEditSnapshot(null);
        },
        onError: () => {
          setErrors({ submit: "Failed to update profile" });
        },
      }
    );
  };

  // Build a synthetic profile with current social links for completion check.
  // Memoized inside the hook so the synthetic object isn't a fresh ref each render.
  const profileCompletion = useMemo(
    () =>
      profile ? getProfileCompletion({ ...profile, socialLinks }) : null,
    [profile, socialLinks]
  );

  const filledSocialLinks = useMemo(
    () => socialLinks.filter((l) => l.url.trim()),
    [socialLinks]
  );

  if (!ready) return null;

  if (!isLoading && !profile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <button
            onClick={() => router.push("/auth/login?type=candidate")}
            className="text-primary hover:underline"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background animate-page-enter">
      <DataSection isLoading={isLoading} skeleton={null}>
        {profile && profileCompletion && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <HeroCard
              profile={profile}
              isEditing={isEditing}
              onEditClick={startEditing}
            />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column — editable card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Basics */}
                  <Section
                    icon={<UserIcon className="w-3.5 h-3.5" />}
                    title="Basics"
                  >
                    {isEditing ? (
                      <BasicsEdit profile={profile} onChange={setProfile} />
                    ) : (
                      <BasicsView profile={profile} />
                    )}
                  </Section>

                  <div className="border-t border-border" />

                  {/* About me */}
                  <Section
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    title="About me"
                  >
                    {isEditing ? (
                      <AboutEdit profile={profile} onChange={setProfile} />
                    ) : (
                      <AboutView profile={profile} />
                    )}
                  </Section>

                  <div className="border-t border-border" />

                  {/* Skills */}
                  <Section
                    icon={<Tag className="w-3.5 h-3.5" />}
                    title="Skills"
                  >
                    {isEditing ? (
                      <SkillsEdit profile={profile} onChange={setProfile} />
                    ) : (
                      <SkillsView profile={profile} />
                    )}
                  </Section>

                  <div className="border-t border-border" />

                  {/* Work history */}
                  <Section
                    icon={<Briefcase className="w-3.5 h-3.5" />}
                    title="Work history"
                  >
                    {isEditing ? (
                      <WorkHistoryEdit
                        entries={profile.workHistory || []}
                        onUpdate={updateWorkEntry}
                        onAdd={addWorkEntry}
                        onRemove={removeWorkEntry}
                      />
                    ) : (
                      <WorkHistoryView entries={profile.workHistory || []} />
                    )}
                  </Section>

                  {isEditing && (
                    <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        isLoading={isSaving}
                        icon={!isSaving && <Save className="w-4 h-4" />}
                      >
                        {isSaving ? "Saving..." : "Save changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        icon={<X className="w-4 h-4" />}
                      >
                        Cancel
                      </Button>
                      {errors.submit && (
                        <p className="text-destructive text-sm ml-auto">
                          {errors.submit}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Resume & links */}
                <ResumeSection
                  resumeUrl={profile.resumeUrl}
                  resumeFileName={profile.resumeFileName}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  resumeFile={resumeFile}
                  uploadProgress={uploadProgress}
                  error={errors.resume}
                  onFileChange={handleFileChange}
                  onUpload={handleResumeUpload}
                  onRemoveFile={() => setResumeFile(null)}
                  onClearResume={() =>
                    setProfile({ ...profile, resumeUrl: undefined })
                  }
                />

                {/* Social links */}
                <Section
                  as="card"
                  icon={<Link2 className="w-3.5 h-3.5" />}
                  title={
                    isEditing ? (
                      <span>
                        Social links{" "}
                        <span className="text-destructive">*</span>
                      </span>
                    ) : (
                      "Social links"
                    )
                  }
                >
                  {isEditing ? (
                    <SocialLinksEditor
                      links={socialLinks}
                      onChange={setSocialLinks}
                      minLinks={1}
                      error={errors.socialLinks}
                    />
                  ) : filledSocialLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {filledSocialLinks.map((link, i) => {
                        const Icon = getPlatformIcon(link.platform);
                        return (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group"
                          >
                            <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-sm font-medium text-foreground">
                              {link.label || getPlatformLabel(link.platform)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No social links added yet.
                    </p>
                  )}
                </Section>

                <div className="flex justify-end pt-1">
                  <HelpLink href={DOC_LINKS.candidateProfile} size="sm">
                    Profile tips that actually move the needle
                  </HelpLink>
                </div>
              </div>

              {/* Right column — sticky sidebar */}
              <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-6 lg:self-start">
                <SidebarCard title="Profile completeness">
                  <CompletenessRing
                    value={profileCompletion.percentage}
                    items={profileCompletion.items}
                  />
                </SidebarCard>

                <SidebarCard title="Account">
                  <KeyValue
                    icon={<UserIcon className="w-3.5 h-3.5" />}
                    label="Display name"
                    value={profile.fullName || "—"}
                    truncate
                  />
                  {profile.email && (
                    <KeyValue
                      icon={<FileText className="w-3.5 h-3.5" />}
                      label="Contact email"
                      value={profile.email}
                      truncate
                    />
                  )}
                  {profile.experienceLevel && (
                    <KeyValue
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      label="Experience"
                      value={
                        getExperienceLabel(profile.experienceLevel) || "—"
                      }
                    />
                  )}
                  {profile.walletAddress && (
                    <KeyValue
                      icon={<Wallet className="w-3.5 h-3.5" />}
                      label="Wallet"
                      value={truncateAddress(profile.walletAddress)}
                    />
                  )}
                </SidebarCard>
              </aside>
            </div>
          </div>
        )}
      </DataSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

interface HeroCardProps {
  profile: CandidateProfile;
  isEditing: boolean;
  onEditClick: () => void;
}

function HeroCard({ profile, isEditing, onEditClick }: HeroCardProps) {
  const avatarUrl = getAvatarUrl(profile);
  const initials = getInitials(profile.fullName);
  const experienceLabel = getExperienceLabel(profile.experienceLevel);
  const hasWallet = !!profile.walletAddress;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Banner zone */}
      <div className="relative h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_60%)]" />
        {hasWallet && (
          <div className="absolute top-4 right-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md bg-card/80 border border-border",
                STATUS_COLORS.positive.text
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              On-chain
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 sm:px-8 -mt-12 relative pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
              <img
                src={getAssetUrl(avatarUrl)}
                alt={profile.fullName || "Profile avatar"}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-border bg-card shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary/10 border-2 border-border grid place-items-center shadow-md">
                <span className="font-display text-3xl font-bold text-primary tracking-tight">
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Name + headline + actions */}
          <div className="min-w-0 flex-1 sm:pb-2 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground tracking-tight font-display truncate">
                  {profile.fullName || "Your name"}
                </h1>
                {hasWallet && (
                  <CheckCircle2
                    className={cn(
                      "w-5 h-5 flex-shrink-0",
                      STATUS_COLORS.positive.text
                    )}
                    aria-label="Wallet verified"
                  />
                )}
              </div>
              {profile.headline && (
                <p className="text-base text-muted-foreground mt-1 truncate">
                  {profile.headline}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {experienceLabel && (
                  <Pill icon={<Sparkles className="w-3.5 h-3.5" />}>
                    {experienceLabel}
                  </Pill>
                )}
                {profile.email && (
                  <Pill icon={<FileText className="w-3.5 h-3.5" />}>
                    {profile.email}
                  </Pill>
                )}
                {profile.walletAddress && (
                  <Pill icon={<Wallet className="w-3.5 h-3.5" />}>
                    {truncateAddress(profile.walletAddress)}
                  </Pill>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={onEditClick}
                >
                  Edit profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline primitives (mirror JobDetailPage / CompanyProfilePage language)
// ---------------------------------------------------------------------------

interface SectionProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  /** "card" wraps the section in its own bordered card. Default is inline (used inside a multi-section card). */
  as?: "inline" | "card";
}

function Section({ icon, title, children, as = "inline" }: SectionProps) {
  const header = (
    <div className="px-5 sm:px-6 py-3.5 border-b border-border flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
    </div>
  );

  if (as === "card") {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        {header}
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </section>
    );
  }

  return (
    <section>
      {header}
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground font-medium leading-snug",
            truncate && "truncate"
          )}
          title={truncate ? value : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-medium text-foreground max-w-full">
      {icon && (
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Completeness ring (mirrors CompanyProfilePage)
// ---------------------------------------------------------------------------

interface CompletenessRingProps {
  value: number;
  items: ReturnType<typeof getProfileCompletion>["items"];
}

function CompletenessRing({ value, items }: CompletenessRingProps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
  const tone =
    value >= 100
      ? STATUS_COLORS.positive.text
      : value >= 60
        ? STATUS_COLORS.info.text
        : STATUS_COLORS.warning.text;

  const headline =
    value >= 100
      ? "All set — your profile is complete."
      : value >= 60
        ? "Looks good. A couple more to go."
        : "Boost your profile to attract better matches.";

  const missing = items.filter((i) => !i.done);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg
            viewBox="0 0 80 80"
            className="w-20 h-20 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              strokeWidth="6"
              className="stroke-muted"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={cn("transition-all duration-500", tone)}
              stroke="currentColor"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <p className={cn("text-lg font-bold tabular-nums", tone)}>
              {value}%
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Completeness
          </p>
          <p className="text-sm font-medium text-foreground leading-snug mt-1">
            {headline}
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-border">
          {missing.map((m) => (
            <li
              key={m.field}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <AlertCircle className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
              <span>Add: {m.label.replace(/ (added|set|written|uploaded)$/i, "")}</span>
            </li>
          ))}
        </ul>
      )}

      {missing.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
          <Pencil className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
          <span>Keep your profile fresh — small updates compound.</span>
        </div>
      )}
    </div>
  );
}

