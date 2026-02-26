"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jobsApi, guildsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { validateMinLength, validateMinLengthPerLine } from "@/lib/validation";
import type { Guild } from "@/types";

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

  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch guilds on mount
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const guildsData = await guildsApi.getAll();
        setGuilds(Array.isArray(guildsData) ? guildsData : []);
      } catch (error) {
        console.error("Failed to fetch guilds:", error);
      }
    };
    fetchGuilds();
  }, []);

  // Set companyId from auth context
  const auth = useAuthContext();
  useEffect(() => {
    if (auth.userId && auth.userType === "company") {
      setFormData((prev) => ({ ...prev, companyId: auth.userId! }));
    }
  }, [auth.userId, auth.userType]);

  // Fetch job data if editing
  useEffect(() => {
    if (isEditing && jobId) {
      const fetchJob = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await jobsApi.getById(jobId);
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
        } catch (error: unknown) {
          setError(
            `Failed to load job data. Details: ${(error as Error).message}`
          );
          console.error("Fetch error:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchJob();
    }
  }, [isEditing, jobId]);

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

    if (!formData.companyId) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const jobData = {
        ...formData,
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
        companyId: formData.companyId,
      };

      if (isEditing && jobId) {
        await jobsApi.update(jobId, jobData);
      } else {
        await jobsApi.create(jobData);
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
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
  };
}
