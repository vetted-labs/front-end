"use client";

import { Plus, X, AlertTriangle } from "lucide-react";
import { SOCIAL_PLATFORMS } from "@/config/constants";
import { getPlatformIcon, getPlatformPlaceholder } from "@/lib/social-links";
import type { SocialLink } from "@/types";

interface SocialLinksEditorProps {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  requiredPlatforms?: string[];
  minLinks?: number;
  error?: string;
}

export default function SocialLinksEditor({
  links,
  onChange,
  requiredPlatforms = [],
  minLinks = 0,
  error,
}: SocialLinksEditorProps) {
  const updateLink = (index: number, updated: Partial<SocialLink>) => {
    const next = links.map((link, i) => (i === index ? { ...link, ...updated } : link));
    onChange(next);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const addLink = () => {
    // Pick the first platform not already used, or default to "other"
    const usedPlatforms = new Set(links.map((l) => l.platform));
    const available = SOCIAL_PLATFORMS.find((p) => !usedPlatforms.has(p.value));
    onChange([
      ...links,
      {
        platform: available?.value ?? "other",
        label: available?.label ?? "Other",
        url: "",
      },
    ]);
  };

  const handlePlatformChange = (index: number, platform: string) => {
    const entry = SOCIAL_PLATFORMS.find((p) => p.value === platform);
    updateLink(index, {
      platform,
      label: platform === "other" ? links[index].label : (entry?.label ?? platform),
    });
  };

  // Compute missing required platforms
  const filledPlatforms = new Set(
    links.filter((l) => l.url.trim()).map((l) => l.platform)
  );
  const missingRequired = requiredPlatforms.filter(
    (p) => !filledPlatforms.has(p)
  );

  return (
    <div className="space-y-3">
      {/* Missing required platforms warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Required social links missing
            </p>
            <p className="text-amber-600 dark:text-amber-400/80">
              {missingRequired
                .map(
                  (p) =>
                    SOCIAL_PLATFORMS.find((sp) => sp.value === p)?.label ?? p
                )
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {links.map((link, index) => {
        const Icon = getPlatformIcon(link.platform);
        const isRequired = requiredPlatforms.includes(link.platform);

        return (
          <div key={index} className="flex items-start gap-2">
            <div className="w-[160px] shrink-0">
              <div className="relative">
                <select
                  value={link.platform}
                  onChange={(e) => handlePlatformChange(index, e.target.value)}
                  className="flex h-10 w-full appearance-none rounded-lg border-2 border-input bg-background px-3 py-2 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {link.platform === "other" && (
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(index, { label: e.target.value })}
                placeholder="Label"
                className="w-[120px] shrink-0 h-10 px-3 text-sm rounded-lg border-2 border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}

            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Icon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                placeholder={getPlatformPlaceholder(link.platform)}
                className={`w-full h-10 pl-9 pr-3 text-sm rounded-lg border-2 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isRequired && !link.url.trim()
                    ? "border-amber-500/50"
                    : "border-input"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => removeLink(index)}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addLink}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Link
      </button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {minLinks > 0 && links.filter((l) => l.url.trim()).length === 0 && !error && (
        <p className="text-muted-foreground text-sm">
          At least {minLinks} social link{minLinks > 1 ? "s" : ""} required
        </p>
      )}
    </div>
  );
}
