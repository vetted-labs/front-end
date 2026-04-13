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
      description="Propose and vote on changes to how Vetted works. Your vote weight scales with your reputation (max 3.0, or 4.5 for Guild Masters) — this page explains proposals, voting, and thresholds."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="advanced" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Governance has two levels: <strong>guild-level</strong> (affects one guild) and <strong>protocol-level</strong> (all guilds).</>,
          <>Vote weight formula: <code>1 × (1 + min(reputation / 1000, 2.0))</code>, giving a range of <strong>1.0 to 3.0</strong>. Guild Masters get a 1.5× bonus (max 4.5).</>,
          <>A proposal passes only when <strong>both</strong> quorum and approval thresholds are met.</>,
          <>You can change your vote while the voting window is still open by voting again.</>,
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
        <code>vote_weight = 1 × (1 + min(reputation / 1000, 2.0))</code>
      </p>
      <p>
        That means a new expert with 0 reputation has a weight of 1.0,
        while an expert at 2,000+ reputation hits the cap at 3.0. Guild
        Masters receive an additional 1.5× multiplier, giving them a
        maximum weight of 4.5. The slope is deliberately linear — one
        extra unit of reputation always buys the same extra unit of
        governance weight, up to the reputation multiplier cap of 2.0.
        This gives long-term participants meaningful voice without making
        governance a plutocracy.
      </p>
      <DocsCallout kind="note">
        The reputation multiplier caps at 2.0 (reached at 2,000 reputation),
        giving a maximum vote weight of 3.0 for standard experts or 4.5 for
        Guild Masters. No single voter can dominate a contested proposal.
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
      </ul>
      <DocsCallout kind="important" title="Proposal stake required">
        Creating a proposal requires staking a minimum of{" "}
        <strong>100 VETD</strong> as spam prevention. The stake is returned
        after the voting period ends, regardless of whether the proposal
        passes or fails.
      </DocsCallout>
      <p>
        Quorum (default 10%) and approval threshold (default 51%) are set
        by the platform. Submitting a proposal creates an on-chain record
        and opens the voting window. Once open, the proposal parameters
        can't be edited — you can only post comments and clarifications.
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
          <strong>Abstain.</strong> Does not count toward quorum or the
          approval calculation. Use when you want to signal engagement
          without taking a side.
        </li>
      </ul>
      <DocsCallout kind="note" title="You must have staked VETD to vote">
        Governance voting requires having VETD staked in at least one guild.
        Experts with zero stake cannot cast governance votes.
      </DocsCallout>
      <p>
        Votes are recorded on-chain. You can change your vote while the
        voting window is still open by casting a new vote, which replaces
        the previous one. Comments are editable until the window closes.
      </p>

      <h2 id="quorum">Quorum and approval thresholds</h2>
      <p>
        A proposal passes only if both conditions are met at the end of the
        voting window:
      </p>
      <ol>
        <li>
          <strong>Quorum met.</strong> At least <strong>3 voters</strong>{" "}
          have participated, and the total vote weight of{" "}
          <strong>for + against</strong> (abstain does not count) exceeds
          the quorum threshold. This prevents a tiny minority from passing
          changes when most of the guild is offline.
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
        Here's how the weight formula plays out at different reputation levels.
      </p>
      <table>
        <thead>
          <tr>
            <th>Reputation</th>
            <th>Rep multiplier</th>
            <th>Vote weight</th>
            <th>Typical profile</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>0.0</td>
            <td>1.0</td>
            <td>New participant</td>
          </tr>
          <tr>
            <td>500</td>
            <td>0.5</td>
            <td>1.5</td>
            <td>Active Recruit</td>
          </tr>
          <tr>
            <td>1,000</td>
            <td>1.0</td>
            <td>2.0</td>
            <td>Apprentice</td>
          </tr>
          <tr>
            <td>2,000+</td>
            <td>2.0 (capped)</td>
            <td>3.0</td>
            <td>Craftsman / Officer</td>
          </tr>
          <tr>
            <td>2,000+ (Guild Master)</td>
            <td>2.0 + 1.5× role bonus</td>
            <td>4.5</td>
            <td>Elected Guild Master</td>
          </tr>
        </tbody>
      </table>

      <DocsKeyTakeaways
        points={[
          <>Vote weight scales linearly with reputation, capped at 3.0 (4.5 for Guild Masters) — no single voter can dominate contested proposals.</>,
          <>Quorum failure ≠ rejection. Quorum failure means resubmit with a lower threshold or longer window.</>,
          <>You can change your vote while the window is open, but read the proposal carefully before casting.</>,
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
