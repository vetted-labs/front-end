import { useState, useCallback, useRef } from "react";

type ValidationRule = {
  test: (value: string) => boolean;
  message: string;
};

interface UseFieldValidationOptions {
  rules: ValidationRule[];
  validateOnBlur?: boolean;
}

export function useFieldValidation({ rules, validateOnBlur = true }: UseFieldValidationOptions) {
  const [error, setError] = useState<string | undefined>();
  const touchedRef = useRef(false);

  const validate = useCallback(
    (value: string): boolean => {
      for (const rule of rules) {
        if (!rule.test(value)) {
          setError(rule.message);
          return false;
        }
      }
      setError(undefined);
      return true;
    },
    [rules]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      touchedRef.current = true;
      if (validateOnBlur) {
        validate(e.target.value);
      }
    },
    [validate, validateOnBlur]
  );

  const clearError = useCallback(() => setError(undefined), []);

  return { error, validate, onBlur, clearError, touched: touchedRef.current };
}

export function focusFirstError(containerRef: React.RefObject<HTMLElement | null>) {
  const firstError = containerRef.current?.querySelector<HTMLElement>(
    '[data-field-error="true"] input, [data-field-error="true"] textarea, [data-field-error="true"] select'
  );
  firstError?.focus();
}
