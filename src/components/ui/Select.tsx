import { SelectHTMLAttributes, ReactNode } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | ReactNode;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-card-foreground mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 border rounded-lg bg-card text-foreground
          focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
          ${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-border"}
          ${className}
        `}
        {...props}
      >
        {/* Support both patterns: options prop or children */}
        {placeholder && !children && (
          <option value="">{placeholder}</option>
        )}
        {options ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
