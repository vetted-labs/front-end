"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Link2,
  Pencil,
  ExternalLink,
  X,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { candidateApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import { getProfileCompletion } from "@/lib/profileCompletion";
import type { CandidateProfile, SocialLink } from "@/types";
import SocialLinksEditor from "./SocialLinksEditor";
import ResumeSection from "./ResumeSection";
import PersonalInfoSection from "./PersonalInfoSection";
import { ProfileCompletionBanner } from "./ProfileCompletionBanner";
import { DataSection } from "@/lib/motion";

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

  const { isLoading } = useFetch(
    () => candidateApi.getProfile(),
    {
      skip: !ready,
      onSuccess: (data) => {
        const p = data as CandidateProfile;
        setProfile(p);
        if (p.socialLinks && p.socialLinks.length > 0) {
          setSocialLinks(p.socialLinks);
        } else {
          const legacy: SocialLink[] = [];
          if (p.linkedIn) legacy.push({ platform: "linkedin", label: "LinkedIn", url: p.linkedIn });
          if (p.github) legacy.push({ platform: "github", label: "GitHub", url: p.github });
          setSocialLinks(legacy);
        }
        // Auto-enter edit mode when profile is incomplete
        const { percentage } = getProfileCompletion(p);
        if (percentage < 100) {
          setIsEditing(true);
        }
      },
    }
  );

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

    await executeSave(
      () => candidateApi.uploadResume(candidateId, resumeFile),
      {
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
      }
    );
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!auth.token) return;

    const candidateId = auth.userId || profile.id;
    if (!candidateId) {
      setErrors({ submit: "Unable to identify your account. Please log in again." });
      return;
    }

    const filledLinks = socialLinks.filter((l) => l.url.trim());

    setErrors({});
    await executeSave(
      () => candidateApi.updateProfile(candidateId, {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || "",
        experienceLevel: profile.experienceLevel,
        headline: profile.headline,
        bio: profile.bio || "",
        skills: profile.skills || [],
        socialLinks: filledLinks,
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

  const filledSocialLinks = socialLinks.filter((l) => l.url.trim());

  // Build a synthetic profile with current social links for completion check
  const profileForCompletion: CandidateProfile | null = profile
    ? { ...profile, socialLinks }
    : null;
  const profileCompletion = profileForCompletion ? getProfileCompletion(profileForCompletion) : null;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header (static — always visible) */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1 font-display">
              {isEditing ? "Edit Profile" : "My Profile"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Update your personal information and resume"
                : "Your personal information and resume"}
            </p>
          </div>
          {!isEditing && profile && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        <DataSection isLoading={isLoading} skeleton={null}>
        {profile && profileCompletion && (
        <div className="space-y-6">
          <ProfileCompletionBanner
            percentage={profileCompletion.percentage}
            items={profileCompletion.items}
          />
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
            onClearResume={() => setProfile({ ...profile, resumeUrl: undefined })}
          />

          <PersonalInfoSection
            profile={profile}
            isEditing={isEditing}
            onProfileChange={setProfile}
          />

          {/* Skills */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Skills
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm text-foreground border border-border"
                  >
                    {skill}
                    {isEditing && (
                      <button
                        onClick={() =>
                          setProfile({ ...profile, skills: (profile.skills || []).filter((s) => s !== skill) })
                        }
                        className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                {!isEditing && (profile.skills || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No skills added yet</p>
                )}
              </div>
              {isEditing && (
                <input
                  type="text"
                  placeholder="Add skill and press Enter..."
                  className="mt-3 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground w-56"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      const newSkill = e.currentTarget.value.trim();
                      if (!(profile.skills || []).includes(newSkill)) {
                        setProfile({ ...profile, skills: [...(profile.skills || []), newSkill] });
                      }
                      e.currentTarget.value = "";
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Social Links
                {isEditing && <span className="text-destructive text-sm">*</span>}
              </h2>
            </div>

            {isEditing ? (
              <div className="p-6">
                <SocialLinksEditor
                  links={socialLinks}
                  onChange={setSocialLinks}
                  minLinks={1}
                  error={errors.socialLinks}
                />
              </div>
            ) : (
              <div className="p-6">
                {filledSocialLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filledSocialLinks.map((link, i) => {
                      const Icon = getPlatformIcon(link.platform);
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-foreground">
                            {link.label || getPlatformLabel(link.platform)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Link2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No social links added yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={cancelEditing}
                className="px-5 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {errors.submit && (
            <p className="text-destructive text-sm text-right">{errors.submit}</p>
          )}
        </div>
        )}
        </DataSection>
      </div>
    </div>
  );
}
