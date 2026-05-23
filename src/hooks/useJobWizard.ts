"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jobsApi, guildsApi, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import {
  useFormPersistence,
  useDraftAutosave,
} from "@/lib/hooks/useFormPersistence";
import { useAuthContext } from "@/hooks/useAuthContext";
import { validateMinLength } from "@/lib/validation";
import { logger } from "@/lib/logger";
import type {
  ApplicationQuestion,
  EmbedProvider,
  ExternalLink,
  Guild,
  UploadedImage,
} from "@/types";

/**
 * Shape persisted in `useFormPersistence` and consumed by every wizard step.
 *
 * Extends the legacy `JobFormData` with the v2 fields introduced by the
 * post-a-job redesign: custom application questions, hero/gallery uploads,
 * external links, and optional video embed.
 */
export interface JobFormData {
  title: string;
  department?: string;
  description: string;
  requirements?: string[];
  /** Top skills (chip multi-select, cap 8). Stored under the existing `skills` column. */
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
  /** Legacy free-text screening questions. Kept on the type for migration only. */
  screeningQuestions?: string[];
  companyId?: string;
  /** Custom application form questions (max MAX_APPLICATION_QUESTIONS). */
  applicationQuestions?: ApplicationQuestion[];
  /** Hero image upload. */
  heroImage?: UploadedImage;
  /** Optional gallery (max MAX_GALLERY_IMAGES). */
  gallery?: UploadedImage[];
  /** External link rows (max MAX_EXTERNAL_LINKS). */
  externalLinks?: ExternalLink[];
  /** Optional video embed (YouTube or Loom). */
  embed?: { provider: EmbedProvider; url: string };
}

export interface JobWizardState {
  currentStep: number;
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  globalError: string | null;
  isSubmitting: boolean;
  isLoadingJob: boolean;
  guilds: Guild[];
}

export interface JobWizardActions {
  goToStep: (step: number) => void;
  next: () => void;
  prev: () => void;
  updateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  /** Per-step validator — exposed so steps (e.g. review) can reflect status. */
  validateStep: (step: number) => Record<string, string>;
}

export const TOTAL_STEPS = 7;
const MAX_TOP_SKILLS = 8;
const MAX_REQUIREMENTS = 12;

const INITIAL_FORM: JobFormData = {
  title: "",
  description: "",
  location: "",
  locationType: "remote",
  jobType: "Full-time",
  salaryCurrency: "USD",
  guild: "",
  status: "draft",
  companyId: "",
};

function clampStep(step: number): number {
  if (step < 1) return 1;
  if (step > TOTAL_STEPS) return TOTAL_STEPS;
  return step;
}

/**
 * Wizard-shaped replacement for `useJobForm`. Exposes step navigation,
 * per-step validation, draft autosave (namespace `job-post-v2`), and a single
 * `publish` action that validates every step before calling the API.
 */
export function useJobWizard(jobId?: string): JobWizardState & JobWizardActions {
  const router = useRouter();
  const isEditing = !!jobId;
  const auth = useAuthContext();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<JobFormData>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracks whether the user has typed into the form yet. The persistence
  // storageKey depends on auth.userId, which is null on first mount and changes
  // once auth hydrates — re-triggering the draft-restore effect. Without this
  // guard that late restore overwrites in-progress input (observed: the title
  // field clearing mid-entry). We only restore a draft into a pristine form.
  const hasUserEditedRef = useRef(false);

  // Drafts only apply to brand-new jobs. Bumped namespace so legacy
  // `job-post` drafts don't collide with the new shape.
  const variantKey = isEditing ? `edit-${jobId}` : "new";
  const { save: saveDraftSnapshot, clear: clearDraft } =
    useFormPersistence<JobFormData>({
      namespace: "job-post-v2",
      identity: auth.userType === "company" ? auth.userId : null,
      variant: variantKey,
      version: 1,
      onRestore: (draft) => {
        if (isEditing || hasUserEditedRef.current) return;
        setFormData(draft);
        toast.info("Draft restored from previous session");
      },
    });
  useDraftAutosave(saveDraftSnapshot, formData, !isEditing);

  // Guilds for step 4 picker.
  const { data: guildsData } = useFetch<Guild[]>(() => guildsApi.getAll(), {
    onError: (msg) =>
      logger.error("Failed to fetch guilds", msg, { silent: true }),
  });
  const guilds = useMemo(() => guildsData ?? [], [guildsData]);

  const effectiveCompanyId =
    auth.userType === "company" && auth.userId
      ? auth.userId
      : formData.companyId;

  // Edit mode: load job and populate the wizard.
  const { isLoading: isLoadingJob } = useFetch(
    () => jobsApi.getById(jobId!),
    {
      skip: !isEditing || !jobId,
      onSuccess: (data) => {
        setFormData({
          title: data.title || "",
          department: data.department || undefined,
          description: data.description || "",
          requirements: data.requirements || [],
          skills: data.skills || [],
          location: data.location || "",
          locationType: data.locationType || "remote",
          jobType: data.type || "Full-time",
          experienceLevel:
            (data.experienceLevel as JobFormData["experienceLevel"]) ||
            undefined,
          salaryMin: data.salary?.min ?? undefined,
          salaryMax: data.salary?.max ?? undefined,
          salaryCurrency: data.salary?.currency || "USD",
          guild: data.guildId || data.guild || "",
          status: data.status || "draft",
          screeningQuestions: data.screeningQuestions || [],
          applicationQuestions: data.applicationQuestions || [],
          heroImage: data.heroImageUrl
            ? {
                url: data.heroImageUrl,
                filename: data.heroImageUrl.split("/").pop() || "hero",
                sizeBytes: 0,
              }
            : undefined,
          gallery: (data.galleryUrls || []).map((url) => ({
            url,
            filename: url.split("/").pop() || "image",
            sizeBytes: 0,
          })),
          externalLinks: data.externalLinks || [],
          embed:
            data.embedUrl && data.embedProvider
              ? { provider: data.embedProvider, url: data.embedUrl }
              : undefined,
          companyId:
            data.companyId || "00000000-0000-0000-0000-000000000000",
        });
      },
      onError: (msg) => {
        setGlobalError(`Failed to load job data. Details: ${msg}`);
      },
    }
  );

  // ── Per-step validation ────────────────────────────────────────────────
  const validateStep = useCallback(
    (step: number): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (step === 1) {
        const titleErr = validateMinLength(formData.title, 3, "Job title");
        if (titleErr) errors.title = titleErr;
        if (!formData.experienceLevel) {
          errors.experienceLevel = "Pick an experience level";
        }
        if (!formData.jobType) {
          errors.jobType = "Pick an employment type";
        }
        const skills = formData.skills?.filter(Boolean) ?? [];
        if (skills.length === 0) {
          errors.skills = "Add at least one top skill";
        } else if (skills.length > MAX_TOP_SKILLS) {
          errors.skills = `You can add up to ${MAX_TOP_SKILLS} skills`;
        }
      }

      if (step === 2) {
        if (!formData.locationType) {
          errors.locationType = "Pick a work model";
        }
        const locErr = validateMinLength(formData.location, 2, "Location");
        if (locErr) errors.location = locErr;
        if (
          formData.salaryMin !== undefined &&
          formData.salaryMax !== undefined &&
          formData.salaryMin > formData.salaryMax
        ) {
          errors.salaryMin =
            "Minimum salary cannot be greater than maximum salary";
        }
        if (!formData.salaryCurrency) {
          errors.salaryCurrency = "Pick a currency";
        }
      }

      if (step === 3) {
        const descErr = validateMinLength(
          formData.description,
          50,
          "Description"
        );
        if (descErr) errors.description = descErr;
        const reqs = formData.requirements?.filter((r) => r.trim()) ?? [];
        if (reqs.length === 0) {
          errors.requirements = "Add at least one requirement";
        } else if (reqs.length > MAX_REQUIREMENTS) {
          errors.requirements = `You can add up to ${MAX_REQUIREMENTS} requirements`;
        } else if (reqs.some((r) => r.trim().length < 3)) {
          errors.requirements =
            "Each requirement must be at least 3 characters";
        }
      }

      if (step === 4) {
        if (!formData.guild) {
          errors.guild = "Please assign a guild";
        }
      }

      // Steps 5 & 6 (questions / attachments) are optional in v1 — no
      // wizard-level guards beyond what their dedicated components enforce.

      if (step === 7) {
        if (!effectiveCompanyId) {
          errors.companyId = "Company ID is missing. Please log in again.";
        }
      }

      return errors;
    },
    [formData, effectiveCompanyId]
  );

  // ── Navigation ────────────────────────────────────────────────────────
  const goToStep = useCallback((step: number) => {
    setCurrentStep(clampStep(step));
    setGlobalError(null);
    setFieldErrors({});
  }, []);

  const next = useCallback(() => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError("Please fix the highlighted fields before continuing.");
      return;
    }
    setFieldErrors({});
    setGlobalError(null);
    setCurrentStep((s) => clampStep(s + 1));
  }, [currentStep, validateStep]);

  const prev = useCallback(() => {
    setFieldErrors({});
    setGlobalError(null);
    setCurrentStep((s) => clampStep(s - 1));
  }, []);

  const updateField = useCallback(
    <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
      hasUserEditedRef.current = true;
      setFormData((p) => ({ ...p, [field]: value }));
      setGlobalError(null);
      setFieldErrors((prev) => {
        if (!prev[field as string]) return prev;
        const copy = { ...prev };
        delete copy[field as string];
        return copy;
      });
    },
    []
  );

  // ── Payload builder ───────────────────────────────────────────────────
  const buildPayload = useCallback(
    (statusOverride?: "draft" | "active") => {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        locationType: formData.locationType,
        jobType: formData.jobType,
        salaryCurrency: formData.salaryCurrency,
        guild: formData.guild,
        status: statusOverride ?? formData.status,
        companyId: effectiveCompanyId,
      };

      if (formData.department) payload.department = formData.department;
      if (formData.experienceLevel)
        payload.experienceLevel = formData.experienceLevel;
      if (formData.salaryMin !== undefined)
        payload.salaryMin = formData.salaryMin;
      if (formData.salaryMax !== undefined)
        payload.salaryMax = formData.salaryMax;

      const requirements = formData.requirements?.filter(Boolean) ?? [];
      if (requirements.length > 0) payload.requirements = requirements;

      const skills = formData.skills?.filter(Boolean) ?? [];
      if (skills.length > 0) payload.skills = skills;

      const screening = formData.screeningQuestions?.filter(Boolean) ?? [];
      if (screening.length > 0) payload.screeningQuestions = screening;

      const questions = formData.applicationQuestions ?? [];
      if (questions.length > 0) payload.applicationQuestions = questions;

      if (formData.heroImage?.url)
        payload.heroImageUrl = formData.heroImage.url;

      const galleryUrls = (formData.gallery ?? [])
        .map((g) => g.url)
        .filter(Boolean);
      if (galleryUrls.length > 0) payload.galleryUrls = galleryUrls;

      const links = formData.externalLinks ?? [];
      if (links.length > 0) payload.externalLinks = links;

      if (formData.embed?.url) {
        payload.embedUrl = formData.embed.url;
        payload.embedProvider = formData.embed.provider;
      }

      return payload;
    },
    [formData, effectiveCompanyId]
  );

  // ── Save draft ────────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    setIsSubmitting(true);
    setGlobalError(null);

    // Drafts only need a minimum identity check — title + companyId.
    const draftErrors: Record<string, string> = {};
    const titleErr = validateMinLength(formData.title, 3, "Job title");
    if (titleErr) draftErrors.title = titleErr;
    if (!effectiveCompanyId) {
      draftErrors.companyId = "Company ID is missing. Please log in again.";
    }
    if (Object.keys(draftErrors).length > 0) {
      setFieldErrors(draftErrors);
      setGlobalError("Add a title before saving as a draft.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = buildPayload("draft");
      if (isEditing && jobId) {
        await jobsApi.update(jobId, payload);
      } else {
        await jobsApi.create(payload);
      }
      clearDraft();
      toast.success("Draft saved successfully");
      router.push("/dashboard/jobs");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData.title,
    effectiveCompanyId,
    buildPayload,
    isEditing,
    jobId,
    clearDraft,
    router,
  ]);

  // ── Publish ───────────────────────────────────────────────────────────
  const publish = useCallback(async () => {
    setIsSubmitting(true);
    setGlobalError(null);

    // Validate every step. Surface the first failing step so the rail
    // can reflect status; the global error sends the user there.
    const allErrors: Record<string, string> = {};
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const stepErrors = validateStep(s);
      Object.assign(allErrors, stepErrors);
    }
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      // Jump to the first step containing an error.
      for (let s = 1; s <= TOTAL_STEPS; s++) {
        if (Object.keys(validateStep(s)).length > 0) {
          setCurrentStep(s);
          break;
        }
      }
      setGlobalError("Some required fields are missing — see the highlighted step.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = buildPayload(isEditing ? undefined : "active");
      if (isEditing && jobId) {
        await jobsApi.update(jobId, payload);
      } else {
        await jobsApi.create(payload);
      }
      clearDraft();
      toast.success(
        isEditing ? "Job updated successfully" : "Job published successfully"
      );
      router.push("/dashboard/jobs");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, buildPayload, isEditing, jobId, clearDraft, router]);

  return {
    currentStep,
    formData,
    fieldErrors,
    globalError,
    isSubmitting,
    isLoadingJob,
    guilds,
    goToStep,
    next,
    prev,
    updateField,
    saveDraft,
    publish,
    validateStep,
  };
}
