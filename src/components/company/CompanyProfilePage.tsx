"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  Upload,
  Save,
  X,
  Edit,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Select, Alert } from "@/components/ui";
import { COMPANY_SIZES, INDUSTRIES } from "@/config/constants";
import { companyApi, getAssetUrl } from "@/lib/api";
import { TeamManagement } from "./TeamManagement";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import type { CompanyProfile } from "@/types";

/**
 * The shared CompanyProfile type does not include these fields
 * that the API actually returns for the /companies/me endpoint.
 */
interface CompanyProfileFull extends CompanyProfile {
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  walletAddress?: string;
}

interface FormData {
  name: string;
  website: string;
  location: string;
  size: string;
  industry: string;
  description: string;
}

function profileToFormData(profile: CompanyProfileFull): FormData {
  return {
    name: profile.name || "",
    website: profile.website || "",
    location: profile.location || "",
    size: profile.size || "",
    industry: profile.industry || "",
    description: profile.description || "",
  };
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    website: "",
    location: "",
    size: "",
    industry: "",
    description: "",
  });

  const fetchProfile = useCallback(
    () => companyApi.getProfile() as Promise<CompanyProfileFull>,
    []
  );

  const {
    data: profile,
    isLoading,
    error: fetchError,
    refetch,
  } = useFetch<CompanyProfileFull>(fetchProfile, {
    skip: !ready,
    onSuccess: (data) => {
      setFormData(profileToFormData(data));
    },
  });

  const {
    execute: executeSave,
    isLoading: isSaving,
    error: saveError,
  } = useApi<CompanyProfileFull>();

  const error = fetchError || saveError;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSuccessMessage("");

    const updatedProfile = await executeSave(
      () => companyApi.updateProfile({ ...formData }) as Promise<CompanyProfileFull>,
      {
        onSuccess: (data) => {
          setFormData(profileToFormData(data));
          setIsEditing(false);
          setSuccessMessage("Profile updated successfully!");
          setTimeout(() => setSuccessMessage(""), 3000);
        },
        onError: (errMsg) => {
          toast.error(errMsg);
        },
      }
    );

    // Refetch so that `profile` state in useFetch is also up-to-date
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

    setIsUploadingLogo(true);
    setSuccessMessage("");

    try {
      await companyApi.uploadLogo(file);
      refetch();
      setSuccessMessage("Logo uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload logo";
      toast.error(message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profileToFormData(profile));
    }
    setIsEditing(false);
  };

  if (!ready || isLoading) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">Failed to load profile</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted animate-page-enter">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6">
            <Alert variant="success">
              {successMessage}
            </Alert>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <Alert variant="error">
              {error}
            </Alert>
          </div>
        )}

        {/* Logo Section */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Company Logo</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.logoUrl ? (
                <img
                  src={getAssetUrl(profile.logoUrl)}
                  alt={profile.name}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/10 to-primary/15 flex items-center justify-center border-2 border-border">
                  <Building2 className="w-12 h-12 text-primary" />
                </div>
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Upload your company logo. JPG, PNG or GIF (max. 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-card rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Company Information</h2>
            {!isEditing && (
              <Button
                variant="outline"
                icon={<Edit className="w-4 h-4" />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <Input
                label="Company Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Acme Corporation"
                required
              />

              <Input
                label="Website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://example.com"
                icon={<Globe className="w-4 h-4" />}
              />

              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="San Francisco, CA"
                icon={<MapPin className="w-4 h-4" />}
              />

              <Select
                label="Company Size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                options={COMPANY_SIZES}
                placeholder="Select company size"
              />

              <Select
                label="Industry"
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                options={INDUSTRIES}
                placeholder="Select industry"
              />

              <Textarea
                label="Company Description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tell us about your company..."
                rows={5}
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  icon={!isSaving && <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-1">
                  Company Name
                </label>
                <p className="text-foreground">{profile.name}</p>
              </div>

              {profile.email && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Email
                  </label>
                  <p className="text-muted-foreground">{profile.email}</p>
                </div>
              )}

              {profile.website && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Website
                  </label>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {profile.website}
                  </a>
                </div>
              )}

              {profile.location && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Location
                  </label>
                  <p className="text-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {profile.location}
                  </p>
                </div>
              )}

              {profile.size && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Company Size
                  </label>
                  <p className="text-foreground flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {COMPANY_SIZES.find((s) => s.value === profile.size)?.label || profile.size}
                  </p>
                </div>
              )}

              {profile.industry && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Industry
                  </label>
                  <p className="text-foreground flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    {INDUSTRIES.find((i) => i.value === profile.industry)?.label ||
                      profile.industry}
                  </p>
                </div>
              )}

              {profile.description && (
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-1">
                    Company Description
                  </label>
                  <p className="text-card-foreground whitespace-pre-wrap">{profile.description}</p>
                </div>
              )}

              {profile.verified && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Verified Company</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Management */}
        <div className="mt-6">
          <TeamManagement />
        </div>

        {/* Account Info */}
        <div className="bg-card rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Member Since</label>
              <p className="text-foreground font-medium">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Last Updated</label>
              <p className="text-foreground font-medium">
                {new Date(profile.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
