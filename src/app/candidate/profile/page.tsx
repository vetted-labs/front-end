"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Github,
  Linkedin,
  FileText,
  Upload,
  Loader2,
  Save,
  CheckCircle,
  X,
  Download,
  Clock,
  TrendingUp,
  Send,
  Eye,
  Calendar,
  Building2,
  MapPin,
  DollarSign,
  LogOut,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  linkedIn: string;
  github: string;
  experienceLevel: string;
  headline: string;
  bio: string;
  walletAddress: string;
  resumeUrl?: string;
  resumeFileName?: string;
}

interface Application {
  id: string;
  jobId: string;
  status: "pending" | "reviewing" | "interviewed" | "accepted" | "rejected";
  coverLetter: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    companyName?: string;
    location: string;
    type: string;
    salary?: {
      min: number;
      max: number;
      currency: string;
    };
    skills?: string[];
  };
}

interface ApplicationStats {
  total: number;
  pending: number;
  reviewing: number;
  interviewed: number;
  accepted: number;
  rejected: number;
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"applications" | "profile">("applications");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    reviewing: 0,
    interviewed: 0,
    accepted: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      router.push("/auth/signup?type=candidate");
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) return;

    setIsLoading(true);
    try {
      // Fetch profile and applications in parallel
      const [profileResponse, applicationsResponse] = await Promise.all([
        fetch("http://localhost:4000/api/candidates/me", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch("http://localhost:4000/api/candidates/me/applications", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (profileResponse.status === 401 || applicationsResponse.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("candidateId");
        router.push("/auth/login?type=candidate");
        return;
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        const apps = applicationsData.applications || [];
        setApplications(apps);

        // Calculate stats
        const newStats: ApplicationStats = {
          total: apps.length,
          pending: apps.filter((a: Application) => a.status === "pending").length,
          reviewing: apps.filter((a: Application) => a.status === "reviewing").length,
          interviewed: apps.filter((a: Application) => a.status === "interviewed").length,
          accepted: apps.filter((a: Application) => a.status === "accepted").length,
          rejected: apps.filter((a: Application) => a.status === "rejected").length,
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
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

    const authToken = localStorage.getItem("authToken");
    if (!authToken) return;

    setIsSaving(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const response = await fetch(
        `http://localhost:4000/api/candidates/${profile.id}/resume`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        }
      );

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setUploadProgress(100);
        setProfile({
          ...profile,
          resumeUrl: data.resumeUrl,
          resumeFileName: data.fileName,
        });
        setSuccessMessage("Resume uploaded successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        setResumeFile(null);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      setErrors({ resume: "Failed to upload resume. Please try again." });
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    const authToken = localStorage.getItem("authToken");
    if (!authToken) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/candidates/${profile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(profile),
        }
      );

      if (response.ok) {
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      setErrors({ submit: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("candidateWallet");
    router.push("/browse");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "reviewing":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "interviewed":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "accepted":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-destructive/20";
      default:
        return "bg-muted text-card-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "reviewing":
        return <Eye className="w-4 h-4" />;
      case "interviewed":
        return <TrendingUp className="w-4 h-4" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <button
            onClick={() => router.push("/auth/signup?type=candidate")}
            className="text-primary hover:text-primary"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/browse")}
              className="flex items-center space-x-2"
            >
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </button>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => router.push("/browse/jobs")}
                className="text-sm text-card-foreground hover:text-foreground font-medium"
              >
                Browse Jobs
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground hidden sm:block">
                    {profile.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">
                        {profile.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Candidate Account</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push("/candidate/profile");
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile.fullName}
          </h1>
          <p className="text-muted-foreground">{profile.headline}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Send className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Under Review</p>
                <p className="text-3xl font-bold text-foreground">{stats.reviewing}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Interviewed</p>
                <p className="text-3xl font-bold text-foreground">{stats.interviewed}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                <p className="text-3xl font-bold text-foreground">{stats.accepted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rejected</p>
                <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-sm mb-6">
          <div className="border-b border-border">
            <div className="flex">
              <button
                onClick={() => setActiveTab("applications")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "applications"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                My Applications
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "profile"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Profile & Resume
              </button>
            </div>
          </div>

          {/* Applications Tab */}
          {activeTab === "applications" && (
            <div className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No applications yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start applying to jobs to see them here
                  </p>
                  <button
                    onClick={() => router.push("/browse/jobs")}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-lg hover:opacity-90  transition-all"
                  >
                    Browse Jobs
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {application.job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {application.job.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {application.job.companyName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {application.job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {application.job.type}
                            </span>
                            {application.job.salary && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${application.job.salary.min / 1000}k - $
                                {application.job.salary.max / 1000}k
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${getStatusColor(
                            application.status
                          )}`}
                        >
                          {getStatusIcon(application.status)}
                          {application.status.charAt(0).toUpperCase() +
                            application.status.slice(1)}
                        </span>
                      </div>

                      {/* Skills */}
                      {application.job.skills && application.job.skills.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-card-foreground uppercase tracking-wide">
                              Skills Required
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {application.job.skills.slice(0, 6).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2.5 py-1 bg-muted text-card-foreground rounded-md text-xs font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {application.job.skills.length > 6 && (
                              <span className="px-2.5 py-1 text-muted-foreground text-xs font-medium">
                                +{application.job.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Applied on{" "}
                          {new Date(application.appliedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <button
                          onClick={() =>
                            router.push(`/browse/jobs/${application.job.id}`)
                          }
                          className="text-sm text-primary hover:text-primary font-medium"
                        >
                          View Job →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="p-6 space-y-8">
              {/* Resume Upload Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume / CV
                </h2>

                {profile.resumeUrl ? (
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Resume Uploaded</p>
                          <p className="text-sm text-muted-foreground">
                            {profile.resumeFileName || "resume.pdf"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={profile.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() =>
                            setProfile({ ...profile, resumeUrl: undefined })
                          }
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-violet-400 transition-colors">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Upload your resume
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
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
                      className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-violet-700 cursor-pointer transition-colors"
                    >
                      Choose File
                    </label>
                  </div>
                )}

                {resumeFile && (
                  <div className="p-4 bg-primary/10 border border-violet-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {resumeFile.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(resumeFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => setResumeFile(null)}
                        className="text-muted-foreground hover:text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {uploadProgress > 0 && (
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    <button
                      onClick={handleResumeUpload}
                      disabled={isSaving}
                      className="w-full mt-2 py-2 bg-primary text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
                  <p className="text-destructive text-sm">{errors.resume}</p>
                )}
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile({ ...profile, fullName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
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
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
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
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={profile.headline}
                    onChange={(e) =>
                      setProfile({ ...profile, headline: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      value={profile.linkedIn}
                      onChange={(e) =>
                        setProfile({ ...profile, linkedIn: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      GitHub Profile
                    </label>
                    <input
                      type="url"
                      value={profile.github}
                      onChange={(e) =>
                        setProfile({ ...profile, github: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button
                  onClick={() => router.push("/browse/jobs")}
                  className="px-6 py-2 text-card-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-lg hover:opacity-90  transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
