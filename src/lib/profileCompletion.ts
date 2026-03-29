import type { CandidateProfile } from "@/types";

export interface CompletionItem {
  label: string;
  done: boolean;
  field: string;
}

export function getProfileCompletion(profile: CandidateProfile): {
  percentage: number;
  items: CompletionItem[];
} {
  const hasSocialLink =
    (profile.socialLinks && profile.socialLinks.some((l) => l.url.trim())) ||
    !!profile.linkedIn ||
    !!profile.github;

  const items: CompletionItem[] = [
    { label: "Full name added", done: !!profile.fullName, field: "fullName" },
    { label: "Headline set", done: !!profile.headline, field: "headline" },
    { label: "Bio written", done: !!profile.bio, field: "bio" },
    { label: "Resume uploaded", done: !!profile.resumeUrl, field: "resume" },
    { label: "Social link added", done: hasSocialLink, field: "socialLinks" },
  ];

  const done = items.filter((i) => i.done).length;
  const percentage = Math.round((done / items.length) * 100);
  return { percentage, items };
}
