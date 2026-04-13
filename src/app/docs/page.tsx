import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  BookText,
  Zap,
  ShieldCheck,
  Coins,
  Vote,
  FileText,
  Users,
  Building2,
  Briefcase,
  Eye,
  UserCheck,
} from "lucide-react";
import { DocsPersonaCard } from "@/components/docs/DocsPersonaCard";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DOCS_PERSONAS } from "@/components/docs/docs-nav";

export const metadata: Metadata = {
  title: "Vetted Documentation",
  description:
    "Learn how Vetted works — guild-backed candidate vetting, commit-reveal voting, on-chain reputation, and everything you need to ship your first application, job post, or endorsement.",
};

export default function DocsLandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1104px] px-4 pt-14 pb-14 sm:px-6 md:px-8">
      {/* Hero */}
      <section className="mb-14">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">
          Welcome
        </p>
        <h1 className="text-[2.5rem] font-bold tracking-tight text-foreground md:text-[3rem] md:leading-[1.1]">
          Vetted Documentation
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Everything you need to understand Vetted — how guilds vet candidates,
          how reputation is staked on-chain, and how to get value out of the
          platform as an expert, candidate, or hiring team.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/docs/what-is-vetted"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Start with the basics
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/browse/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Browse jobs
          </Link>
          <Link
            href="/auth/signup?type=company"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Post a job
          </Link>
        </div>

        {/* The one-screen "how it works" visual */}
        <DocsFlowDiagram
          className="mt-10"
          caption="The lifecycle from job post to hire. Every candidate's application passes through a blind expert review before the company sees a shortlist."
          steps={[
            { tag: "Step 1", label: "Post job", description: "Company + guild", icon: Briefcase },
            { tag: "Step 2", label: "Apply", description: "Candidates submit", icon: FileText },
            { tag: "Step 3", label: "Review blind", description: "Guild commits", icon: ShieldCheck, accent: "primary" },
            { tag: "Step 4", label: "Reveal", description: "IQR consensus", icon: Eye },
            { tag: "Step 5", label: "Hire", description: "Ranked shortlist", icon: UserCheck },
          ]}
        />
      </section>

      {/* Persona cards */}
      <section className="mb-16">
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Pick your path
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <DocsPersonaCard
            {...DOCS_PERSONAS.experts}
            badge="Most detailed"
          />
          <DocsPersonaCard {...DOCS_PERSONAS.candidates} />
          <DocsPersonaCard {...DOCS_PERSONAS.companies} />
        </div>
      </section>

      {/* Popular topics */}
      <section className="mb-16">
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Popular topics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {POPULAR_TOPICS.map((t) => (
            <TopicLink key={t.href} {...t} />
          ))}
        </div>
      </section>

      {/* Three pillars explainer */}
      <section className="mb-16 rounded-xl border border-border bg-muted/30 p-6 md:p-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          New to Vetted? Here's the one-minute version
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Vetted replaces opaque resume screens with expert-backed evaluation.
          Three moving parts do the work:
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <MiniExplainer
            icon={ShieldCheck}
            title="Guilds"
            body="Domain experts form guilds (Engineering, Design, Marketing, etc.) and collectively evaluate candidates applying for roles in their field."
          />
          <MiniExplainer
            icon={Vote}
            title="Commit-reveal voting"
            body="Reviews are submitted blind so experts can't anchor on each other. Scores are revealed together and consensus is calculated statistically."
          />
          <MiniExplainer
            icon={Coins}
            title="Staked reputation"
            body="Experts stake VETD tokens and reputation on their reviews. Aligned votes earn rewards; outlier votes can be slashed."
          />
        </div>
      </section>

      {/* Funnel — one product deep-link per persona */}
      <DocsNextSteps
        title="Or skip the docs and start now"
        layout="compact"
        steps={[
          {
            title: "Apply to a guild",
            description: "Start your expert application and pick a domain guild.",
            href: "/auth/login?type=expert",
            icon: ShieldCheck,
            kind: "app",
          },
          {
            title: "Browse open jobs",
            description: "Filter by guild, location, role. Apply when you find a fit.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Post a job",
            description: "Create a company account and publish your first hire.",
            href: "/auth/login?type=company",
            icon: Building2,
            kind: "app",
          },
          {
            title: "Glossary",
            description: "Every Vetted-specific term in one place.",
            href: "/docs/glossary",
            icon: BookText,
          },
        ]}
      />
    </div>
  );
}

const POPULAR_TOPICS = [
  {
    icon: Zap,
    title: "Quickstart",
    body: "Get set up and make your first contribution in 10 minutes.",
    href: "/docs/quickstart",
  },
  {
    icon: Vote,
    title: "Commit-reveal voting",
    body: "Why blind voting exists and how to submit your first review.",
    href: "/docs/experts/commit-reveal-voting",
  },
  {
    icon: ShieldCheck,
    title: "Reputation & ranks",
    body: "How reputation is earned, lost, and mapped to guild ranks.",
    href: "/docs/experts/reputation-and-ranks",
  },
  {
    icon: Coins,
    title: "Earnings & withdrawals",
    body: "Reward math, stake cooldowns, and how to claim VETD.",
    href: "/docs/experts/earnings-and-withdrawals",
  },
  {
    icon: Compass,
    title: "How Vetted works",
    body: "The three-lane system: candidates, guilds, companies.",
    href: "/docs/how-it-works",
  },
  {
    icon: BookText,
    title: "Glossary",
    body: "Every Vetted-specific term in one place.",
    href: "/docs/glossary",
  },
] as const;

function TopicLink({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-foreground group-hover:text-primary">
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </Link>
  );
}

function MiniExplainer({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
