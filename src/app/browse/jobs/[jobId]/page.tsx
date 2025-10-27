"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
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
} from "lucide-react";

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
}

export default function PublicJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string | undefined;
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState("");

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail");
      if (email) setCandidateEmail(email);
    }
  }, []);

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
        const response = await fetch(`http://localhost:4000/api/jobs/${jobId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to fetch job: ${response.status} - ${errorData.error || response.statusText}`,
          );
        }
        const data = await response.json();
        // Ensure all fields are initialized with defaults
        const normalizedJob = {
          ...data,
          title: data.title || 'Untitled Position',
          description: data.description || '',
          guild: data.guild || '',
          department: data.department || null,
          requirements: data.requirements || [],
          skills: data.skills || [],
          screeningQuestions: data.screeningQuestions || [],
        };
        setJob(normalizedJob);
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
    // Check if user is authenticated
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      // Redirect to signup with return URL
      const currentUrl = `/browse/jobs/${jobId}`;
      router.push(`/candidate/signup?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    // Initialize screening answers array
    if (job?.screeningQuestions) {
      setScreeningAnswers(new Array(job.screeningQuestions.length).fill(""));
    }
    setShowApplyModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      setApplicationError("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setApplicationError("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setApplicationError("");
  };

  const handleSubmitApplication = async () => {
    setApplicationError("");

    // Validation
    if (!resumeFile) {
      setApplicationError("Please upload your resume");
      return;
    }

    if (!coverLetter.trim()) {
      setApplicationError("Please write a cover letter");
      return;
    }

    // Check if all screening questions are answered
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

      // First, upload the resume
      const resumeFormData = new FormData();
      resumeFormData.append("resume", resumeFile);

      const resumeResponse = await fetch(
        `http://localhost:4000/api/candidates/${candidateId}/resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: resumeFormData,
        }
      );

      if (!resumeResponse.ok) {
        throw new Error("Failed to upload resume");
      }

      const resumeData = await resumeResponse.json();

      // Then, submit the application
      const applicationResponse = await fetch(
        "http://localhost:4000/api/applications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            jobId: job?.id,
            candidateId,
            coverLetter,
            resumeUrl: resumeData.resumeUrl,
            screeningAnswers: screeningAnswers.length > 0 ? screeningAnswers : undefined,
          }),
        }
      );

      if (!applicationResponse.ok) {
        throw new Error("Failed to submit application");
      }

      // Success!
      alert("Application submitted successfully!");
      setShowApplyModal(false);
      setCoverLetter("");
      setResumeFile(null);
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
    router.push("/candidate/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Job not found"}</p>
          <button
            onClick={() => router.push("/browse/jobs")}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Browse All Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/browse")}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
              <span className="text-xl font-bold text-slate-900">Vetted</span>
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/browse/jobs")}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Jobs
              </button>

              {/* User Account Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <User className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 hidden sm:block">
                      {candidateEmail}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {candidateEmail}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Candidate</p>
                      </div>
                      <button
                        onClick={() => router.push("/candidate/profile")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        My Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/candidate/login")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push("/candidate/signup")}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all text-sm font-medium"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Briefcase className="w-8 h-8 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {job.title}
                    </h1>
                    {job.companyName && (
                      <p className="flex items-center gap-2 text-lg text-gray-700">
                        <Building2 className="w-5 h-5" />
                        {job.companyName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium capitalize">
                    {job.locationType}
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {job.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  About the Role
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Requirements
                  </h2>
                  <ul className="space-y-3">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-violet-600 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Required Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Screening Questions */}
              {job.screeningQuestions && job.screeningQuestions.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Application Questions
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    You'll be asked to answer these questions during the
                    application process:
                  </p>
                  <div className="space-y-3">
                    {job.screeningQuestions.map((question, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Question {index + 1}
                        </p>
                        <p className="text-gray-900">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guild Info */}
              <div className="p-6 bg-violet-50 rounded-xl border border-violet-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Shield className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Guild-Verified Position
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      This role will be reviewed by the{" "}
                      <span className="font-semibold text-violet-700">
                        {job.guild}
                      </span>
                      . Your application will be evaluated by experienced
                      professionals in the field who stake their reputation on
                      their assessments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24 space-y-6">
              {/* Apply Button */}
              <button
                onClick={handleApply}
                className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Send className="w-5 h-5" />
                Apply for this Role
              </button>

              {/* Job Details */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Job Details
                </h3>

                {job.salary.min && job.salary.max && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">Salary Range</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      ${job.salary.min / 1000}k - ${job.salary.max / 1000}k
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.salary.currency} per year
                    </p>
                  </div>
                )}

                {job.equityOffered && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-medium">Equity</span>
                    </div>
                    <p className="text-gray-900">
                      {job.equityRange || "Offered"}
                    </p>
                  </div>
                )}

                {job.experienceLevel && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Experience Level</span>
                    </div>
                    <p className="text-gray-900 capitalize">
                      {job.experienceLevel}
                    </p>
                  </div>
                )}

                {job.department && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">Department</span>
                    </div>
                    <p className="text-gray-900">{job.department}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {job.applicants}
                    </p>
                    <p className="text-xs text-gray-600">Applicants</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                      <Eye className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {job.views}
                    </p>
                    <p className="text-xs text-gray-600">Views</p>
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Job link copied to clipboard!");
                  }}
                  className="w-full py-2 px-4 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Share this Job
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Apply for {job.title}
            </h2>
            <p className="text-gray-600 mb-6">
              Complete the form below to submit your application
            </p>

            <div className="space-y-6">
              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume / CV *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-violet-500 transition-colors">
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer"
                  >
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {resumeFile.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setResumeFile(null);
                          }}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, or DOCX (max 5MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter *
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                  placeholder="Tell us why you're a great fit for this role..."
                />
              </div>

              {/* Screening Questions */}
              {job?.screeningQuestions && job.screeningQuestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Screening Questions
                  </h3>
                  {job.screeningQuestions.map((question, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {index + 1}. {question}
                      </label>
                      <textarea
                        value={screeningAnswers[index] || ""}
                        onChange={(e) => {
                          const newAnswers = [...screeningAnswers];
                          newAnswers[index] = e.target.value;
                          setScreeningAnswers(newAnswers);
                        }}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                        placeholder="Your answer..."
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {applicationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{applicationError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setCoverLetter("");
                    setResumeFile(null);
                    setScreeningAnswers([]);
                    setApplicationError("");
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
