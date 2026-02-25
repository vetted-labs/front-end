import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  showCounter?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, description, error, showCounter, required, value, minLength, maxLength, ...props }, ref) => {
    const currentLength = typeof value === "string" ? value.length : 0
    const minLengthNum = minLength ? Number(minLength) : undefined
    const maxLengthNum = maxLength ? Number(maxLength) : undefined

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-sm font-medium text-foreground">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          {showCounter && maxLengthNum && (
            <span className={cn(
              "text-xs",
              currentLength < (minLengthNum || 0) ? "text-destructive" :
              currentLength > maxLengthNum ? "text-destructive" :
              "text-muted-foreground"
            )}>
              {currentLength} / {maxLengthNum}
              {minLengthNum && currentLength < minLengthNum && ` (min: ${minLengthNum})`}
            </span>
          )}
        </div>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          required={required}
          value={value}
          minLength={minLength}
          maxLength={maxLength}
          {...props}
        />
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
