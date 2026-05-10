"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  Building2,
  Globe,
  MapPin,
  Upload,
  Save,
  X,
  Edit,
  CheckCircle2,
  Loader2,
  Calendar,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { toast } from "sonner";
import { Button, Input, Textarea, NativeSelect, Alert } from "@/components/ui";
import { COMPANY_SIZES, INDUSTRIES } from "@/config/constants";
import { companyApi, getAssetUrl } from "@/lib/api";
import { STATUS_COLORS } from "@/config/colors";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { DataSection } from "@/lib/motion";
import { cn, formatTimeAgo } from "@/lib/utils";
import type { CompanyProfile } from "@/types";

interface CompanyProfileFormData {
  name: string;
  website: string;
  location: string;
  size: string;
  industry: string;
  description: string;
}

function profileToFormData(profile: CompanyProfile): CompanyProfileFormData {
  return {
    name: profile.name || "",
    website: profile.website || "",
    location: profile.location || "",
    size: profile.size || "",
    industry: profile.industry || "",
    description: profile.description || "",
  };
}

interface MissingField {
  key: string;
  label: string;
}

function getMissingFields(profile: CompanyProfile): MissingField[] {
  const checks: Array<[boolean, MissingField]> = [
    [!profile.logoUrl, { key: "logo", label: "Add a logo" }],
    [!profile.description, { key: "description", label: "Write a description" }],
    [!profile.website, { key: "website", label: "Add a website" }],
    [!profile.location, { key: "location", label: "Add a location" }],
    [!profile.size, { key: "size", label: "Select company size" }],
    [!profile.industry, { key: "industry", label: "Select industry" }],
  ];
  return checks.filter(([missing]) => missing).map(([, f]) => f);
}

export default function CompanyProfilePage() {
  const { ready } = useRequireAuth("company");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const { execute: executeUploadLogo, isLoading: isUploadingLogo } = useApi();

  const [formData, setFormData] = useState<CompanyProfileFormData>({
    name: "",
    website: "",
    location: "",
    size: "",
    industry: "",
    description: "",
  });

  const fetchProfile = useCallback(
    () => companyApi.getProfile() as Promise<CompanyProfile>,
    []
  );

  const {
    data: profile,
    isLoading,
    error: fetchError,
    refetch,
  } = useFetch<CompanyProfile>(fetchProfile, {
    skip: !ready,
    onSuccess: (data) => {
      setFormData(profileToFormData(data));
    },
  });

  const {
    execute: executeSave,
    isLoading: isSaving,
    error: saveError,
  } = useApi<CompanyProfile>();

  const error = fetchError || saveError;

  const completeness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.name,
      profile.description,
      profile.website,
      profile.location,
      profile.size,
      profile.industry,
      profile.logoUrl,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const missingFields = useMemo(
    () => (profile ? getMissingFields(profile) : []),
    [profile]
  );

  const handleInputChange = (field: keyof CompanyProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const updatedProfile = await executeSave(
      () => companyApi.updateProfile({ ...formData }) as Promise<CompanyProfile>,
      {
        onSuccess: (data) => {
          setFormData(profileToFormData(data));
          setIsEditing(false);
          toast.success("Profile updated successfully!");
        },
        onError: (errMsg) => {
          toast.error(errMsg);
        },
      }
    );

    if (updatedProfile) {
      refetch();
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    await executeUploadLogo(() => companyApi.uploadLogo(file), {
      onSuccess: () => {
        refetch();
        toast.success("Logo uploaded successfully!");
      },
      onError: (errorMsg) => {
        toast.error(errorMsg || "Failed to upload logo");
      },
    });
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profileToFormData(profile));
    }
    setIsEditing(false);
  };

  if (!ready) return null;

  if (!isLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">Failed to load profile</Alert>
      </div>
    );
  }

  const sizeLabel = profile?.size
    ? COMPANY_SIZES.find((s) => s.value === profile.size)?.label
    : null;
  const industryLabel = profile?.industry
    ? INDUSTRIES.find((i) => i.value === profile.industry)?.label
    : null;

  const taglineParts = [industryLabel, sizeLabel, profile?.location].filter(
    (v): v is string => Boolean(v)
  );

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <DataSection isLoading={isLoading} skeleton={null}>
        {profile && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
              <div className="mb-6">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />

            <HeroCard
              profile={profile}
              tagline={taglineParts.join(" · ")}
              isEditing={isEditing}
              isUploadingLogo={isUploadingLogo}
              onUploadClick={() => fileInputRef.current?.click()}
              onEditClick={() => setIsEditing(true)}
            />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {isEditing ? (
                  <EditCard
                    formData={formData}
                    isSaving={isSaving}
                    onChange={handleInputChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <ViewCard
                    profile={profile}
                    sizeLabel={sizeLabel}
                    industryLabel={industryLabel}
                  />
                )}
              </div>

              <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-6 lg:self-start">
                <SidebarCard title="At a glance">
                  <CompletenessRing
                    value={completeness}
                    missing={missingFields}
                  />
                </SidebarCard>

                <SidebarCard title="Account">
                  <KeyValue
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Member since"
                    value={
                      profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString()
                        : "—"
                    }
                  />
                  <KeyValue
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    label="Last updated"
                    value={
                      profile.updatedAt ? formatTimeAgo(profile.updatedAt) : "—"
                    }
                  />
                  {profile.email && (
                    <KeyValue
                      icon={<VettedIcon name="profile" className="w-3.5 h-3.5" />}
                      label="Contact email"
                      value={profile.email}
                      truncate
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

// -------------------------------------------------------------------
// Hero
// -------------------------------------------------------------------

interface HeroCardProps {
  profile: CompanyProfile;
  tagline: string;
  isEditing: boolean;
  isUploadingLogo: boolean;
  onUploadClick: () => void;
  onEditClick: () => void;
}

function HeroCard({
  profile,
  tagline,
  isEditing,
  isUploadingLogo,
  onUploadClick,
  onEditClick,
}: HeroCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Banner zone */}
      <div className="relative h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_60%)]" />
        {profile.verified && (
          <div className="absolute top-4 right-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md bg-card/80 border border-border",
                STATUS_COLORS.positive.text
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 sm:px-8 -mt-12 relative pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
          {/* Logo */}
          <div className="relative flex-shrink-0">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
              <img
                src={getAssetUrl(profile.logoUrl)}
                alt={profile.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-border bg-card shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-card border-2 border-border grid place-items-center shadow-md">
                <Building2 className="w-10 h-10 text-primary" />
              </div>
            )}
            {isUploadingLogo && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Name + tagline + actions */}
          <div className="min-w-0 flex-1 sm:pb-2 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground tracking-tight font-display truncate">
                  {profile.name || "Untitled company"}
                </h1>
                {profile.verified && (
                  <CheckCircle2
                    className={cn("w-5 h-5 flex-shrink-0", STATUS_COLORS.positive.text)}
                  />
                )}
              </div>
              {tagline && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {tagline}
                </p>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[260px]">{profile.website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={onUploadClick}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? "Uploading..." : "Upload logo"}
              </Button>
              {!isEditing && (
                <Button
                  size="sm"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={onEditClick}
                >
                  Edit profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// View / Edit cards
// -------------------------------------------------------------------

interface ViewCardProps {
  profile: CompanyProfile;
  sizeLabel: string | null | undefined;
  industryLabel: string | null | undefined;
}

function ViewCard({ profile, sizeLabel, industryLabel }: ViewCardProps) {
  const hasBasics =
    profile.name || profile.website || profile.location;
  const hasAbout =
    profile.description || sizeLabel || industryLabel;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <SectionHeader title="Basics" />
      <div className="px-5 sm:px-6 py-5 space-y-4">
        <Field label="Company name" value={profile.name || "—"} />
        <Field
          label="Website"
          value={
            profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                {profile.website}
              </a>
            ) : (
              "—"
            )
          }
        />
        <Field
          label="Location"
          value={
            profile.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                {profile.location}
              </span>
            ) : (
              "—"
            )
          }
        />
        {!hasBasics && (
          <p className="text-xs text-muted-foreground">
            Nothing here yet. Hit Edit profile to fill in the basics.
          </p>
        )}
      </div>

      <div className="border-t border-border" />

      <SectionHeader title="About" />
      <div className="px-5 sm:px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Industry" value={industryLabel || "—"} />
          <Field label="Company size" value={sizeLabel || "—"} />
        </div>
        <Field
          label="Description"
          value={
            profile.description ? (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {profile.description}
              </p>
            ) : (
              "—"
            )
          }
        />
        {!hasAbout && (
          <p className="text-xs text-muted-foreground">
            Tell experts and candidates what your company does.
          </p>
        )}
      </div>
    </div>
  );
}

interface EditCardProps {
  formData: CompanyProfileFormData;
  isSaving: boolean;
  onChange: (field: keyof CompanyProfileFormData, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditCard({
  formData,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: EditCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <SectionHeader title="Basics" />
      <div className="px-5 sm:px-6 py-5 space-y-4">
        <Input
          label="Company name"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Acme Corporation"
          required
        />
        <Input
          label="Website"
          value={formData.website}
          onChange={(e) => onChange("website", e.target.value)}
          placeholder="https://example.com"
        />
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="San Francisco, CA"
        />
      </div>

      <div className="border-t border-border" />

      <SectionHeader title="About" />
      <div className="px-5 sm:px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NativeSelect
            label="Industry"
            value={formData.industry}
            onChange={(e) => onChange("industry", e.target.value)}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            label="Company size"
            value={formData.size}
            onChange={(e) => onChange("size", e.target.value)}
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Textarea
          label="Company description"
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Tell us about your company..."
          rows={5}
        />
      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-3">
        <Button
          onClick={onSave}
          isLoading={isSaving}
          icon={!isSaving && <Save className="w-4 h-4" />}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          icon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Sidebar building blocks
// -------------------------------------------------------------------

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

function CompletenessRing({
  value,
  missing,
}: {
  value: number;
  missing: MissingField[];
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
  const tone =
    value >= 100
      ? STATUS_COLORS.positive.text
      : value >= 60
        ? "text-primary"
        : STATUS_COLORS.warning.text;

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
            <div className="text-center">
              <p className={cn("text-lg font-bold tabular-nums", tone)}>
                {value}%
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Profile completeness
          </p>
          <p className="text-sm font-medium text-foreground leading-snug mt-1">
            {value >= 100
              ? "All set — your profile is complete."
              : value >= 60
                ? "Looking good. A couple more to go."
                : "Boost your profile to attract better candidates."}
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-border">
          {missing.map((m) => (
            <li
              key={m.key}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <AlertCircle className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
              <span>{m.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Shared field / section primitives
// -------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 sm:px-6 py-3.5 border-b border-border">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
        {label}
      </p>
      {typeof value === "string" ? (
        <p className="text-sm text-foreground">{value}</p>
      ) : (
        <div className="text-sm text-foreground">{value}</div>
      )}
    </div>
  );
}
