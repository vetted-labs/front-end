import type { Metadata } from "next";
import { Briefcase, Compass, FileText, MessageCircle } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Every Vetted-specific term in one place — commit-reveal voting, slashing, IQR consensus, guild ranks, and more.",
};

const TOC = [
  { id: "core-concepts", title: "Core concepts", level: 2 as const },
  { id: "voting-mechanics", title: "Voting mechanics", level: 2 as const },
  { id: "reputation-and-stakes", title: "Reputation and stakes", level: 2 as const },
  { id: "web3-basics", title: "Web3 basics", level: 2 as const },
];

interface Term {
  id: string;
  term: string;
  definition: React.ReactNode;
}

const CORE_TERMS: Term[] = [
  {
    id: "guild",
    term: "Guild",
    definition:
      "A group of domain experts organized around a professional discipline (Engineering, Design, Security, etc.) who collectively review candidates applying for roles in that domain.",
  },
  {
    id: "expert",
    term: "Expert",
    definition:
      "A verified guild member who reviews candidate applications, votes on their suitability, and can stake reputation and tokens to endorse candidates.",
  },
  {
    id: "endorsement",
    term: "Endorsement",
    definition:
      "An expert's public bet on a candidate, backed by staked VETD tokens. Unlike votes, endorsements are visible to other experts immediately. Successful endorsements (candidate is hired) return the stake plus reputation (+20). Failed endorsements have 10% of the stake slashed, the remaining 90% returned, and incur a reputation penalty (−20).",
  },
  {
    id: "rubric",
    term: "Rubric",
    definition:
      "The structured scoring template experts use when evaluating a candidate. Each guild defines its own criteria — for example, Engineering might score on System Design, Code Quality, and Communication, each on a 0–100 scale.",
  },
];

const VOTING_TERMS: Term[] = [
  {
    id: "commit-reveal",
    term: "Commit-reveal voting",
    definition:
      "A two-phase voting protocol. In the commit phase, experts submit a hash of their score so nobody else can see it. In the reveal phase, experts disclose their actual scores and the backend verifies each reveal against the earlier hash. This prevents anchoring and vote-switching.",
  },
  {
    id: "commit-phase",
    term: "Commit phase",
    definition:
      "The first phase of a vote. Scores are hashed with a nonce and stored on-chain. Other experts see that a vote exists but cannot see its value.",
  },
  {
    id: "reveal-phase",
    term: "Reveal phase",
    definition:
      "The second phase of a vote. Once the commit window closes, each expert publishes their actual score and the backend confirms it matches the hash they submitted earlier. Scores are only counted once revealed.",
  },
  {
    id: "iqr-consensus",
    term: "IQR consensus",
    definition:
      "The method used to calculate a candidate's final score from multiple expert votes. An inclusion band is built around the median (median ± 0.75×IQR), scores outside this band are excluded, and the average of the remaining scores becomes the consensus. This prevents a single extreme vote from swinging the result.",
  },
  {
    id: "alignment-tier",
    term: "Alignment tier",
    definition:
      "How close an expert's revealed score is to the consensus, measured in IQR units. There are two classifications: Aligned (within 1×IQR of median, +10 rep, 0% slash) and Misaligned (beyond 1×IQR, −20 rep, 25% slash).",
  },
];

const REP_TERMS: Term[] = [
  {
    id: "reputation",
    term: "Reputation",
    definition:
      "A per-guild score that tracks how reliably an expert has voted with consensus, how successful their endorsements have been, and how actively they've participated in governance. Reputation drives rank and reward multipliers.",
  },
  {
    id: "guild-rank",
    term: "Guild rank",
    definition:
      "An expert's standing within a specific guild, derived from their reputation. Ranks are Recruit, Apprentice, Craftsman, Officer, and Master. Higher ranks unlock governance and moderation privileges. Reward multipliers follow a separate three-tier system (Foundation 1.0×, Established 1.25×, Authority 1.5×).",
  },
  {
    id: "slashing",
    term: "Slashing",
    definition:
      "The forfeiture of some portion of an expert's staked VETD tokens as a penalty for severe misalignment with consensus. Only applies when the expert has explicitly staked; unstaked votes can still cost reputation but cannot be slashed.",
  },
  {
    id: "stake",
    term: "Stake",
    definition:
      "VETD tokens an expert locks in a guild or on a specific candidate to back their conviction. Stakes are required for endorsements and amplify voting rewards and penalties.",
  },
  {
    id: "cooldown",
    term: "Unstake cooldown",
    definition:
      "A waiting period (currently seven days) between requesting an unstake and being able to withdraw the VETD. You can cancel the unstake to re-stake your tokens, but you cannot shorten the timer. Prevents flash-loan attacks and rapid exits immediately before adverse outcomes.",
  },
];

const WEB3_TERMS: Term[] = [
  {
    id: "wallet",
    term: "Wallet",
    definition:
      "A piece of software (MetaMask, Coinbase Wallet, etc.) that holds your private keys and signs transactions on your behalf. Expert reviewers use wallets to sign votes and stake VETD. Candidates and companies sign in with email and password and don't need a wallet.",
  },
  {
    id: "nonce",
    term: "Nonce",
    definition:
      "A random number generated client-side during the commit phase of commit-reveal voting. It's stored only in your browser's local storage alongside your score. Without the nonce, you cannot reveal the vote you committed — so losing it means the vote is lost. Never share it.",
  },
  {
    id: "cycle",
    term: "Cycle (review cycle)",
    definition:
      "A single round of reviewing from the commit phase through finalization. Cycles have a commit window (typically 24–48 hours) followed by a reveal window. Experts who miss a full cycle without voting accumulate inactivity decay.",
  },
  {
    id: "vetd",
    term: "VETD",
    definition:
      "The Vetted protocol token. Used for staking on endorsements, paying reward pools, and governance voting weight.",
  },
  {
    id: "gas",
    term: "Gas",
    definition:
      "The small transaction fee paid to the underlying blockchain when an action requires on-chain state changes — for example, committing a vote or claiming rewards. Vetted sponsors certain first-time transactions to reduce friction.",
  },
  {
    id: "hash",
    term: "Hash",
    definition:
      "A fixed-length fingerprint of some input data. It is impossible to reverse-engineer the input from the hash, which is why hashes are used for commit-phase voting — the commitment proves a vote existed without revealing what it was.",
  },
  {
    id: "signature",
    term: "Signature",
    definition:
      "A cryptographic proof, produced by your wallet, that you intended a specific action. Vetted asks for signatures to verify wallet ownership during login and before sensitive operations.",
  },
];

export default function GlossaryPage() {
  return (
    <DocsPage
      href="/docs/glossary"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Reference", href: "/docs" },
        { label: "Glossary" },
      ]}
      eyebrow="Reference"
      title="Glossary"
      description="Every Vetted-specific term in one place. Use this as a reference when you hit a word you don't recognize — most pages link back here."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsCallout kind="tip">
        Most doc pages link terms back here on first use. You can also jump
        directly to a term by its anchor — e.g. <code>/docs/glossary#slashing</code>.
      </DocsCallout>

      <nav aria-label="Jump to section" className="mb-8 flex flex-wrap gap-2">
        <a
          href="#core-concepts"
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          Core concepts
        </a>
        <a
          href="#voting-mechanics"
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          Voting mechanics
        </a>
        <a
          href="#reputation-and-stakes"
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          Reputation & stakes
        </a>
        <a
          href="#web3-basics"
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          Web3 basics
        </a>
      </nav>

      <h2 id="core-concepts">Core concepts</h2>
      <TermList terms={CORE_TERMS} />

      <h2 id="voting-mechanics">Voting mechanics</h2>
      <TermList terms={VOTING_TERMS} />

      <h2 id="reputation-and-stakes">Reputation and stakes</h2>
      <TermList terms={REP_TERMS} />

      <h2 id="web3-basics">Web3 basics</h2>
      <p>
        If you're coming from traditional Web2 products, these are the concepts
        you're most likely to trip over. None of them are Vetted-specific — they
        apply to any app built on a blockchain — but they come up often enough
        to deserve a plain-English definition.
      </p>
      <TermList terms={WEB3_TERMS} />

      <DocsNextSteps
        steps={[
          {
            title: "How Vetted works",
            description: "See these terms in context, walking through the full lifecycle.",
            href: "/docs/how-it-works",
            icon: Compass,
          },
          {
            title: "Browse jobs",
            description: "Put the terms into practice — jump into the product.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Platform FAQ",
            description: "Common questions across all three personas.",
            href: "/docs/faq",
            icon: MessageCircle,
          },
          {
            title: "What is Vetted?",
            description: "The short conceptual overview.",
            href: "/docs/what-is-vetted",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}

function TermList({ terms }: { terms: Term[] }) {
  return (
    <dl className="my-6 space-y-6">
      {terms.map((t) => (
        <div key={t.id} id={t.id} className="scroll-mt-20">
          <dt className="text-[17px] font-semibold text-foreground">{t.term}</dt>
          <dd className="mt-1.5 text-[15.5px] leading-relaxed text-muted-foreground">
            {t.definition}
          </dd>
        </div>
      ))}
    </dl>
  );
}
