import type { Metadata } from "next";
import { Landmark, Plus, TrendingUp, FileText, FileEdit, Vote, CheckCircle2, XCircle, Play } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Governance & proposals",
  description:
    "Shape the protocol — create proposals, vote on parameter changes, and understand how vote weight is computed from reputation.",
};

const TOC = [
  { id: "what-governance-is", title: "What governance is", level: 2 as const },
  { id: "proposal-types", title: "Proposal types", level: 2 as const },
  { id: "vote-weight", title: "How vote weight is calculated", level: 2 as const },
  { id: "creating", title: "Creating a proposal", level: 2 as const },
  { id: "voting", title: "Voting on a proposal", level: 2 as const },
  { id: "quorum", title: "Quorum and approval thresholds", level: 2 as const },
  { id: "etiquette", title: "Governance etiquette", level: 2 as const },
];

export default function GovernancePage() {
  return (
    <DocsPage
      href="/docs/experts/governance"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Governance & proposals" },
      ]}
      eyebrow="For experts · Advanced"
      title="Governance & proposals"
      description="Propose and vote on changes to how Vetted works. Your vote weight scales with your reputation rank — this page explains how to create proposals, how votes are counted, and what it takes to pass."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="advanced" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Governance has two levels: <strong>guild-level</strong> (affects one guild) and <strong>protocol-level</strong> (all guilds).</>,
          <>Vote weight is linear: <code>1 + (<DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink> / 1000)</code>, capped at <strong>20</strong> for any single voter.</>,
          <>A proposal passes only when <strong>both</strong> quorum and approval thresholds are met.</>,
          <>Votes are <strong>immutable</strong> once cast on-chain — you cannot change your mind.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Proposal lifecycle — from draft to execution or rejection."
        steps={[
          { tag: "1", label: "Draft", icon: FileEdit },
          { tag: "2", label: "Submit", icon: Play },
          { tag: "3", label: "Voting", icon: Vote, accent: "primary" },
          { tag: "4", label: "Quorum check", icon: CheckCircle2 },
          { tag: "5", label: "Pass or fail", icon: XCircle },
        ]}
      />

      <h2 id="what-governance-is">What governance is</h2>
      <p>
        Governance is how the rules of the Vetted protocol change over time.
        Rather than a single Vetted team deciding on rubric thresholds,
        <DocsGlossaryLink term="slashing">slashing</DocsGlossaryLink> percentages, or reward pool sizes, those parameters are
        adjustable through proposals that <DocsGlossaryLink term="guild">guild</DocsGlossaryLink> members vote on.
      </p>
      <p>
        There are two levels of governance: <strong>guild-level</strong>,
        which affects a single guild (its rubric, its reward pool size, its
        admission policy), and <strong>protocol-level</strong>, which affects
        all guilds (slashing math, commit windows, global reputation decay
        rates). Expert voting power applies at both levels, but the thresholds
        to pass are higher for protocol-level changes.
      </p>

      <h2 id="proposal-types">Proposal types</h2>
      <ul>
        <li>
          <strong>Parameter change.</strong> Adjust a numeric parameter
          (slashing threshold, reward multiplier, commit window duration).
          The most common proposal type and the one most likely to pass on
          its first vote.
        </li>
        <li>
          <strong>Rubric change.</strong> Add, remove, or reword a rubric
          criterion. Higher bar to pass because changes affect every
          in-flight review in the guild.
        </li>
        <li>
          <strong>Admission policy.</strong> Change which applications the
          guild accepts (e.g. raising the minimum expertise level, adding a
          new application question).
        </li>
        <li>
          <strong>Treasury allocation.</strong> Propose a spend from the
          guild treasury — funding a specific project, paying a contributor,
          donating to an external cause.
        </li>
        <li>
          <strong>Enforcement action.</strong> Propose suspending or removing
          a guild member after a code-of-conduct or conflict-of-interest
          complaint.
        </li>
      </ul>

      <h2 id="vote-weight">How vote weight is calculated</h2>
      <p>
        Your governance vote isn't weighted one-person-one-vote. The weight
        formula is derived from your reputation in the guild where the
        proposal is being voted:
      </p>
      <p>
        <code>vote_weight = 1 + (reputation / 1000)</code>
      </p>
      <p>
        That means a Recruit-tier expert has a weight of ~1, while a Master-
        tier expert with 15,000 rep has a weight of 16. The slope is
        deliberately linear — one extra unit of reputation always buys the
        same extra unit of governance weight, up to the cap. This gives
        long-term participants meaningful voice without making governance a
        plutocracy where you can't be heard until you've been there for
        years.
      </p>
      <DocsCallout kind="note">
        Vote weight is capped at 20 for any individual. Experts with very
        high reputation still hit the cap — the assumption is that no single
        voter should be able to swing a contested proposal single-handedly,
        however well-earned their reputation.
      </DocsCallout>

      <h2 id="creating">Creating a proposal</h2>
      <p>
        From the sidebar, navigate to <strong>Governance → Proposals</strong>{" "}
        and click <strong>New proposal</strong>. The form collects:
      </p>
      <ul>
        <li>
          <strong>Title.</strong> Short, imperative, specific. "Lower severe
          slash from 25% to 20%" is a good title. "Fix slashing" is not.
        </li>
        <li>
          <strong>Description.</strong> Markdown is supported. Explain the
          problem, the proposed fix, and the expected effect. Link to
          supporting data where possible.
        </li>
        <li>
          <strong>Proposal type</strong> from the list above.
        </li>
        <li>
          <strong>Voting duration</strong> — typically 3, 5, or 7 days
          depending on how much discussion you expect.
        </li>
        <li>
          <strong>Quorum requirement</strong> — minimum total vote weight
          needed for the proposal to be valid.
        </li>
        <li>
          <strong>Approval threshold</strong> — the percentage of{" "}
          <em>For</em> votes required to pass, computed as{" "}
          <code>for / (for + against)</code>.
        </li>
      </ul>
      <p>
        Submitting a proposal creates an on-chain record and opens the voting
        window. Once open, the proposal parameters can't be edited — you can
        only post comments and clarifications.
      </p>

      <h2 id="voting">Voting on a proposal</h2>
      <p>
        The Governance page lists every active, past, and upcoming proposal.
        Clicking into a proposal shows the full description, current vote
        tally, and a vote form with three options:
      </p>
      <ul>
        <li>
          <strong>For.</strong> Your weight counts toward passing.
        </li>
        <li>
          <strong>Against.</strong> Your weight counts toward rejecting.
        </li>
        <li>
          <strong>Abstain.</strong> Counts toward quorum but not toward the
          approval calculation.
        </li>
      </ul>
      <p>
        Votes are submitted on-chain and are immutable once confirmed — you
        cannot change your vote after the fact. Comments, however, are
        editable until the voting window closes.
      </p>

      <h2 id="quorum">Quorum and approval thresholds</h2>
      <p>
        A proposal passes only if both conditions are met at the end of the
        voting window:
      </p>
      <ol>
        <li>
          <strong>Quorum met.</strong> Total vote weight (for + against +
          abstain) exceeds the proposal's configured quorum. This prevents a
          tiny minority from passing changes when most of the guild is
          offline.
        </li>
        <li>
          <strong>Approval threshold met.</strong> The ratio of{" "}
          <code>for / (for + against)</code> is at or above the proposal's
          approval percent.
        </li>
      </ol>
      <p>
        If quorum isn't met, the proposal is marked <em>failed for quorum</em>{" "}
        regardless of the vote split, and it can be resubmitted with a lower
        quorum requirement or a longer voting window.
      </p>

      <h2 id="etiquette">Governance etiquette</h2>
      <ul>
        <li>
          <strong>Don't resubmit a failed proposal unchanged.</strong> Address the objections first.
        </li>
        <li>
          <strong>Flag conflicts of interest up front.</strong> If the proposal benefits you, say so in the description.
        </li>
        <li>
          <strong>Short voting windows for clear changes.</strong> Three days for parameter tweaks; longer only when discussion is genuinely needed.
        </li>
      </ul>

      <h3>Sample vote weights</h3>
      <p>
        Here's how the linear weight formula plays out across the five rank tiers. The cap at 20 means even a Master-tier expert at ~15,000 rep hits the ceiling at 16 — and anyone beyond that stays at 20.
      </p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Reputation</th>
            <th>Vote weight</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Recruit</td>
            <td>0 – 999</td>
            <td>1.0× — 2.0×</td>
          </tr>
          <tr>
            <td>Apprentice</td>
            <td>1,000 – 1,999</td>
            <td>2.0× — 3.0×</td>
          </tr>
          <tr>
            <td>Craftsman</td>
            <td>2,000 – 4,999</td>
            <td>3.0× — 6.0×</td>
          </tr>
          <tr>
            <td>Officer</td>
            <td>5,000 – 9,999</td>
            <td>6.0× — 11.0×</td>
          </tr>
          <tr>
            <td>Master</td>
            <td>10,000+</td>
            <td>11.0× — 20× (capped)</td>
          </tr>
        </tbody>
      </table>

      <DocsKeyTakeaways
        points={[
          <>Vote weight scales linearly with reputation, capped at 20 — no single voter can dominate contested proposals.</>,
          <>Quorum failure ≠ rejection. Quorum failure means resubmit with a lower threshold or longer window.</>,
          <>Votes are immutable once cast — read the proposal carefully before confirming.</>,
          <>Use 3-day windows for clean parameter tweaks and 7-day windows for changes that need discussion.</>,
          <>Don't resubmit a failed proposal unchanged. Address the objections first.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Open governance",
            description: "See active proposals and cast votes.",
            href: "/expert/governance",
            icon: Landmark,
            kind: "app",
          },
          {
            title: "Create a proposal",
            description: "Propose a parameter change, rubric update, or treasury spend.",
            href: "/expert/governance/create",
            icon: Plus,
            kind: "app",
          },
          {
            title: "Reputation & ranks",
            description: "How your rep translates directly to governance weight.",
            href: "/docs/experts/reputation-and-ranks",
            icon: TrendingUp,
          },
          {
            title: "Expert FAQ",
            description: "Appeals, disputes, and edge cases.",
            href: "/docs/experts/faq",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
