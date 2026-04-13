import type { Metadata } from "next";
import { Lock, Eye, CheckCircle2, Vote, ShieldAlert, TrendingUp, Play } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { CommitRevealDemo } from "@/components/docs/demos/CommitRevealDemo";
import { AlignmentTierTable } from "@/components/docs/demos/AlignmentTierTable";

export const metadata: Metadata = {
  title: "Commit-reveal voting",
  description:
    "The two-phase voting protocol Vetted uses to prevent anchoring and herding — with an interactive demo you can play with before going live.",
};

const TOC = [
  { id: "why", title: "Why commit-reveal exists", level: 2 as const },
  { id: "the-protocol", title: "The protocol", level: 2 as const },
  { id: "try-it", title: "Try it yourself", level: 2 as const },
  { id: "consensus-math", title: "How consensus is calculated", level: 2 as const },
  { id: "alignment-tiers", title: "Alignment tiers", level: 2 as const },
  { id: "recovering-commits", title: "If you lose your nonce", level: 2 as const },
];

export default function CommitRevealPage() {
  return (
    <DocsPage
      href="/docs/experts/commit-reveal-voting"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Commit-reveal voting" },
      ]}
      eyebrow="For experts · Core concept"
      title="Commit-reveal voting"
      description="Vetted's two-phase voting protocol. Experts commit blind scores first, reveal them together later, and consensus is calculated with outlier filtering. This page explains why the design exists and walks through it with an interactive demo."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <><DocsGlossaryLink term="commit-reveal">Commit-reveal</DocsGlossaryLink> is a two-phase voting protocol that hides scores until all reviewers have committed, preventing anchoring and herding bias.</>,
          <>Phase 1: you submit a <DocsGlossaryLink term="hash">hash</DocsGlossaryLink> of <em>(score + <DocsGlossaryLink term="nonce">nonce</DocsGlossaryLink>)</em> on-chain. Phase 2: you reveal the actual score; the chain verifies it matches.</>,
          <>Consensus is calculated with an <DocsGlossaryLink term="iqr-consensus">IQR filter</DocsGlossaryLink> — scores outside the band <code>[median − 0.75×IQR, median + 0.75×IQR]</code> are excluded, and the average of the rest becomes the final score.</>,
          <>Your alignment with consensus earns or costs <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink>: +10 if within 1×IQR of median (aligned), −20 if beyond (misaligned).</>,
        ]}
      />

      <DocsFlowDiagram
        caption="A vote moves through three phases. Only the reveal phase exposes your score to other experts."
        steps={[
          {
            tag: "Phase 1",
            label: "Commit",
            description: "Submit hash(score, nonce) on-chain",
            icon: Lock,
          },
          {
            tag: "Phase 2",
            label: "Reveal",
            description: "Publish actual score — chain verifies hash",
            icon: Eye,
            accent: "primary",
          },
          {
            tag: "Phase 3",
            label: "Finalize",
            description: "IQR consensus + reputation moves",
            icon: CheckCircle2,
          },
        ]}
      />

      <h2 id="why">Why commit-reveal exists</h2>
      <p>
        Group evaluation has two chronic failure modes. <strong>Anchoring</strong>{" "}
        is when reviewers see someone else's score first and unconsciously
        adjust their own to match it. <strong>Herding</strong> is the same
        problem compounded: once the first few reviewers agree, later ones feel
        social pressure to fall in line.
      </p>
      <p>
        Both effects collapse the variance of a panel's scores toward whoever
        votes first, destroying the statistical value of having multiple
        reviewers in the first place. Commit-reveal voting solves this by
        making it physically impossible to see anyone else's score until
        everyone has committed.
      </p>
      <DocsCallout kind="note" title="This isn't a Vetted invention">
        Commit-reveal schemes come from cryptographic voting research going
        back decades. Vetted's contribution is wiring one up specifically for
        candidate reviews and exposing it as a product primitive.
      </DocsCallout>

      <h2 id="the-protocol">The protocol</h2>
      <p>
        A vote moves through three phases. At the end, the consensus score is
        calculated and every expert's reputation is updated based on their
        alignment with that consensus.
      </p>

      <h3>1. Commit phase</h3>
      <p>
        Your client computes a hash of your score concatenated with a random
        nonce. The hash is submitted to the on-chain contract along with your
        wallet signature. Your browser stores the nonce in local storage
        only — it never leaves your device during commit.
      </p>
      <DocsCodeBlock language="pseudocode" filename="commit.ts">
{`const nonce = crypto.randomBytes(16).toHex();   // generated client-side
const hash  = keccak256(score + nonce);          // e.g. keccak256("78|4f2a...")

await vettedContract.commit(applicationId, hash);

// stored locally for reveal:
localStorage.setItem(\`vote-nonce-\${applicationId}\`, nonce);
localStorage.setItem(\`vote-score-\${applicationId}\`, score);`}
      </DocsCodeBlock>
      <p>
        Other experts can see that you committed (your wallet address appears
        in the application's commit list) but they cannot see your score. They
        only see a hash, which is information-theoretically useless without
        the nonce.
      </p>

      <h3>2. Reveal phase</h3>
      <p>
        After the commit window closes, the reveal window opens. You come back
        to the application page and click <strong>Reveal</strong>. The client
        reads your saved nonce and score, and calls the reveal function on the
        contract.
      </p>
      <DocsCodeBlock language="pseudocode" filename="reveal.ts">
{`const nonce = localStorage.getItem(\`vote-nonce-\${applicationId}\`);
const score = localStorage.getItem(\`vote-score-\${applicationId}\`);

await vettedContract.reveal(applicationId, score, nonce);
// the contract re-computes keccak256(score + nonce) and checks it matches
// the hash you committed earlier. If it doesn't, the reveal reverts.`}
      </DocsCodeBlock>
      <p>
        The reveal is the only moment you're exposed — once you've clicked it,
        your score is public to the guild. Until then, nobody has any signal
        about your vote.
      </p>

      <h3>3. Finalization</h3>
      <p>
        When every expert has revealed (or the reveal window expires),
        finalization runs. The backend gathers all revealed scores, filters
        outliers using interquartile-range math, computes the consensus
        score (average of included scores), and classifies each expert's
        alignment.
      </p>

      <h2 id="try-it">Try it yourself</h2>
      <p>
        The demo below walks through a mock review — you score a fictional
        candidate, commit blind, reveal, and see how your choice maps to
        consensus and reputation. Nothing here touches the real app or your
        reputation.
      </p>
      <CommitRevealDemo />
      <DocsCallout kind="tip" title="Try it twice">
        Run it once with a score near 80 (aligned) and once with something
        wild like 10 or 100 (severe deviation). Seeing the penalty move is the
        fastest way to intuit the <DocsGlossaryLink term="slashing">slashing</DocsGlossaryLink> curve.
      </DocsCallout>

      <h2 id="consensus-math">How consensus is calculated</h2>
      <p>
        Vetted uses an IQR-based filter rather than a simple mean or median.
        Here's the exact procedure:
      </p>
      <ol>
        <li>Collect every revealed score for the application.</li>
        <li>
          Calculate the first quartile (<code>Q1</code>), third quartile (
          <code>Q3</code>), and interquartile range (
          <code>IQR = Q3 − Q1</code>).
        </li>
        <li>
          Build an inclusion band around the median:{" "}
          <code>[median − 0.75 × IQR, median + 0.75 × IQR]</code>.
          Scores outside this band are excluded.
        </li>
        <li>
          The consensus score is the <strong>average</strong> of the remaining
          scores.
        </li>
      </ol>
      <p>
        Using the average of the filtered set rather than a raw average of
        everything means one wild score (either honest mistake or bad-faith)
        cannot swing the consensus away from where the bulk of experts
        landed. The IQR filter excludes outliers first, then the average
        of the remaining scores gives a stable consensus.
      </p>

      <h2 id="alignment-tiers">Alignment tiers</h2>
      <p>
        Your reputation change is determined by how far your score landed from
        the consensus, measured in IQR units. Two tiers:
      </p>
      <AlignmentTierTable />
      <p>
        The tiers are deliberately lopsided: being aligned earns you a
        meaningful boost; being wrong costs you more. This matches the
        underlying economics — one bad reviewer with no downside can
        consistently bias hiring outcomes, so bad-faith reviewing has to cost
        real money.
      </p>

      <h2 id="recovering-commits">If you lose your nonce</h2>
      <p>
        The nonce only exists in your browser. If you clear local storage,
        switch devices, or use a private window during the commit, you won't
        be able to reveal.
      </p>
      <p>
        There is a manual recovery path — contact the guild admin, who can
        mark your vote as abstained for that cycle. You won't earn or lose
        reputation on the affected vote, but you will count as inactive for
        that review, which contributes to long-term decay if it happens
        repeatedly.
      </p>
      <DocsCallout kind="important" title="Don't share your nonce">
        The nonce + score combination is the proof that you're the one who
        committed. Anyone with both can reveal on your behalf and lock you
        into that score. Keep them local.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>Commit-reveal hides scores until everyone has committed — this is how you prevent anchoring and vote-switching.</>,
          <>The hash you commit is immutable on-chain; you cannot edit your vote after committing, period.</>,
          <>Your nonce lives only in browser local storage. Lose it = lose the ability to reveal that vote.</>,
          <>Consensus uses <strong>IQR filtering</strong> (inclusion band: median ± 0.75×IQR) then takes the average of the remaining scores.</>,
          <>Binary alignment: ≤1×IQR from median = aligned (+10 rep). &gt;1×IQR = misaligned (−20 rep, up to 25% stake slashed).</>,
          <>Staked votes amplify both sides: bigger reward on alignment, real money slashed on severe misalignment.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Reputation & ranks",
            description: "How alignment history rolls up into rank tiers and reward multipliers.",
            href: "/docs/experts/reputation-and-ranks",
            icon: TrendingUp,
          },
          {
            title: "Slashing deep-dive",
            description: "The IQR math, alignment classification, and how to appeal a slashing decision.",
            href: "/docs/experts/slashing-and-accountability",
            icon: ShieldAlert,
          },
          {
            title: "Open voting queue",
            description: "Jump into the app and cast your first vote on a real application.",
            href: "/expert/voting",
            icon: Vote,
            kind: "app",
          },
          {
            title: "Try the demo again",
            description: "Scroll back up and experiment with different score values.",
            href: "#try-it",
            icon: Play,
          },
        ]}
      />
    </DocsPage>
  );
}
