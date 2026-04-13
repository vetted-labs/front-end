import type { Metadata } from "next";
import { Briefcase, FileText, Eye, UserCheck, ShieldCheck, Users, Building2, Compass } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "What is Vetted?",
  description:
    "Vetted is a decentralized hiring platform where domain-expert guilds vet candidates through commit-reveal voting, with reputation staked on-chain.",
};

const TOC = [
  { id: "the-problem", title: "The problem", level: 2 as const },
  { id: "the-vetted-model", title: "The Vetted model", level: 2 as const },
  { id: "three-actors", title: "Three actors, one loop", level: 2 as const },
  { id: "why-onchain", title: "Why on-chain?", level: 2 as const },
  { id: "what-its-not", title: "What Vetted is not", level: 2 as const },
];

export default function WhatIsVettedPage() {
  return (
    <DocsPage
      href="/docs/what-is-vetted"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Getting started", href: "/docs" },
        { label: "What is Vetted?" },
      ]}
      eyebrow="Getting started"
      title="What is Vetted?"
      description="Vetted is a decentralized hiring platform where domain-expert guilds vet candidates through commit-reveal voting, with reputation staked on-chain."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Expert <DocsGlossaryLink term="guild">guilds</DocsGlossaryLink> (not resume parsers) review candidate applications and produce a ranked shortlist for hiring companies.</>,
          <>Reviews use <DocsGlossaryLink term="commit-reveal"><strong>commit-reveal voting</strong></DocsGlossaryLink> — scores are hidden until everyone has committed, preventing anchoring and herding.</>,
          <>Expert <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink> is staked on-chain. Aligned reviews earn reputation and rewards; persistent outliers lose both.</>,
          <>Three actors: candidates, experts, companies. You never need to touch a wallet as a candidate or company.</>,
        ]}
      />

      <p>
        Hiring is broken in two directions at once. Companies can't tell whether a
        candidate is actually good until they've already spent weeks on interviews.
        Candidates can't get in the door without pattern-matched resumes and
        prestige signals. Everyone agrees the system wastes time — nobody agrees on
        who should fix it.
      </p>

      <h2 id="the-problem">The problem</h2>
      <p>
        The deepest signal about a candidate's ability comes from people who
        already do the work. A staff engineer knows whether another engineer is
        faking it in twenty minutes. A principal designer can read a portfolio in
        a way a generalist recruiter cannot. The problem is that this signal is
        trapped: it lives in private Slack DMs, in personal referral networks, in
        closed-door interview loops.
      </p>
      <p>
        Vetted's bet is that if you give experts the tools and the incentives to
        evaluate candidates publicly and accountably, you get better hiring
        outcomes than any resume screen, any AI matcher, or any generic jobs board
        can produce.
      </p>

      <h2 id="the-vetted-model">The Vetted model</h2>
      <p>
        The platform is built around three ideas that reinforce each other:
      </p>
      <ol>
        <li>
          <strong>Guilds</strong> group domain experts — engineers, designers,
          data scientists, security researchers — who collectively review
          candidates applying to jobs in their field.
        </li>
        <li>
          <strong>Commit-reveal voting</strong> means every reviewer submits their
          score blind, before seeing anyone else's. This prevents anchoring and
          herding, which are the two biggest failure modes of group evaluation.
        </li>
        <li>
          <strong>Staked reputation</strong> means reviewers have skin in the
          game. Experts earn reputation and token rewards when their votes align
          with consensus, and lose both when they're persistent outliers.
        </li>
      </ol>

      <DocsCallout kind="note" title="Why this combination">
        Blind voting by itself would still let bad reviewers drift unchecked.
        Staked reputation by itself would reward consensus-chasing. Combining the
        two means experts have to call it honestly <em>and</em> call it well.
      </DocsCallout>

      <h2 id="three-actors">Three actors, one loop</h2>
      <p>
        There are three kinds of users on Vetted, and each one's actions feed the
        others:
      </p>
      <ul>
        <li>
          <strong>Candidates</strong> create profiles and apply to jobs. Their
          applications flow into the relevant guild for review.
        </li>
        <li>
          <strong>Experts</strong> are guild members who review the applications.
          They score candidates against a rubric, submit blind votes, and
          eventually reveal them for consensus.
        </li>
        <li>
          <strong>Companies</strong> post jobs, receive guild-vetted shortlists,
          and hire from candidates who have been publicly and accountably
          reviewed by people who actually do the work.
        </li>
      </ul>

      <h2 id="why-onchain">Why on-chain?</h2>
      <p>
        "Web3 hiring" sounds like a contradiction in terms unless you know what
        the blockchain is actually doing. It's not there for the branding. It's
        there because three specific things are hard to do any other way:
      </p>
      <ul>
        <li>
          <strong>Commitment-before-reveal</strong> requires cryptographic
          guarantees that a score can't be changed after the fact. A hash
          committed on-chain is tamper-evident by default.
        </li>
        <li>
          <strong>Staked accountability</strong> requires custody of real value
          that can be forfeited if a reviewer acts in bad faith. A smart contract
          enforces this without anyone having to trust Vetted the company.
        </li>
        <li>
          <strong>Portable reputation</strong> means the credential an expert
          earns on Vetted belongs to them, not to a platform they can be locked
          out of. Reputation tied to a wallet is portable by default.
        </li>
      </ul>

      <DocsCallout kind="tip" title="You don't need to care about crypto">
        If you're a hiring manager or a candidate, you sign in with email and
        password — no wallet, no gas fees, no transaction hashes. The platform
        looks like a normal web app. If you're an expert, you'll connect a
        wallet and interact with the chain — but the UI walks you through it.
      </DocsCallout>

      <h2 id="what-its-not">What Vetted is not</h2>
      <ul>
        <li>
          <strong>Not a resume parser.</strong> Applications are scored by humans
          against a rubric, not grepped for keywords.
        </li>
        <li>
          <strong>Not a referral network.</strong> Experts who review candidates
          are accountable to the rest of their guild, not acting as private
          gatekeepers.
        </li>
        <li>
          <strong>Not a DAO.</strong> Guild governance exists, but there's no
          "decentralize everything" dogma. The platform is a product first.
        </li>
        <li>
          <strong>Not pseudonymous-only.</strong> Candidates and companies
          present real identities. Experts can choose to remain pseudonymous,
          but their track record is public.
        </li>
      </ul>

      <DocsKeyTakeaways
        points={[
          <>Vetted is <strong>not</strong> a resume parser, referral network, DAO, or pseudonymous-only platform.</>,
          <>The core claim: expert-backed, accountable review produces better hiring signal than keyword matching or AI screens.</>,
          <>Blockchain usage is narrow and purposeful — only tamper-evidence, staked accountability, and portable reputation need it.</>,
          <>If you're a candidate or company user, the on-chain parts are invisible to you.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "How it works",
            description: "The full lifecycle from job post to hire, broken down by actor.",
            href: "/docs/how-it-works",
            icon: Compass,
          },
          {
            title: "Browse live jobs",
            description: "See real job posts currently being vetted by guilds.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Become an expert",
            description: "Apply to a guild and start reviewing candidates.",
            href: "/auth/login?type=expert",
            icon: ShieldCheck,
            kind: "app",
          },
          {
            title: "Glossary",
            description: "Every term used in this page, defined in plain English.",
            href: "/docs/glossary",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
