"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useParams, useRouter } from "next/navigation";
import { candidateApi, jobsApi, applicationsApi, getAssetUrl } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  FileText,
  HelpCircle,
  Calendar,
  Eye,
  Building2,
  Send,
  Shield,
  TrendingUp,
  ExternalLink,
  User,
  LogOut,
  Upload,
  CheckCircle2,
  Search,
  ClipboardList,
  Clock,
  Star,
} from "lucide-react";
import { Modal, Button, Alert, LoadingState, Textarea, StatusBadge } from "@/components/ui";

interface JobDetails {
  id: string;
  title: string;
  department: string | null;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel: "junior" | "mid" | "senior" | "lead" | "executive" | null;
  salary: { min: number | null; max: number | null; currency: string };
  equityOffered: boolean | null;
  equityRange: string | null;
  status: "draft" | "active" | "paused" | "closed";
  guild: string;
  applicants: number;
  views: number;
  screeningQuestions: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  featured?: boolean;
}

interface UserProfile {
  resumeUrl?: string;
  resumeFileName?: string;
}

interface Application {
  id: string;
  jobId: string; // Backend returns this in camelCase
  candidateId?: string;
  status: "pending" | "interviewing" | "offered" | "rejected" | "accepted";
  appliedAt: string;
  coverLetter?: string;
  resumeUrl?: string;
  job?: {
    id: string;
    title: string;
    companyName: string;
    location: string;
    type: string;
    salary: {
      min: number | null;
      max: number | null;
      currency: string;
    };
  };
}

export default function PublicJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string | undefined;
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [profileResume, setProfileResume] = useState<UserProfile | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState("");
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(false);

  // Check if user is authenticated and fetch profile + check for existing application
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail");
      if (email) setCandidateEmail(email);

      // Fetch user profile to get existing resume
      const fetchProfile = async () => {
        try {
          const candidateId = localStorage.getItem("candidateId");
          const data: any = await candidateApi.getById(candidateId as string);
          setProfileResume({
            resumeUrl: data.resumeUrl,
            resumeFileName: data.resumeFileName || "Your Profile Resume",
          });
        } catch (err) {
          console.error("Failed to fetch profile:", err);
        }
      };
      fetchProfile();
    }
  }, []);

  // Check if user has already applied to this job
  useEffect(() => {
    if (!isAuthenticated || !jobId) return;

    const checkExistingApplication = async () => {
      setCheckingApplication(true);
      try {
        const data: any = await applicationsApi.getAll();
        console.log("Applications response:", data); // Debug log
        console.log("Current jobId:", jobId); // Debug current job

        // Handle paginated response from backend: { applications: [...], pagination: {...} }
        const applications: Application[] = Array.isArray(data)
          ? data
          : (data?.applications || data?.data || []);

        // Check if user has already applied to this job
        if (Array.isArray(applications) && applications.length > 0) {
          console.log("Applications found:", applications.length);

          const existingApp = applications.find(app => {
            const appJobId = String(app.jobId);
            const currentJobId = String(jobId);
            console.log("Comparing app:", appJobId, "with current job:", currentJobId, "→", appJobId === currentJobId);
            return appJobId === currentJobId;
          });

          if (existingApp) {
            console.log("✅ Found existing application for this job:", existingApp);
            setExistingApplication(existingApp);
          } else {
            console.log("❌ No application found for this job ID:", jobId);
          }
        } else {
          console.log("No applications found for candidate");
        }
      } catch (err) {
        console.error("Failed to check applications:", err);
      } finally {
        setCheckingApplication(false);
      }
    };

    checkExistingApplication();
  }, [isAuthenticated, jobId]);

  useEffect(() => {
    if (!jobId) {
      setError("Invalid job ID.");
      setIsLoading(false);
      return;
    }

    const fetchJob = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Check if this job was already viewed in this session
        const viewedJobsKey = 'viewedJobs';
        const viewedJobsStr = sessionStorage.getItem(viewedJobsKey) || '[]';
        const viewedJobs = JSON.parse(viewedJobsStr) as string[];
        const alreadyViewed = viewedJobs.includes(jobId);

        // Only increment view if not already viewed in this session
        const shouldIncrementView = !alreadyViewed;

        console.log('Job ID:', jobId);
        console.log('Already viewed:', alreadyViewed);
        console.log('Should increment view:', shouldIncrementView);
        console.log('Viewed jobs in session:', viewedJobs);

        const data: any = await jobsApi.getById(jobId);
        const normalizedJob = {
          ...data,
          title: data.title || 'Untitled Position',
          description: data.description || '',
          requirements: data.requirements || [],
          skills: data.skills || [],
          screeningQuestions: data.screeningQuestions || [],
          department: data.department || null,
          experienceLevel: data.experienceLevel || null,
          equityOffered: data.equityOffered || null,
          equityRange: data.equityRange || null,
          publishedAt: data.publishedAt || null,
        };
        setJob(normalizedJob);

        // Mark this job as viewed in this session
        if (shouldIncrementView) {
          const updatedViewedJobs = [...viewedJobs, jobId];
          sessionStorage.setItem(viewedJobsKey, JSON.stringify(updatedViewedJobs));
        }
      } catch (error) {
        setError(
          `Failed to load job details. Details: ${(error as Error).message}`,
        );
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleApply = () => {
    // Check if already applied
    if (existingApplication) {
      return; // Button should be disabled, but extra safety check
    }

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      const currentUrl = `/browse/jobs/${jobId}`;
      router.push(`/auth/signup?type=candidate&redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    if (job?.screeningQuestions) {
      setScreeningAnswers(new Array(job.screeningQuestions.length).fill(""));
    }
    setShowApplyModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      setApplicationError("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApplicationError("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setUseProfileResume(false);
    setApplicationError("");
  };

  const handleSubmitApplication = async () => {
    setApplicationError("");

    // Double-check not already applied
    if (existingApplication) {
      setApplicationError("You have already applied to this position");
      return;
    }

    // Validation
    if (!useProfileResume && !resumeFile) {
      setApplicationError("Please upload your resume or use your profile resume");
      return;
    }

    if (useProfileResume && !profileResume?.resumeUrl) {
      setApplicationError("No resume found in your profile. Please upload one.");
      return;
    }

    if (!coverLetter.trim()) {
      setApplicationError("Please write a cover letter");
      return;
    }

    if (coverLetter.length < 50) {
      setApplicationError("Cover letter must be at least 50 characters");
      return;
    }

    if (job?.screeningQuestions && job.screeningQuestions.length > 0) {
      const allAnswered = screeningAnswers.every((answer) => answer.trim() !== "");
      if (!allAnswered) {
        setApplicationError("Please answer all screening questions");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const authToken = localStorage.getItem("authToken");
      const candidateId = localStorage.getItem("candidateId");
      let resumeUrl = profileResume?.resumeUrl;

      // If uploading new resume, upload it first
      if (!useProfileResume && resumeFile) {
        const resumeData: any = await candidateApi.uploadResume(candidateId as string, resumeFile);
        resumeUrl = resumeData.resumeUrl;
      }

      // Submit the application
      const newApplication: any = await applicationsApi.create({
        jobId: job?.id,
        candidateId,
        coverLetter,
        resumeUrl,
        screeningAnswers: screeningAnswers.length > 0 ? screeningAnswers : undefined,
      });

      // Update state to show user has applied
      setExistingApplication(newApplication);

      // Success!
      setShowApplyModal(false);
      setShowSuccessModal(true);
      setCoverLetter("");
      setResumeFile(null);
      setUseProfileResume(true);
      setScreeningAnswers([]);
    } catch (error) {
      setApplicationError(
        `Failed to submit application: ${(error as Error).message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("candidateWallet");
    setIsAuthenticated(false);
    setCandidateEmail("");
    setShowUserMenu(false);
    router.push("/auth/login?type=candidate");
  };

  if (isLoading) {
    return <LoadingState message="Loading job details..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found</p>
          <Button onClick={() => router.push("/browse")}>
            Browse All Jobs
          </Button>
        </div>
      </div>
    );
  }

  const hasAlreadyApplied = !!existingApplication;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground hidden sm:block">
                    {candidateEmail}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">
                        {candidateEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Candidate Account
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/candidate/profile")}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
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
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/auth/login?type=candidate")}
                  className="px-4 py-2 text-card-foreground hover:text-foreground font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/auth/signup?type=candidate")}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-lg hover:opacity-90  transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/browse/jobs")}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-sm p-8">
              {/* Job Header */}
              <div className="border-b border-border pb-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {job.title}
                    </h1>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{job.companyName || "Company"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  {job.companyLogo && (
                    <img
                      src={getAssetUrl(job.companyLogo)}
                      alt={job.companyName || "Company"}
                      className="w-24 h-24 rounded-xl object-cover border-2 border-border shadow-md ml-6 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  {job.featured && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-bold">
                      <Star className="w-3 h-3 fill-white" />
                      FEATURED
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.views} views
                  </span>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    About the Role
                  </h2>
                  <p className="text-card-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                      Requirements
                    </h2>
                    <ul className="space-y-2">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-card-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                      Skills
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-violet-100 text-primary rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl shadow-sm p-6 sticky top-24 space-y-6">
              {/* Already Applied Warning */}
              {hasAlreadyApplied && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">
                      Already Applied
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    You applied on {new Date(existingApplication.appliedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-green-700">Status:</span>
                    <StatusBadge status={existingApplication.status} size="sm" />
                  </div>
                  <button
                    onClick={() => router.push("/candidate/profile")}
                    className="text-sm text-primary hover:text-primary font-medium flex items-center gap-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    View My Applications →
                  </button>
                </div>
              )}

              {/* Apply Button - Disabled if already applied */}
              <div className="space-y-2">
                <Button
                  onClick={handleApply}
                  className="w-full"
                  size="lg"
                  disabled={hasAlreadyApplied || checkingApplication}
                  isLoading={checkingApplication}
                  icon={!checkingApplication && <Send className="w-5 h-5" />}
                >
                  {checkingApplication ? "Checking..." : hasAlreadyApplied ? "Already Applied" : "Apply for this Role"}
                </Button>
                {hasAlreadyApplied && (
                  <p className="text-xs text-muted-foreground text-center">
                    You cannot apply to this position again
                  </p>
                )}
              </div>

              {/* Job Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  Job Details
                </h3>

                {job.salary.min && job.salary.max && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Salary Range
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${job.salary.min / 1000}k - ${job.salary.max / 1000}k {job.salary.currency}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Location Type</p>
                    <p className="text-sm text-muted-foreground capitalize">{job.locationType}</p>
                  </div>
                </div>

                {job.experienceLevel && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Experience Level</p>
                      <p className="text-sm text-muted-foreground capitalize">{job.experienceLevel}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Guild</p>
                    <p className="text-sm text-muted-foreground">{job.guild}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          setCoverLetter("");
          setResumeFile(null);
          setUseProfileResume(true);
          setScreeningAnswers([]);
          setApplicationError("");
        }}
        title={`Apply for ${job?.title}`}
        size="lg"
      >
        <p className="text-muted-foreground mb-6">
          Complete the form below to submit your application
        </p>

        <div className="space-y-6">
          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Resume / CV *
            </label>

            {/* Option to use profile resume */}
            {profileResume?.resumeUrl && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseProfileResume(true);
                    setResumeFile(null);
                    setApplicationError("");
                  }}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    useProfileResume
                      ? "border-violet-500 bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      useProfileResume ? "border-violet-500" : "border-border"
                    }`}>
                      {useProfileResume && (
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      )}
                    </div>
                    <FileText className={`w-5 h-5 ${useProfileResume ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Use Resume from Profile
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profileResume.resumeFileName}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Option to upload new resume */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setUseProfileResume(false);
                  document.getElementById("resume-upload")?.click();
                }}
                className={`w-full p-4 border-2 border-dashed rounded-lg text-left transition-all ${
                  !useProfileResume && resumeFile
                    ? "border-violet-500 bg-primary/10"
                    : "border-border hover:border-violet-500"
                }`}
              >
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!useProfileResume && resumeFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-violet-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      </div>
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Upload New Resume
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resumeFile.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                        setUseProfileResume(true);
                      }}
                      className="text-destructive hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-border"></div>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Upload New Resume
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, or DOCX (max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Cover Letter */}
          <Textarea
            label="Cover Letter *"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            placeholder="Tell us why you're a great fit for this role..."
            showCounter
            minLength={50}
          />

          {/* Screening Questions */}
          {job?.screeningQuestions && job.screeningQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Screening Questions
              </h3>
              {job.screeningQuestions.map((question, index) => (
                <Textarea
                  key={index}
                  label={`${index + 1}. ${question}`}
                  value={screeningAnswers[index] || ""}
                  onChange={(e) => {
                    const newAnswers = [...screeningAnswers];
                    newAnswers[index] = e.target.value;
                    setScreeningAnswers(newAnswers);
                  }}
                  rows={3}
                  placeholder="Your answer..."
                />
              ))}
            </div>
          )}

          {applicationError && (
            <Alert variant="error">{applicationError}</Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowApplyModal(false);
                setCoverLetter("");
                setResumeFile(null);
                setUseProfileResume(true);
                setScreeningAnswers([]);
                setApplicationError("");
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApplication}
              isLoading={isSubmitting}
              className="flex-1"
              icon={!isSubmitting && <Send className="w-5 h-5" />}
            >
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="md"
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground mb-8">
            Your application for <strong>{job?.title}</strong> has been successfully submitted. The hiring team will review it and get back to you soon.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/browse/jobs");
              }}
              className="w-full"
              icon={<Search className="w-5 h-5" />}
            >
              Browse More Jobs
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/candidate/profile");
              }}
              className="w-full"
              icon={<ClipboardList className="w-5 h-5" />}
            >
              View My Applications
            </Button>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Stay on this page
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
