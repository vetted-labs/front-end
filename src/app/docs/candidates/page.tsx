import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  UserCircle,
  Handshake,
  Briefcase,
  UserPlus,
  FileText,
  UserCheck,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsTopicLink } from "@/components/docs/DocsTopicLink";
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsPageHeader } from "@/components/docs/DocsPageHeader";

export const metadata: Metadata = {
  title: "For candidates",
  description:
    "Guide for candidates on Vetted — build your profile, get expert endorsements, and apply to jobs backed by on-chain reputation signals.",
};

interface PageCard {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const PAGES: PageCard[] = [
  {
    href: "/docs/candidates/quickstart",
    title: "Candidate quickstart",
    description: "From signup to first application in under 10 minutes.",
    icon: Zap,
  },
  {
    href: "/docs/candidates/profile",
    title: "Building your profile",
    description:
      "What fields matter most to guild reviewers and how to present your work.",
    icon: UserCircle,
  },
  {
    href: "/docs/candidates/endorsements",
    title: "Endorsements & reputation",
    description:
      "How expert endorsements change your chances — and why they're different from recommendations on other platforms.",
    icon: Handshake,
  },
];

export default function CandidatesOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1104px] px-4 pt-14 pb-14 sm:px-6 md:px-8">
      <DocsBreadcrumb
        items={[
          { label: "Docs", href: "/docs" },
          { label: "For candidates" },
        ]}
      />
      <DocsPageHeader
        eyebrow="For candidates"
        title="The candidate guide"
        description="Vetted is designed so companies see more than a resume — they see expert opinions. This section covers how to present yourself so those opinions land in your favor."
        lastUpdated="April 2026"
      />

      <DocsTldr
        points={[
          <>Email + password (or LinkedIn OAuth) signup. <strong>No wallet needed, ever</strong>.</>,
          <>Your profile + screening answers + (optional) expert endorsements drive the outcome, not your resume.</>,
          <>Applications flow through a <strong>5-stage pipeline</strong>: Applied → Expert review → Company review → Interview → Offer.</>,
          <>Expert review typically takes 2–5 days depending on the guild's cycle.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="What happens to your application after you hit submit."
        steps={[
          { tag: "Stage 1", label: "Applied", icon: FileText },
          { tag: "Stage 2", label: "Expert review", description: "Blind scoring", icon: UserCheck, accent: "primary" },
          { tag: "Stage 3", label: "Company review", description: "Shortlist", icon: Briefcase },
          { tag: "Stage 4", label: "Interview", icon: MessageSquare },
          { tag: "Stage 5", label: "Offer", icon: UserCheck },
        ]}
      />

      <section className="mt-12">
        <h2 className="mb-5 text-[18px] font-bold tracking-tight text-foreground">
          In this section
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAGES.map((page) => (
            <DocsTopicLink
              key={page.href}
              icon={page.icon}
              title={page.title}
              description={page.description}
              href={page.href}
            />
          ))}
        </div>
      </section>

      <DocsNextSteps
        steps={[
          {
            title: "Sign up",
            description: "Create a candidate account with email or LinkedIn.",
            href: "/auth/login?type=candidate",
            icon: UserPlus,
            kind: "app",
          },
          {
            title: "Browse jobs",
            description: "See what's available right now — sorted by match score if signed in.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "What is Vetted?",
            description: "The one-minute conceptual overview.",
            href: "/docs/what-is-vetted",
            icon: FileText,
          },
          {
            title: "How it works",
            description: "Full lifecycle walkthrough across all three personas.",
            href: "/docs/how-it-works",
            icon: UserCheck,
          },
        ]}
      />
    </div>
  );
}
