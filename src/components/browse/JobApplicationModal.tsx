"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  Send,
  Upload,
  CheckCircle2,
  Search,
  ClipboardList,
  ExternalLink,
  Link2,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { Modal, Button, Alert, Textarea } from "@/components/ui";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import { STATUS_COLORS } from "@/config/colors";
import { candidateApi, applicationsApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import type { Job, CandidateApplication, CandidateUserProfile, SocialLink } from "@/types";

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  candidateId: string;
  profileResume: CandidateUserProfile | null;
  profileSocialLinks: SocialLink[];
  onSubmitSuccess: (application: CandidateApplication) => void;
}

export default function JobApplicationModal({
  isOpen,
  onClose,
  job,
  candidateId,
  profileResume,
  profileSocialLinks,
  onSubmitSuccess,
}: JobApplicationModalProps) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>(
    () => new Array(job.screeningQuestions?.length || 0).fill("")
  );
  const [applicationError, setApplicationError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { execute: submitApplication, isLoading: isSubmitting } = useApi();

  const resetForm = () => {
    setCoverLetter("");
    setResumeFile(null);
    setUseProfileResume(true);
    setScreeningAnswers(new Array(job.screeningQuestions?.length || 0).fill(""));
    setApplicationError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
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

    if (!coverLetter.trim()) {
      setApplicationError("Please write a cover letter");
      return;
    }

    if (coverLetter.length < 50) {
      setApplicationError("Cover letter must be at least 50 characters");
      return;
    }

    if (!useProfileResume && !resumeFile) {
      setApplicationError("Please upload your resume or use your profile resume");
      return;
    }
    if (useProfileResume && !profileResume?.resumeUrl) {
      setApplicationError("No resume found in your profile. Please upload one.");
      return;
    }

    if (job.screeningQuestions && job.screeningQuestions.length > 0) {
      const allAnswered = screeningAnswers.every((answer) => answer.trim() !== "");
      if (!allAnswered) {
        setApplicationError("Please answer all screening questions");
        return;
      }
    }

    await submitApplication(
      async () => {
        let resumeUrl = profileResume?.resumeUrl;

        if (!useProfileResume && resumeFile) {
          const resumeData = await candidateApi.uploadResume(candidateId, resumeFile);
          resumeUrl = resumeData.resumeUrl;
        }

        return applicationsApi.create({
          jobId: job.id,
          candidateId,
          coverLetter,
          resumeUrl,
          screeningAnswers: screeningAnswers.length > 0 ? screeningAnswers : undefined,
          socialLinks: profileSocialLinks.length > 0 ? profileSocialLinks : undefined,
        });
      },
      {
        onSuccess: (data) => {
          const newApplication = data as { id: string };
          const application: CandidateApplication = {
            id: newApplication.id,
            jobId: job.id,
            status: "pending",
            coverLetter,
            appliedAt: new Date().toISOString(),
            job: {
              id: job.id,
              title: job.title,
              companyName: job.companyName,
              location: job.location,
              type: job.type,
            },
          };

          onSubmitSuccess(application);
          resetForm();
          onClose();
          setShowSuccessModal(true);
        },
        onError: (msg) => {
          logger.error("Application submission failed", msg, { silent: true });
          setApplicationError(`Failed to submit application: ${msg}`);
        },
      }
    );
  };

  return (
    <>
      {/* Apply Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Apply for ${job.title}`}
        size="lg"
      >
        <p className="text-muted-foreground mb-6">
          Complete the form below to submit your application
        </p>

        <div className="space-y-6">
          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Resume / CV <span className="text-destructive">*</span>
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
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        useProfileResume ? "border-primary" : "border-border"
                      }`}
                    >
                      {useProfileResume && (
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      )}
                    </div>
                    <VettedIcon
                      name="document"
                      className={`w-5 h-5 ${useProfileResume ? "text-primary" : "text-muted-foreground"}`}
                    />
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
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary"
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
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      </div>
                      <VettedIcon name="document" className="w-5 h-5 text-primary" />
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                        setUseProfileResume(true);
                      }}
                      className={`${STATUS_COLORS.negative.text} hover:opacity-80 text-sm cursor-pointer`}
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

          {/* Social Links from Profile */}
          {profileSocialLinks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Social Links from Profile
              </label>
              <div className="flex flex-wrap gap-2">
                {profileSocialLinks.map((link, i) => {
                  const Icon = getPlatformIcon(link.platform);
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group text-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium text-foreground">
                        {link.label || getPlatformLabel(link.platform)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                These links will be included with your application. Update them in your
                profile settings.
              </p>
            </div>
          )}

          {/* Screening Questions */}
          {job.screeningQuestions && job.screeningQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
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

          {applicationError && <Alert variant="error">{applicationError}</Alert>}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleClose}
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
          <div className={`w-16 h-16 ${STATUS_COLORS.positive.bgSubtle} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <CheckCircle2 className={`w-10 h-10 ${STATUS_COLORS.positive.icon}`} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground mb-8">
            Your application for <strong>{job.title}</strong> has been
            successfully submitted. The hiring team will review it and get back
            to you soon.
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
                router.push("/candidate/applications");
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
    </>
  );
}
