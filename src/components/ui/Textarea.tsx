import { TextareaHTMLAttributes, ReactNode } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | ReactNode;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  minLength?: number;
  value?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = "",
  id,
  showCounter,
  minLength,
  maxLength,
  value = "",
  ...props
}: TextareaProps) {
  const textareaId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;
  const isTooShort = minLength && currentLength < minLength;
  const isTooLong = maxLength && currentLength > maxLength;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-card-foreground"
          >
            {label}
          </label>
          {showCounter && (minLength || maxLength) && (
            <span className={`text-xs ${isTooShort || isTooLong ? 'text-destructive' : 'text-muted-foreground'}`}>
              {currentLength}{minLength && `/${minLength} min`}{maxLength && ` (max ${maxLength})`}
            </span>
          )}
        </div>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full px-3 py-2 border rounded-lg bg-card text-foreground
          focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
          ${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-border"}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
