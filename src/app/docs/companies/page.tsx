import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Globe2,
  Briefcase,
  FileText,
  Users,
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
  title: "For companies",
  description:
    "Guide for hiring teams using Vetted — post jobs, receive guild-vetted shortlists, and hire with confidence backed by expert accountability.",
};

interface PageCard {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const PAGES: PageCard[] = [
  {
    href: "/docs/companies/quickstart",
    title: "Company quickstart",
    description:
      "Post your first job and receive a guild-vetted shortlist in about 48 hours.",
    icon: Zap,
  },
  {
    href: "/docs/companies/guild-vetting",
    title: "Guild-backed vetting",
    description:
      "What actually happens between your job post and the shortlist you receive.",
    icon: ShieldCheck,
  },
  {
    href: "/docs/companies/why-web3",
    title: "Why Web3 for hiring",
    description:
      "The trust argument for using an on-chain vetting protocol instead of a traditional ATS.",
    icon: Globe2,
  },
];

export default function CompaniesOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1104px] px-4 pt-14 pb-14 sm:px-6 md:px-8">
      <DocsBreadcrumb
        items={[
          { label: "Docs", href: "/docs" },
          { label: "For companies" },
        ]}
      />
      <DocsPageHeader
        eyebrow="For companies"
        title="The hiring team guide"
        description="Vetted replaces resume screening with expert-backed evaluation. This section explains how to get value from it as a company, without needing to become a Web3 expert."
        lastUpdated="April 2026"
      />

      <DocsTldr
        points={[
          <>Email + password signup. <strong>No wallet, no crypto</strong> — the entire company side is a standard web app.</>,
          <>Post a job → guild reviews applications blind → you receive a ranked shortlist in ~48 hours.</>,
          <>Guild selection is the most important step and is <strong>locked at post time</strong>.</>,
          <>You never see "gas" or "transaction" anywhere in the normal hiring flow.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="The hiring company's view of the lifecycle — what you do vs what the guild does."
        steps={[
          { tag: "Step 1", label: "Post job", description: "Pick guild", icon: Briefcase },
          { tag: "Step 2", label: "Guild reviews", description: "Blind scoring", icon: ShieldCheck },
          { tag: "Step 3", label: "Shortlist", description: "Ranked by consensus", icon: Users, accent: "primary" },
          { tag: "Step 4", label: "Interview", description: "Your process", icon: MessageSquare },
          { tag: "Step 5", label: "Hire", description: "Mark outcome", icon: UserCheck },
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
            title: "Post a job",
            description: "Create a company account and publish your first hire.",
            href: "/auth/login?type=company",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Why Web3 for hiring",
            description: "The buy-in argument for skeptical hiring leaders.",
            href: "/docs/companies/why-web3",
            icon: Globe2,
          },
          {
            title: "Guild-backed vetting",
            description: "What actually happens between post and shortlist.",
            href: "/docs/companies/guild-vetting",
            icon: ShieldCheck,
          },
          {
            title: "Quickstart",
            description: "30-minute walkthrough from signup to published job.",
            href: "/docs/companies/quickstart",
            icon: Zap,
          },
        ]}
      />
    </div>
  );
}
