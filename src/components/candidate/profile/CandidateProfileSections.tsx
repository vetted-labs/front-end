"use client";

import { X, Plus } from "lucide-react";
import { Input, Textarea, NativeSelect } from "@/components/ui";
import type { CandidateProfile, WorkHistoryEntry } from "@/types";

const EXPERIENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8+ years)" },
  { value: "executive", label: "Executive" },
];

const EXPERIENCE_LABELS: Record<string, string> = EXPERIENCE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  },
  {} as Record<string, string>
);

// ---------------------------------------------------------------------------
// Field — read-only label/value primitive matching JobDetailPage
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
        {label}
      </p>
      {typeof value === "string" ? (
        <p className="text-sm text-foreground">{value}</p>
      ) : (
        <div className="text-sm text-foreground">{value}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Basics
// ---------------------------------------------------------------------------

interface BasicsViewProps {
  profile: CandidateProfile;
}

export function BasicsView({ profile }: BasicsViewProps) {
  const hasAny =
    profile.fullName ||
    profile.headline ||
    profile.email ||
    profile.phone ||
    profile.experienceLevel;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" value={profile.fullName || "—"} />
        <Field label="Headline" value={profile.headline || "—"} />
        <Field label="Email" value={profile.email || "—"} />
        <Field label="Phone" value={profile.phone || "—"} />
        <Field
          label="Experience"
          value={
            (profile.experienceLevel &&
              EXPERIENCE_LABELS[profile.experienceLevel]) ||
            profile.experienceLevel ||
            "—"
          }
        />
      </div>
      {!hasAny && (
        <p className="text-xs text-muted-foreground">
          Nothing here yet. Hit Edit profile to fill in the basics.
        </p>
      )}
    </div>
  );
}

interface BasicsEditProps {
  profile: CandidateProfile;
  onChange: (updated: CandidateProfile) => void;
}

export function BasicsEdit({ profile, onChange }: BasicsEditProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full name"
          value={profile.fullName ?? ""}
          onChange={(e) => onChange({ ...profile, fullName: e.target.value })}
          placeholder="Jane Doe"
          required
        />
        <Input
          label="Headline"
          value={profile.headline ?? ""}
          onChange={(e) => onChange({ ...profile, headline: e.target.value })}
          placeholder="Senior Solidity engineer"
        />
        <Input
          label="Email"
          type="email"
          value={profile.email ?? ""}
          onChange={(e) => onChange({ ...profile, email: e.target.value })}
          placeholder="you@example.com"
        />
        <Input
          label="Phone"
          type="tel"
          value={profile.phone ?? ""}
          onChange={(e) => onChange({ ...profile, phone: e.target.value })}
          placeholder="+1 555 123 4567"
        />
        <NativeSelect
          label="Experience level"
          value={profile.experienceLevel ?? ""}
          onChange={(e) =>
            onChange({ ...profile, experienceLevel: e.target.value })
          }
        >
          <option value="">Select experience level</option>
          {EXPERIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

interface AboutViewProps {
  profile: CandidateProfile;
}

export function AboutView({ profile }: AboutViewProps) {
  if (!profile.bio) {
    return (
      <p className="text-sm text-muted-foreground">
        No bio yet. A short intro helps companies understand what you&apos;re
        about.
      </p>
    );
  }
  return (
    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
      {profile.bio}
    </p>
  );
}

interface AboutEditProps {
  profile: CandidateProfile;
  onChange: (updated: CandidateProfile) => void;
}

export function AboutEdit({ profile, onChange }: AboutEditProps) {
  return (
    <Textarea
      label="Bio"
      value={profile.bio ?? ""}
      onChange={(e) => onChange({ ...profile, bio: e.target.value })}
      placeholder="A few sentences about your work, your interests, and what you're looking for next."
      rows={5}
    />
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

interface SkillsViewProps {
  profile: CandidateProfile;
}

export function SkillsView({ profile }: SkillsViewProps) {
  const skills = profile.skills || [];
  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground">No skills added yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

interface SkillsEditProps {
  profile: CandidateProfile;
  onChange: (updated: CandidateProfile) => void;
}

export function SkillsEdit({ profile, onChange }: SkillsEditProps) {
  const skills = profile.skills || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {skills.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add a few skills below — press Enter to confirm each one.
          </p>
        )}
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm text-foreground border border-border"
          >
            {skill}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...profile,
                  skills: skills.filter((s) => s !== skill),
                })
              }
              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${skill}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Add a skill and press Enter…"
        className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground w-full sm:w-72"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.currentTarget.value.trim()) {
            e.preventDefault();
            const newSkill = e.currentTarget.value.trim();
            if (!skills.includes(newSkill)) {
              onChange({ ...profile, skills: [...skills, newSkill] });
            }
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work history
// ---------------------------------------------------------------------------

interface WorkHistoryViewProps {
  entries: WorkHistoryEntry[];
}

export function WorkHistoryView({ entries }: WorkHistoryViewProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No work history added yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {entries.map((entry, i) => (
        <li
          key={i}
          className="rounded-lg border border-border bg-muted/20 p-3.5"
        >
          <p className="text-sm font-semibold text-foreground">
            {entry.role || "Untitled role"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[entry.company, `${entry.startDate || "?"} – ${entry.endDate || "Present"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {entry.description && (
            <p className="text-xs text-foreground/80 mt-2 leading-relaxed whitespace-pre-wrap">
              {entry.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

interface WorkHistoryEditProps {
  entries: WorkHistoryEntry[];
  onUpdate: (index: number, field: keyof WorkHistoryEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function WorkHistoryEdit({
  entries,
  onUpdate,
  onAdd,
  onRemove,
}: WorkHistoryEditProps) {
  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add roles you&apos;d like to surface to companies.
        </p>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Company"
              value={entry.company}
              onChange={(e) => onUpdate(i, "company", e.target.value)}
              placeholder="Acme Inc."
            />
            <Input
              label="Role / title"
              value={entry.role}
              onChange={(e) => onUpdate(i, "role", e.target.value)}
              placeholder="Senior engineer"
            />
            <Input
              label="Start"
              type="month"
              value={entry.startDate}
              onChange={(e) => onUpdate(i, "startDate", e.target.value)}
            />
            <Input
              label="End"
              type="month"
              value={entry.endDate || ""}
              onChange={(e) => onUpdate(i, "endDate", e.target.value)}
              placeholder="Leave empty for current"
            />
          </div>
          <Textarea
            label="Description"
            value={entry.description ?? ""}
            onChange={(e) => onUpdate(i, "description", e.target.value)}
            placeholder="What did you ship? What was the impact?"
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <X className="w-3 h-3" /> Remove role
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add a role
      </button>
    </div>
  );
}
