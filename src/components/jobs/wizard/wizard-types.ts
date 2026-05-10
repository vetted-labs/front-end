/**
 * Shared step component prop type for the post-a-job wizard.
 *
 * Pulls `JobFormData` from `useJobWizard` (the wizard hook) so every step
 * component sees the same canonical shape. Sibling steps (StepRole, etc.)
 * use the same import path.
 */
import type { JobFormData } from "@/hooks/useJobWizard";

export type StepProps = {
  formData: JobFormData;
  fieldErrors: Record<string, string>;
  updateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => void;
};
