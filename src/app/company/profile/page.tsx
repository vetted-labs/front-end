"use client";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button, Input, Textarea, Select, Alert, LoadingState } from "@/components/ui";
import { COMPANY_SIZES, INDUSTRIES } from "@/config/constants";
import { companyApi, getAssetUrl } from "@/lib/api";

interface CompanyProfile {
  id: string;
  name: string;
  email: string;
  website?: string;
  location?: string;
  size?: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
  walletAddress?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Disable static generation
export const dynamic = "force-dynamic";

export default function CompanyProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    location: "",
    size: "",
    industry: "",
    description: "",
  });

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("companyAuthToken");
      if (!token) {
        router.push("/auth/login?type=company");
        return;
      }

      const data: any = await companyApi.getProfile();
      setProfile(data);
      setFormData({
        name: data.name || "",
        website: data.website || "",
        location: data.location || "",
        size: data.size || "",
        industry: data.industry || "",
        description: data.description || "",
      });
    } catch (error: any) {
      if (error.status === 401) {
        localStorage.removeItem("companyAuthToken");
        router.push("/auth/login?type=company");
        return;
      }
      console.error("Error fetching profile:", error);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const updatedProfile: any = await companyApi.updateProfile(formData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);
    setError("");
    setSuccessMessage("");

    try {
      const data: any = await companyApi.uploadLogo(file);
      setProfile((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : null));
      setSuccessMessage("Logo uploaded successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      setError(error.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        website: profile.website || "",
        location: profile.location || "",
        size: profile.size || "",
        industry: profile.industry || "",
        description: profile.description || "",
      });
    }
    setIsEditing(false);
    setError("");
  };

  if (isLoading) {
    return <LoadingState message="Loading profile..." />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">Failed to load profile</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted">
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
