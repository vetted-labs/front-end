"use client";

import {
  User,
  Mail,
  Phone,
  Briefcase,
  Award,
} from "lucide-react";
import type { CandidateProfile } from "@/types";

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior (0-2 years)",
  mid: "Mid-level (2-5 years)",
  senior: "Senior (5-8 years)",
  lead: "Lead (8+ years)",
  executive: "Executive",
};

interface PersonalInfoSectionProps {
  profile: CandidateProfile;
  isEditing: boolean;
  onProfileChange: (updated: CandidateProfile) => void;
}

export default function PersonalInfoSection({
  profile,
  isEditing,
  onProfileChange,
}: PersonalInfoSectionProps) {
  return (
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
                  onProfileChange({ ...profile, fullName: e.target.value })
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
                  onProfileChange({ ...profile, email: e.target.value })
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
                  onProfileChange({ ...profile, phone: e.target.value })
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
                  onProfileChange({
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
                onProfileChange({ ...profile, headline: e.target.value })
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
                onProfileChange({ ...profile, bio: e.target.value })
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
              <p className="text-sm text-foreground">{profile.fullName || "\u2014"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-foreground">{profile.email || "\u2014"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-foreground">{profile.phone || "\u2014"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</p>
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  {(profile.experienceLevel && EXPERIENCE_LABELS[profile.experienceLevel]) || profile.experienceLevel || "\u2014"}
                </p>
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headline</p>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-foreground">{profile.headline || "\u2014"}</p>
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
  );
}
