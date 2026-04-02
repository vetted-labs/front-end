"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jobsApi, guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useAuthContext } from "@/hooks/useAuthContext";
import { validateMinLength, validateMinLengthPerLine } from "@/lib/validation";
import type { Guild } from "@/types";
import { logger } from "@/lib/logger";

export interface JobFormData {
  title: string;
  department?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  jobType: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel?: "junior" | "mid" | "senior" | "lead" | "executive";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  guild: string;
  status: "draft" | "active" | "paused" | "closed";
  screeningQuestions?: string[];
  companyId?: string;
}

export function useJobForm(jobId?: string) {
  const router = useRouter();
  const isEditing = !!jobId;
  const DRAFT_KEY = `job-draft-${jobId || "new"}`;

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    location: "",
    locationType: "remote",
    jobType: "Full-time",
    salaryCurrency: "USD",
    guild: "",
    status: "draft",
    companyId: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft on mount (new jobs only — edits load from API)
  useMountEffect(() => {
    if (!jobId) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const draft = JSON.parse(saved) as JobFormData;
          setFormData(draft);
          toast.info("Draft restored from previous session");
        } catch {
          // Corrupted draft — ignore
        }
      }
    }
  });

  // Auto-save to localStorage on changes (new jobs only, debounced 1s)
  // eslint-disable-next-line no-restricted-syntax -- auto-save requires reactive sync to localStorage
  useEffect(() => {
    if (!jobId) {
      const timer = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, DRAFT_KEY, jobId]);

  // Fetch guilds on mount
  const { data: guildsData } = useFetch<Guild[]>(
    () => guildsApi.getAll(),
    { onError: (msg) => logger.error("Failed to fetch guilds", msg, { silent: true }) }
  );
  const guilds = guildsData ?? [];

  const auth = useAuthContext();
  const effectiveCompanyId = auth.userType === "company" && auth.userId ? auth.userId : formData.companyId;

  // Fetch job data if editing
  const { isLoading: isLoadingJob } = useFetch(
    () => jobsApi.getById(jobId!),
    {
      skip: !isEditing || !jobId,
      onSuccess: (data) => {
        setFormData({
          title: data.title || "",
          department: data.department || "",
          description: data.description || "",
          requirements: data.requirements || [],
          skills: data.skills || [],
          location: data.location || "",
          locationType: data.locationType || "remote",
          jobType: data.type || "Full-time",
          experienceLevel: (data.experienceLevel as JobFormData["experienceLevel"]) || undefined,
          salaryMin: data.salary?.min || undefined,
          salaryMax: data.salary?.max || undefined,
          salaryCurrency: data.salary?.currency || "USD",
          guild: data.guild || "",
          status: data.status || "draft",
          screeningQuestions: data.screeningQuestions || [],
          companyId: data.companyId || "00000000-0000-0000-0000-000000000000",
        });
      },
      onError: (msg) => {
        setError(`Failed to load job data. Details: ${msg}`);
      },
    }
  );

  const isLoading = isSubmitting || isLoadingJob;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields with minimum lengths
    const titleErr = validateMinLength(formData.title, 3, "Job title");
    if (titleErr) errors.title = titleErr;

    const descErr = validateMinLength(formData.description, 50, "Description");
    if (descErr) errors.description = descErr;

    const locErr = validateMinLength(formData.location, 2, "Location");
    if (locErr) errors.location = locErr;

    if (!formData.guild) {
      errors.guild = "Please select a guild";
    }

    if (!effectiveCompanyId) {
      errors.companyId = "Company ID is missing. Please log in again.";
    }

    // Per-line fields — each entry must be meaningful
    const reqErr = validateMinLengthPerLine(
      formData.requirements?.join("\n") || "", 3, "Requirement"
    );
    if (reqErr) errors.requirements = reqErr;

    const skillErr = validateMinLengthPerLine(
      formData.skills?.join("\n") || "", 2, "Skill"
    );
    if (skillErr) errors.skills = skillErr;

    const sqErr = validateMinLengthPerLine(
      formData.screeningQuestions?.join("\n") || "", 10, "Screening question"
    );
    if (sqErr) errors.screeningQuestions = sqErr;

    // Optional but validated if provided
    if (
      formData.salaryMin &&
      formData.salaryMax &&
      formData.salaryMin > formData.salaryMax
    ) {
      errors.salaryMin =
        "Minimum salary cannot be greater than maximum salary";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the errors above before submitting");
      return false;
    }

    return true;
  };

  const validateDraft = (): boolean => {
    const errors: Record<string, string> = {};

    const titleErr = validateMinLength(formData.title, 3, "Job title");
    if (titleErr) errors.title = titleErr;

    if (!effectiveCompanyId) {
      errors.companyId = "Company ID is missing. Please log in again.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the errors above before saving");
      return false;
    }

    return true;
  };

  const buildJobPayload = (statusOverride?: "draft" | "active") => ({
    ...formData,
    status: statusOverride ?? formData.status,
    department: formData.department || undefined,
    requirements: formData.requirements?.length
      ? formData.requirements
      : undefined,
    skills: formData.skills?.length ? formData.skills : undefined,
    experienceLevel: formData.experienceLevel || undefined,
    salaryMin: formData.salaryMin || undefined,
    salaryMax: formData.salaryMax || undefined,
    screeningQuestions: formData.screeningQuestions?.length
      ? formData.screeningQuestions
      : undefined,
    companyId: effectiveCompanyId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Force "active" for new jobs (publish action); keep current status for edits
      const jobData = buildJobPayload(isEditing ? undefined : "active");

      if (isEditing && jobId) {
        await jobsApi.update(jobId, jobData);
      } else {
        await jobsApi.create(jobData);
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success(isEditing ? "Job updated successfully" : "Job published successfully");
      router.push("/dashboard/jobs");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    if (!validateDraft()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const jobData = buildJobPayload("draft");
      await jobsApi.create(jobData);
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Draft saved successfully");
      router.push("/dashboard/jobs");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (
    field: keyof JobFormData,
    value: string | string[] | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return {
    formData,
    guilds,
    error,
    fieldErrors,
    isLoading,
    isEditing,
    updateField,
    handleSubmit,
    handleSaveDraft,
  };
}
