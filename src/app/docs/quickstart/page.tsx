import type { Metadata } from "next";
import { Briefcase, ShieldCheck, Building2, BookText } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsPersonaCard } from "@/components/docs/DocsPersonaCard";
import { DOCS_PERSONAS } from "@/components/docs/docs-nav";

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "Pick the quickstart that matches what you're trying to do — vet candidates, land a job, or hire.",
};

export default function QuickstartHubPage() {
  return (
    <DocsPage
      href="/docs/quickstart"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Getting started", href: "/docs" },
        { label: "Quickstart" },
      ]}
      eyebrow="Getting started"
      title="Quickstart"
      description="Pick the quickstart that matches what you're actually trying to do. Each takes about 10 minutes."
      lastUpdated="April 2026"
      raw
    >
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        <DocsPersonaCard
          {...DOCS_PERSONAS.experts}
          href="/docs/experts/quickstart"
          badge="Most detailed"
        />
        <DocsPersonaCard
          {...DOCS_PERSONAS.candidates}
          href="/docs/candidates/quickstart"
        />
        <DocsPersonaCard
          {...DOCS_PERSONAS.companies}
          href="/docs/companies/quickstart"
        />
      </div>

<DocsNextSteps
        title="Or skip the docs and start now"
        layout="compact"
        steps={[
          {
            title: "Apply to a guild",
            description: "Start your expert application directly.",
            href: "/auth/login?type=expert",
            icon: ShieldCheck,
            kind: "app",
          },
          {
            title: "Browse jobs",
            description: "Jump into the candidate-facing job browse.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Post a job",
            description: "Create a company account and publish.",
            href: "/auth/signup?type=company",
            icon: Building2,
            kind: "app",
          },
          {
            title: "What is Vetted?",
            description: "Conceptual overview if you want context first.",
            href: "/docs/what-is-vetted",
            icon: BookText,
          },
        ]}
      />
    </DocsPage>
  );
}
