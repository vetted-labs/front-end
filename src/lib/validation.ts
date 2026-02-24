/**
 * Reusable validation utilities for form fields.
 *
 * Usage:
 *   const error = validateMinLength(value, 3, "Job title");
 *   // → null  (valid)
 *   // → "Job title must be at least 3 characters"  (invalid)
 */

/**
 * Returns an error message if `value` (trimmed) is shorter than `min` characters,
 * or `null` when valid. Pass `fieldLabel` for a human-readable message.
 */
export function validateMinLength(
  value: string,
  min: number,
  fieldLabel: string,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return `${fieldLabel} is required`;
  if (trimmed.length < min) return `${fieldLabel} must be at least ${min} characters`;
  return null;
}

/**
 * Same as `validateMinLength` but returns `null` when the value is empty
 * (i.e. the field is optional). Only validates length when something is entered.
 */
export function validateMinLengthOptional(
  value: string,
  min: number,
  fieldLabel: string,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < min) return `${fieldLabel} must be at least ${min} characters`;
  return null;
}

/**
 * Validates each non-empty line in a multi-line string (e.g. "one per line" textareas).
 * Returns an error if any line is shorter than `min` characters.
 */
export function validateMinLengthPerLine(
  value: string,
  min: number,
  fieldLabel: string,
): string | null {
  const lines = value.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null; // optional field, no lines entered
  const tooShort = lines.find((l) => l.trim().length < min);
  if (tooShort) {
    return `Each ${fieldLabel.toLowerCase()} must be at least ${min} characters`;
  }
  return null;
}
