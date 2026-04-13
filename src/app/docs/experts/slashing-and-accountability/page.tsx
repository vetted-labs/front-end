import type { Metadata } from "next";
import { Wallet, Coins, TrendingUp, FileText } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { AlignmentTierTable } from "@/components/docs/demos/AlignmentTierTable";

export const metadata: Metadata = {
  title: "Slashing & accountability",
  description:
    "The IQR-based math behind slashing, the alignment classification, and how to appeal a slashing decision.",
};

const TOC = [
  { id: "what-slashing-is", title: "What slashing is", level: 2 as const },
  { id: "what-triggers-it", title: "What triggers slashing", level: 2 as const },
  { id: "the-math", title: "The math", level: 2 as const },
  { id: "the-tiers", title: "Alignment classification", level: 2 as const },
  { id: "worked-example", title: "A worked example", level: 2 as const },
  { id: "appeals", title: "Appealing a slashing", level: 2 as const },
  { id: "protection", title: "How to protect yourself", level: 2 as const },
];

export default function SlashingPage() {
  return (
    <DocsPage
      href="/docs/experts/slashing-and-accountability"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Slashing & accountability" },
      ]}
      eyebrow="For experts · Economics"
      title="Slashing & accountability"
      description="Slashing is the mechanism that gives expert reviews their economic weight. This page explains when it triggers, how the 25% penalty is calculated, and how to appeal."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="advanced" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <><DocsGlossaryLink term="slashing">Slashing</DocsGlossaryLink> only applies to <DocsGlossaryLink term="stake">staked</DocsGlossaryLink> votes. Unstaked votes can cost reputation but never touch VETD.</>,
          <>Triggered by misalignment (<strong>&gt;1×<DocsGlossaryLink term="iqr-consensus">IQR</DocsGlossaryLink></strong> from consensus) or enforcement actions via guild governance.</>,
          <>Maximum penalty: <strong>25% of stake</strong> on a severe deviation. Not full forfeiture.</>,
          <>Slashed <DocsGlossaryLink term="vetd">VETD</DocsGlossaryLink> goes to the guild treasury, funding future reward pools.</>,
          <>Decisions are deterministic (no human judgment) but <strong>appealable</strong> once per event via guild governance.</>,
        ]}
      />

      <DocsCallout kind="important" title="Read this before you stake">
        Slashing involves real VETD loss. The rules are fully deterministic —
        no Vetted employee can decide to slash you or spare you — which is
        good for fairness but means you need to actually understand the math
        before you put stake behind a vote.
      </DocsCallout>

      <h2 id="what-slashing-is">What slashing is</h2>
      <p>
        Slashing is the forfeiture of part of your staked VETD tokens as a
        penalty for reviewing badly. It only applies to votes where you
        explicitly staked; unstaked votes can still cost reputation but
        cannot be slashed.
      </p>
      <p>
        The purpose: make bad-faith reviewing expensive
        enough that doing it at scale is economically unviable. Any review
        system without slashing has a trivial attack surface — stuff the
        panel with compromised reviewers. Staked voting raises the cost of
        that attack to whatever you're willing to lose.
      </p>

      <h2 id="what-triggers-it">What triggers slashing</h2>
      <p>Two conditions can trigger a slash:</p>
      <ul>
        <li>
          <strong>Misalignment from consensus.</strong> Your revealed
          score lands more than 1 × IQR from the median. This is the
          main trigger and accounts for the vast majority of real-world
          slashes.
        </li>
        <li>
          <strong>Enforcement action following a governance vote.</strong> If
          the guild votes to uphold a conflict-of-interest or code-of-conduct
          complaint against you, the penalty can include slashing in addition
          to reputation loss.
        </li>
      </ul>

      <h2 id="the-math">The math</h2>
      <p>
        Slashing only operates on the stake attached to the specific
        application being reviewed. It does not touch other stakes you have
        elsewhere in the guild or other guilds.
      </p>
      <p>The formula is:</p>
      <p>
        <code>slashed_amount = stake_on_application × slash_percent</code>
      </p>
      <p>
        Where <code>slash_percent</code> is determined by your <DocsGlossaryLink term="alignment-tier">alignment tier</DocsGlossaryLink>
        (see below). The slashed VETD is transferred to the guild treasury,
        where it's used to fund future review reward pools — so slashing is
        net neutral for the guild as a whole.
      </p>

      <h2 id="the-tiers">Alignment classification</h2>
      <AlignmentTierTable />
      <p>
        The asymmetry between reward and penalty is deliberate. Aligned votes
        earn +10 reputation; severe deviations lose −20 reputation and 25% of
        stake. That asymmetry exists because a single bad actor can do more
        damage to the system than a single good actor can repair.
      </p>

      <h2 id="worked-example">A worked example</h2>
      <p>
        Imagine you staked 20 VETD on a candidate in the Engineering guild.
        Reveal phase closes and the scores look like this:
      </p>
      <ul>
        <li>Expert A: 78</li>
        <li>Expert B: 82</li>
        <li>Expert C: 76</li>
        <li>Expert D: 84</li>
        <li>You: 45</li>
      </ul>
      <p>
        The median of the five scores is 78 and the IQR is 6.5.
        Your 45 is about 5×IQR below the median — well beyond the 1×IQR
        threshold — so you're classified as misaligned.
      </p>
      <p>Result:</p>
      <ul>
        <li>
          Reputation: <strong>−20</strong> in the Engineering guild.
        </li>
        <li>
          Stake slashed: <strong>25% of 20 VETD = 5 VETD</strong> transferred
          to the guild treasury.
        </li>
        <li>
          Remaining stake: <strong>15 VETD</strong> returned to your
          spendable balance, subject to the normal unstake cooldown if you
          want to withdraw it.
        </li>
        <li>
          You do <em>not</em> lose the whole 20 VETD — slashing is a
          percentage, not a full forfeiture.
        </li>
      </ul>

      <DocsCallout kind="warning" title="A real 45 vs 80 split is rare">
        Most severe deviations in practice look more like 92 vs 68, not 45 vs
        80. If you're seeing big numeric gaps, check that you understood the
        rubric — the band descriptions can shift between guilds.
      </DocsCallout>

      <h2 id="appeals">Appealing a slashing</h2>
      <p>
        Slashing is deterministic, but the inputs aren't always clean. A guild
        admin could have misconfigured the rubric; a technical bug could have
        corrupted a revealed score; you might have genuinely had a conflict
        of interest that nobody flagged. For these cases, there's an appeal
        process.
      </p>
      <ol>
        <li>
          Open the finalized application in <strong>Vetting → Applications</strong>.
          A slashed review shows a <strong>Dispute</strong> button.
        </li>
        <li>
          Submit an appeal, describing the basis for the dispute. Keep it
          factual — appeals that read as emotional are routinely dismissed.
        </li>
        <li>
          The appeal goes to a guild governance vote. Other experts in the
          guild review your argument and vote to uphold or reverse the slash.
        </li>
        <li>
          If the appeal passes, you get the slashed VETD back and your
          reputation delta is reversed. If it fails, the slash stands and
          appealing the same event again is disallowed.
        </li>
      </ol>

      <h2 id="protection">How to protect yourself</h2>
      <ul>
        <li>
          <strong>Only stake what you're willing to lose on a single
          review.</strong> If losing 25% would meaningfully hurt you, the
          stake is too large.
        </li>
        <li>
          <strong>Stick to your highest-confidence reviews for staked
          votes.</strong> Unstaked votes still earn reputation on alignment
          and are free to be wrong on.
        </li>
        <li>
          <strong>Calibrate on unstaked votes first.</strong> New experts
          should avoid staking during their first 10–20 reviews while they
          get a feel for their guild's rubric and what the consensus actually
          looks like.
        </li>
        <li>
          <strong>Take conflicts seriously.</strong> Abstain rather than
          review when you know the candidate. Slashing triggered by a
          post-hoc conflict-of-interest finding is harder to appeal because
          the facts are rarely in dispute.
        </li>
      </ul>

      <DocsKeyTakeaways
        points={[
          <>Unstaked votes never get slashed. Calibrate without staking on your first 10–20 reviews.</>,
          <>Slash is a <strong>percentage</strong> of the stake on that application, not a full forfeiture.</>,
          <>One appeal per event. A failed appeal closes the door on that specific slash permanently.</>,
          <>Only stake on reviews where you have high conviction. Staking is not a default behaviour.</>,
          <>Post-hoc conflict-of-interest findings are harder to appeal than self-reported abstentions.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "My withdrawals",
            description: "See staked positions and the 7-day cooldown timer.",
            href: "/expert/withdrawals",
            icon: Wallet,
            kind: "app",
          },
          {
            title: "Earnings & withdrawals",
            description: "The upside — three reward streams and how to claim.",
            href: "/docs/experts/earnings-and-withdrawals",
            icon: Coins,
          },
          {
            title: "My reputation",
            description: "Track the reputation impact of your votes over time.",
            href: "/expert/reputation",
            icon: TrendingUp,
            kind: "app",
          },
          {
            title: "Expert FAQ",
            description: "Appeals, hash-mismatch errors, and other edge cases.",
            href: "/docs/experts/faq",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
