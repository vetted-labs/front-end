"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  FileText,
  Upload,
  Loader2,
  Save,
  CheckCircle,
  Download,
  X,
  Link2,
  Pencil,
  ExternalLink,
  Mail,
  Phone,
  Briefcase,
  Award,
} from "lucide-react";
import { candidateApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import type { CandidateProfile, SocialLink } from "@/types";
import SocialLinksEditor from "./SocialLinksEditor";

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior (0-2 years)",
  mid: "Mid-level (2-5 years)",
  senior: "Senior (5-8 years)",
  lead: "Lead (8+ years)",
  executive: "Executive",
};

export default function CandidateProfilePage() {
  const router = useRouter();
  const { auth, ready } = useRequireAuth("candidate");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
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

    setIsSaving(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const data = await candidateApi.uploadResume(candidateId, resumeFile);

      clearInterval(progressInterval);

      setUploadProgress(100);
      setProfile({
        ...profile,
        resumeUrl: data.resumeUrl,
        resumeFileName: (data as { resumeUrl: string; fileName?: string }).fileName,
      });
      setSuccessMessage("Resume uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setResumeFile(null);
    } catch {
      setErrors({ resume: "Failed to upload resume. Please try again." });
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
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
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || "",
        experienceLevel: profile.experienceLevel,
        headline: profile.headline,
        bio: profile.bio || "",
        socialLinks: filledLinks,
      };
      await candidateApi.updateProfile(candidateId, payload);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setIsEditing(false);
      setEditSnapshot(null);
    } catch {
      setErrors({ submit: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  if (!profile) {
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

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {isEditing ? "Edit Profile" : "My Profile"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Update your personal information and resume"
                : "Your personal information and resume"}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Resume Section */}
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Resume / CV
              </h2>
            </div>
            <div className="p-6">
              {profile.resumeUrl ? (
                <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/15 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {profile.resumeFileName || "resume.pdf"}
                      </p>
                      <p className="text-xs text-muted-foreground">Uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {isEditing && (
                      <button
                        onClick={() =>
                          setProfile({ ...profile, resumeUrl: undefined })
                        }
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : isEditing ? (
                <>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Upload your resume
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PDF or Word document, max 5MB
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="inline-flex items-center px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
                    >
                      Choose File
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No resume uploaded yet</p>
                </div>
              )}

              {resumeFile && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/15 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {resumeFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({(resumeFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => setResumeFile(null)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {uploadProgress > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <button
                    onClick={handleResumeUpload}
                    disabled={isSaving}
                    className="w-full py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Resume
                      </>
                    )}
                  </button>
                </div>
              )}

              {errors.resume && (
                <p className="text-destructive text-sm mt-3">{errors.resume}</p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Personal Information
              </h2>
            </div>

            {isEditing ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.fullName ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profile.phone ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Experience Level
                    </label>
                    <select
                      value={profile.experienceLevel}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          experienceLevel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                    >
                      <option value="junior">Junior (0-2 years)</option>
                      <option value="mid">Mid-level (2-5 years)</option>
                      <option value="senior">Senior (5-8 years)</option>
                      <option value="lead">Lead (8+ years)</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={profile.headline ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, headline: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="text-sm text-foreground">{profile.fullName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">{profile.email || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">{profile.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</p>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">
                        {(profile.experienceLevel && EXPERIENCE_LABELS[profile.experienceLevel]) || profile.experienceLevel || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headline</p>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">{profile.headline || "—"}</p>
                    </div>
                  </div>
                  {profile.bio && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{profile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
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
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group"
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
      </div>
    </div>
  );
}
