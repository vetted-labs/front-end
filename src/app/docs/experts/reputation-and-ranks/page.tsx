import type { Metadata } from "next";
import { TrendingUp, Trophy, Coins, ShieldAlert, Award } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { RankTierLadder } from "@/components/docs/demos/RankTierLadder";

export const metadata: Metadata = {
  title: "Reputation & ranks",
  description:
    "How reputation is earned, lost, and mapped to the five guild rank tiers and their reward multipliers.",
};

const TOC = [
  { id: "what-is-reputation", title: "What reputation is", level: 2 as const },
  { id: "how-its-earned", title: "How it's earned", level: 2 as const },
  { id: "how-its-lost", title: "How it's lost", level: 2 as const },
  { id: "rank-tiers", title: "Rank tiers", level: 2 as const },
  { id: "multipliers", title: "Reward multipliers", level: 2 as const },
  { id: "per-guild", title: "Reputation is per-guild", level: 2 as const },
  { id: "timeline", title: "The reputation timeline", level: 2 as const },
];

export default function ReputationAndRanksPage() {
  return (
    <DocsPage
      href="/docs/experts/reputation-and-ranks"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Reputation & ranks" },
      ]}
      eyebrow="For experts · Economics"
      title="Reputation & ranks"
      description="Reputation is the single most important number for an expert on Vetted. This page covers how it moves, how it maps to rank tiers, and how ranks unlock reward multipliers."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <><DocsGlossaryLink term="reputation">Reputation</DocsGlossaryLink> is a <strong>per-guild integer</strong> attached to your wallet. You can be Master in Engineering and Recruit in Security.</>,
          <>Earn from aligned votes (<strong>+10</strong>), successful endorsements (<strong>+20</strong>), governance participation.</>,
          <>Lose from misaligned votes (outside 1×<DocsGlossaryLink term="iqr-consensus">IQR</DocsGlossaryLink>), inactivity decay (<strong>−10/cycle</strong>), enforcement actions.</>,
          <>Five <DocsGlossaryLink term="guild-rank">rank tiers</DocsGlossaryLink> map to reward multipliers: Recruit 1.0× → Master 2.0×.</>,
          <>Reputation is <strong>non-transferable</strong>. Can't sell, delegate, or move between wallets.</>,
        ]}
      />

      <h2 id="what-is-reputation">What reputation is</h2>
      <p>
        Reputation is a per-guild integer that tracks your contribution
        quality. It starts at zero the moment you join a guild, moves every
        time you participate in a finalized review, and maps to a rank tier
        that multiplies your reward share.
      </p>
      <p>
        Reputation is <strong>non-transferable</strong>. You can't sell it,
        delegate it, or move it to another wallet. It lives attached to the
        wallet that earned it and that wallet only.
      </p>

      <h2 id="how-its-earned">How it's earned</h2>
      <p>Four sources of reputation, in order of typical weight:</p>
      <ul>
        <li>
          <strong>Aligned votes (+10).</strong> Your revealed score lands
          inside 1 × IQR of consensus on a finalized review. This is the
          largest and most consistent source.
        </li>
        <li>
          <strong>Successful endorsements (+20).</strong> You staked VETD on a
          candidate and that candidate was hired. Endorsements are higher risk
          than votes, with matching reward.
        </li>
        <li>
          <strong>Governance participation (+5 to +10).</strong> Voting on
          active guild proposals. The exact amount depends on the proposal's
          impact tier.
        </li>
        <li>
          <strong>First-time bonuses (variable).</strong> Completing your
          first review, your first successful endorsement, and your first
          governance vote each trigger small one-time boosts.
        </li>
      </ul>

      <h2 id="how-its-lost">How it's lost</h2>
      <p>Three sources of reputation loss:</p>
      <ul>
        <li>
          <strong>Misaligned votes (−5 to −20).</strong> Mild, moderate, or
          severe deviation from consensus triggers the corresponding penalty.
          See the{" "}
          <a href="/docs/experts/commit-reveal-voting#alignment-tiers">
            alignment tier table
          </a>
          .
        </li>
        <li>
          <strong>Inactivity decay (−10 per cycle).</strong> Going a full
          review cycle without voting or endorsing costs reputation. This
          prevents dormant accounts from holding rank indefinitely.
        </li>
        <li>
          <strong>Enforcement actions (variable).</strong> Guild-level
          enforcement for conflict-of-interest breaches, bad-faith reviewing,
          or code-of-conduct violations can dock significant reputation or
          remove it entirely.
        </li>
      </ul>

      <DocsCallout kind="warning" title="Decay is real">
        A Craftsman (2,000 rep) who stops reviewing for six cycles can drop
        back to Apprentice. If you're going on leave, flag it to your guild —
        some guilds grant grace periods for planned absences.
      </DocsCallout>

      <h2 id="rank-tiers">Rank tiers</h2>
      <p>
        Reputation maps to five named rank tiers. Your rank is purely a
        function of your current reputation score; there is no manual
        promotion or demotion process.
      </p>
      <RankTierLadder />

      <h2 id="multipliers">Reward multipliers</h2>
      <p>
        Your rank determines the multiplier applied when voting rewards are
        distributed. The reward pool for a finalized review is divided among
        aligned experts in proportion to their weighted share:
      </p>
      <p>
        <code>your_share = (your_weight × pool) / total_aligned_weight</code>
      </p>
      <p>
        where <code>your_weight</code> is the rank multiplier (1.0×, 1.25×, and
        so on). A Master-tier expert earns twice as much as a Recruit for the
        same aligned vote on the same review, which is the primary economic
        incentive to climb ranks.
      </p>

      <h2 id="per-guild">Reputation is per-guild</h2>
      <p>
        Every guild tracks reputation independently. You can be Master-tier in
        Engineering and Recruit-tier in Security at the same time — they're
        separate counters attached to the same wallet.
      </p>
      <p>
        Leaderboards and rank badges always specify the guild context. The
        <em>Guild Ranks</em> page (<code>/expert/guild-ranks</code>) in the
        product shows your standing per guild, your reputation delta over
        time, and the next rank threshold.
      </p>

      <h2 id="timeline">The reputation timeline</h2>
      <p>
        Every change is logged on the <em>Reputation</em> page (
        <code>/expert/reputation</code>). Each entry shows:
      </p>
      <ul>
        <li>The delta (±X rep) and the event type</li>
        <li>The guild and candidate (if the event was a review)</li>
        <li>Alignment distance and consensus score</li>
        <li>Rewards earned, if any</li>
        <li>Running cumulative reputation at that point in time</li>
      </ul>
      <p>
        The timeline is paginated and filterable by guild, reason, and date
        range — useful when you want to audit your own behaviour or understand
        a specific rank change.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Reputation is per-guild — each guild tracks its own counter.</>,
          <>Non-transferable. Tied to your wallet permanently.</>,
          <>Decay is real — 6 cycles of inactivity can demote a Craftsman back to Apprentice.</>,
          <>Rank multiplier amplifies reward share: a Master earns 2× what a Recruit earns for the same aligned vote.</>,
          <>Reputation loss and stake slashing are separate mechanics — misaligned unstaked votes cost rep but never touch VETD.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "My reputation page",
            description: "See your full reputation history and timeline.",
            href: "/expert/reputation",
            icon: TrendingUp,
            kind: "app",
          },
          {
            title: "Guild ranks leaderboard",
            description: "Where you sit within each of your guilds.",
            href: "/expert/guild-ranks",
            icon: Trophy,
            kind: "app",
          },
          {
            title: "Slashing & accountability",
            description: "The downside — when stake is actually at risk.",
            href: "/docs/experts/slashing-and-accountability",
            icon: ShieldAlert,
          },
          {
            title: "Earnings & withdrawals",
            description: "How rank multipliers translate to real payouts.",
            href: "/docs/experts/earnings-and-withdrawals",
            icon: Coins,
          },
        ]}
      />
    </DocsPage>
  );
}
