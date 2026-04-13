import type { Metadata } from "next";
import { FileText, Eye, ScrollText, UserCheck, Users, Building2, Shield } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsSwimlane } from "@/components/docs/DocsSwimlane";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Walk through the full Vetted lifecycle: a candidate applies, a guild reviews them blind, consensus is calculated, and a company hires — with reputation moving at every step.",
};

const TOC = [
  { id: "the-three-lanes", title: "The three lanes", level: 2 as const },
  { id: "end-to-end", title: "End-to-end lifecycle", level: 2 as const },
  { id: "candidate-lane", title: "The candidate lane", level: 3 as const },
  { id: "expert-lane", title: "The expert lane", level: 3 as const },
  { id: "company-lane", title: "The company lane", level: 3 as const },
  { id: "what-moves-onchain", title: "What moves on-chain", level: 2 as const },
];

export default function HowItWorksPage() {
  return (
    <DocsPage
      href="/docs/how-it-works"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Getting started", href: "/docs" },
        { label: "How it works" },
      ]}
      eyebrow="Getting started"
      title="How Vetted works"
      description="A walkthrough of the full lifecycle — candidate applies, guild reviews, consensus is calculated, company hires — and what happens at each hand-off."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Three actor types — <strong>candidates, experts, companies</strong> — move through the platform in parallel lanes that meet at specific hand-offs.</>,
          <>A candidate application flows into the relevant <DocsGlossaryLink term="guild">guild</DocsGlossaryLink>'s review queue, gets scored blind by experts via <DocsGlossaryLink term="commit-reveal">commit-reveal voting</DocsGlossaryLink>, and emerges as a ranked shortlist for the company.</>,
          <>Only four things actually live on-chain: vote hashes, revealed scores, <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink> deltas, and staked <DocsGlossaryLink term="vetd">VETD</DocsGlossaryLink>. Everything else runs on a normal backend.</>,
          <>Total lifecycle is typically <strong>48 hours to 5 days</strong> from application to shortlist, depending on the guild's <DocsGlossaryLink term="cycle">cycle</DocsGlossaryLink> length.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="The end-to-end lifecycle. Reputation and rewards move at the hand-off between reveal and finalization."
        steps={[
          { tag: "Stage 1", label: "Apply", description: "Candidate submits", icon: FileText },
          { tag: "Stage 2", label: "Commit", description: "Experts vote blind", icon: Shield },
          { tag: "Stage 3", label: "Reveal", description: "Scores published", icon: Eye, accent: "primary" },
          { tag: "Stage 4", label: "Shortlist", description: "Company reviews", icon: ScrollText },
          { tag: "Stage 5", label: "Hire", description: "Outcome finalized", icon: UserCheck },
        ]}
      />

      <h2 id="the-three-lanes">The three lanes</h2>
      <p>
        The easiest way to understand Vetted is to follow each user type through
        their own lane. The lanes run in parallel, intersect at specific
        hand-offs, and eventually converge on a hire.
      </p>

      <DocsSwimlane />
      <ul>
        <li>
          <strong>Candidates</strong> build a profile, apply to jobs, and wait
          for guild review.
        </li>
        <li>
          <strong>Experts</strong> pick up applications in their guild queue,
          score them against a rubric, and vote.
        </li>
        <li>
          <strong>Companies</strong> post jobs and receive a ranked shortlist
          once review completes.
        </li>
      </ul>

      <h2 id="end-to-end">End-to-end lifecycle</h2>

      <h3 id="candidate-lane">The candidate lane</h3>
      <p>
        A candidate signs up with email and password (or LinkedIn), and fills
        out a profile. They browse job listings by guild and submit an
        application. Each application
        routes to the guild tied to the job — a backend role goes to the
        Engineering guild, a design role goes to Design, and so on.
      </p>
      <DocsCallout kind="tip" title="The candidate never sees the votes">
        Candidates don't see individual expert scores or comments. They see
        application status (pending, under review, accepted, rejected) and an
        aggregate decision. This protects both the candidate from noise and the
        expert from retaliation.
      </DocsCallout>

      <h3 id="expert-lane">The expert lane</h3>
      <p>
        Experts in the receiving guild see new applications appear in their
        vetting queue. From there, the review process runs in three phases:
      </p>
      <DocsStepList
        steps={[
          {
            title: "Commit phase",
            description: (
              <>
                <p>
                  The expert reads the application, scores each rubric criterion,
                  writes optional comments, and submits. Their score is hashed
                  along with a <DocsGlossaryLink term="nonce">nonce</DocsGlossaryLink> and stored on-chain. No other expert can see
                  it yet.
                </p>
              </>
            ),
          },
          {
            title: "Reveal phase",
            description: (
              <>
                <p>
                  Once the commit window closes, experts reveal their actual
                  scores. The backend checks that each revealed score matches
                  the committed hash — which guarantees nobody changed their
                  mind after seeing the others.
                </p>
              </>
            ),
          },
          {
            title: "Finalization",
            description: (
              <>
                <p>
                  Consensus is calculated using interquartile-range filtering
                  (scores outside the median ± 0.75×IQR band are excluded,
                  average of the rest becomes the consensus score). Each
                  expert's deviation from consensus is classified as Aligned
                  or Misaligned, and reputation/rewards move accordingly.
                </p>
              </>
            ),
          },
        ]}
      />

      <h3 id="company-lane">The company lane</h3>
      <p>
        The company posts the job, sets the guild that will vet it, and
        configures any job-specific screening questions. Once applications are
        finalized, the company sees a ranked shortlist with each candidate's
        consensus score and optional aggregated feedback.
      </p>
      <p>
        The company reviews the shortlist, runs their own interviews as usual,
        and marks a final hire. If an expert staked VETD endorsing a candidate
        and that candidate is hired, the <DocsGlossaryLink term="endorsement">endorsement</DocsGlossaryLink> pays out. If the hire
        doesn't work out, that reputation signal gets recorded too.
      </p>

      <h2 id="what-moves-onchain">What moves on-chain</h2>
      <p>
        Not everything needs to hit the chain — that would be expensive and
        slow. Vetted uses on-chain storage only for the things that require
        tamper-evidence or portable ownership:
      </p>
      <ul>
        <li>
          <strong>Vote commitments</strong> (hashes, not scores) so reveals
          can't be rewritten.
        </li>
        <li>
          <strong>Revealed scores</strong> and their corresponding consensus
          calculations.
        </li>
        <li>
          <strong>Reputation deltas</strong> attached to each expert's wallet.
        </li>
        <li>
          <strong>Stakes and endorsements</strong> — VETD tokens custodied by a
          smart contract.
        </li>
      </ul>
      <p>
        Everything else — profiles, application text, messages, rubric metadata
        — lives in the Vetted backend and is indexed by the chain's canonical
        identifiers when needed.
      </p>

      <DocsKeyTakeaways
        points={[
          <>The three lanes (candidate / expert / company) run in parallel and only meet at specific hand-offs.</>,
          <>Candidates never see individual expert scores — only aggregate status.</>,
          <>Experts commit blind, reveal together, and are scored on consensus alignment.</>,
          <>Companies receive a ranked shortlist with consensus scores and optional endorsements.</>,
          <>The blockchain only stores what actually needs tamper-evidence: hashes, scores, reputation, stakes.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "I'm an expert",
            description: "Join a guild and start reviewing — 10-page handbook.",
            href: "/docs/experts",
            icon: Shield,
          },
          {
            title: "I'm a candidate",
            description: "Build a profile and apply to jobs through the vetting pipeline.",
            href: "/docs/candidates",
            icon: Users,
          },
          {
            title: "I'm hiring",
            description: "Post a job and receive a guild-vetted shortlist.",
            href: "/docs/companies",
            icon: Building2,
          },
          {
            title: "Glossary",
            description: "Every Vetted-specific term in one place.",
            href: "/docs/glossary",
            icon: ScrollText,
          },
        ]}
      />
    </DocsPage>
  );
}
