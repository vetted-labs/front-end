"use client";
import { Building2 } from "lucide-react";

const inputClass =
  "w-full pl-10 pr-4 py-2.5 text-sm bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none";
const inputClassNoIcon =
  "w-full px-4 py-2.5 text-sm bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 transition-all outline-none";

interface Props {
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  errors: Record<string, string>;
}

export function CompanySignupFields({
  companyName,
  onCompanyNameChange,
  website,
  onWebsiteChange,
  errors,
}: Props) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Company Name <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            className={inputClass}
            placeholder="Acme Inc."
          />
        </div>
        {errors.companyName && (
          <p className="text-destructive text-xs mt-1">{errors.companyName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Website{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => onWebsiteChange(e.target.value)}
          className={inputClassNoIcon}
          placeholder="https://example.com"
        />
      </div>
    </>
  );
}
