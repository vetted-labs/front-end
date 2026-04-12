import type { Metadata } from "next";
import {
  Shield,
  Zap,
  Vote,
  TrendingUp,
  Handshake,
  ShieldAlert,
  Coins,
  Landmark,
  HelpCircle,
  UserPlus,
  Eye,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsPageHeader } from "@/components/docs/DocsPageHeader";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsTopicLink } from "@/components/docs/DocsTopicLink";

export const metadata: Metadata = {
  title: "For experts",
  description:
    "Complete guide for Vetted experts — apply to a guild, review candidates, vote under commit-reveal, earn reputation, and participate in governance.",
};

interface ExpertPage {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  section: "Start here" | "Core workflows" | "Economics" | "Advanced";
}

const PAGES: ExpertPage[] = [
  {
    href: "/docs/experts/quickstart",
    title: "Expert quickstart",
    description:
      "Connect your wallet, pick a guild, and cast your first vote in about 10 minutes.",
    icon: Zap,
    section: "Start here",
  },
  {
    href: "/docs/experts/applying-to-a-guild",
    title: "Applying to a guild",
    description:
      "Walk through the four-step guild application, including the no-AI declaration and wallet verification.",
    icon: Shield,
    section: "Start here",
  },
  {
    href: "/docs/experts/reviewing-candidates",
    title: "Reviewing candidates",
    description:
      "How to read an application, work the rubric, and write comments that actually help other experts.",
    icon: Vote,
    section: "Core workflows",
  },
  {
    href: "/docs/experts/commit-reveal-voting",
    title: "Commit-reveal voting",
    description:
      "The novel two-phase voting flow. Includes an interactive demo so you can see the full loop before going live.",
    icon: Vote,
    section: "Core workflows",
  },
  {
    href: "/docs/experts/reputation-and-ranks",
    title: "Reputation & ranks",
    description:
      "How reputation is earned, lost, and mapped to the five guild rank tiers and their reward multipliers.",
    icon: TrendingUp,
    section: "Core workflows",
  },
  {
    href: "/docs/experts/endorsements",
    title: "Endorsements",
    description:
      "Stake VETD on candidates you believe in. Higher-risk, higher-reward than passive voting.",
    icon: Handshake,
    section: "Economics",
  },
  {
    href: "/docs/experts/slashing-and-accountability",
    title: "Slashing & accountability",
    description:
      "The IQR-based math behind slashing, the four tiers, and how to appeal a slashing decision.",
    icon: ShieldAlert,
    section: "Economics",
  },
  {
    href: "/docs/experts/earnings-and-withdrawals",
    title: "Earnings & withdrawals",
    description:
      "The three reward streams, how to claim them, and the seven-day unstake cooldown.",
    icon: Coins,
    section: "Economics",
  },
  {
    href: "/docs/experts/governance",
    title: "Governance & proposals",
    description:
      "Shape the protocol. Create proposals, vote on parameter changes, and read past decisions.",
    icon: Landmark,
    section: "Advanced",
  },
  {
    href: "/docs/experts/faq",
    title: "Expert FAQ",
    description:
      "Questions that come up for expert users — covering wallets, missed deadlines, appeals, and taxes.",
    icon: HelpCircle,
    section: "Advanced",
  },
];

const SECTIONS = ["Start here", "Core workflows", "Economics", "Advanced"] as const;

export default function ExpertsOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1104px] px-4 pt-14 pb-14 md:px-8">
      <DocsBreadcrumb
        items={[
          { label: "Docs", href: "/docs" },
          { label: "For experts" },
        ]}
      />
      <DocsPageHeader
        eyebrow="For experts"
        title="The expert handbook"
        description="Everything you need to join a guild, review candidates well, and understand the reputation and reward economics behind the platform."
        lastUpdated="April 2026"
      />

      <DocsTldr
        points={[
          <>10-page handbook. Start with the <strong>quickstart</strong>, then read <strong>commit-reveal voting</strong> (the novel concept).</>,
          <>The <strong>Economics</strong> section is where most of the operational questions come from — reputation, slashing, earnings.</>,
          <>Every expert page has a direct link back into the product so you can act on what you learn.</>,
          <>Expected reading time end-to-end: ~45 minutes. Quickstart alone: ~5 minutes.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="The expert loop. Each phase is a separate page in this handbook — follow the flow top to bottom."
        steps={[
          { tag: "Phase 1", label: "Apply", description: "Join a guild", icon: UserPlus },
          { tag: "Phase 2", label: "Review", description: "Read & score", icon: Vote },
          { tag: "Phase 3", label: "Commit", description: "Blind hash", icon: Shield, accent: "primary" },
          { tag: "Phase 4", label: "Reveal", description: "IQR consensus", icon: Eye },
          { tag: "Phase 5", label: "Earn", description: "Rep + VETD", icon: CheckCircle2 },
        ]}
      />

      {/* Topic grid, grouped by section */}
      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => {
          const pages = PAGES.filter((p) => p.section === section);
          return (
            <section key={section}>
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                {section}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pages.map((page) => (
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
          );
        })}
      </div>

      <DocsNextSteps
        steps={[
          {
            title: "Start the quickstart",
            description: "10-minute walkthrough from wallet connect to first vote.",
            href: "/docs/experts/quickstart",
            icon: Zap,
          },
          {
            title: "Apply to a guild",
            description: "Jump into the app and begin the 4-step application.",
            href: "/auth/login?type=expert",
            icon: Shield,
            kind: "app",
          },
          {
            title: "Commit-reveal demo",
            description: "Play with the interactive voting demo before going live.",
            href: "/docs/experts/commit-reveal-voting",
            icon: Vote,
          },
          {
            title: "What is Vetted?",
            description: "60-second platform overview if you're brand new.",
            href: "/docs/what-is-vetted",
            icon: HelpCircle,
          },
        ]}
      />
    </div>
  );
}
