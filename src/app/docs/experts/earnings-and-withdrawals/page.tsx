import type { Metadata } from "next";
import { Coins, Wallet, Landmark, FileText, Clock, Hourglass, CheckCircle2 } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Earnings & withdrawals",
  description:
    "The three expert earning streams, how to claim rewards, and the seven-day unstake cooldown.",
};

const TOC = [
  { id: "three-streams", title: "Three earning streams", level: 2 as const },
  { id: "voting-rewards", title: "Voting rewards", level: 3 as const },
  { id: "endorsement-payouts", title: "Endorsement payouts", level: 3 as const },
  { id: "governance-rewards", title: "Governance rewards", level: 3 as const },
  { id: "claiming", title: "Claiming rewards", level: 2 as const },
  { id: "unstaking", title: "Unstaking and cooldown", level: 2 as const },
  { id: "taxes", title: "A note on taxes", level: 2 as const },
];

export default function EarningsPage() {
  return (
    <DocsPage
      href="/docs/experts/earnings-and-withdrawals"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Earnings & withdrawals" },
      ]}
      eyebrow="For experts · Economics"
      title="Earnings & withdrawals"
      description="The three ways experts earn VETD on Vetted, how to claim it, and the seven-day cooldown that governs unstaking."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Three earning streams: <strong>voting rewards</strong> (auto-settle), <strong>endorsement payouts</strong> (manual claim), <strong>governance rewards</strong> (small nudges).</>,
          <>Voting rewards are weighted by rank multiplier and optional <DocsGlossaryLink term="stake">stake</DocsGlossaryLink> factor: <code>(your_weight × pool) / total_aligned_weight</code>.</>,
          <>Endorsement claims require a gas-paying transaction. Batch multiple claims if gas is high.</>,
          <>Unstaking has a <strong>7-day <DocsGlossaryLink term="cooldown">cooldown</DocsGlossaryLink></strong> that cannot be shortened or cancelled.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Unstaking flow. The 7-day window exists to prevent flash-loan attacks and rapid exits right before adverse outcomes."
        steps={[
          { tag: "Day 0", label: "Request unstake", icon: Wallet },
          { tag: "Days 1–7", label: "Cooling down", description: "Stake locked", icon: Hourglass, accent: "primary" },
          { tag: "Day 7+", label: "Withdraw", icon: CheckCircle2 },
          { tag: "Done", label: "Wallet balance", icon: Coins },
        ]}
      />

      <h2 id="three-streams">Three earning streams</h2>
      <p>
        Experts earn from three different activities, each with its own math
        and cadence. On the Earnings page (<code>/expert/earnings</code>) they
        appear in a single combined chart but also break out individually in
        the timeline below.
      </p>

      <h3 id="voting-rewards">Voting rewards</h3>
      <p>
        When a review is finalized, the guild contributes a pool of VETD as a
        reward for experts who voted aligned with consensus. Your share of
        that pool is weighted by two factors:
      </p>
      <ul>
        <li>
          <strong>Rank multiplier</strong> — 1.0× at Recruit up to 2.0× at
          Master. Fixed by your per-guild reputation.
        </li>
        <li>
          <strong>Stake factor</strong> — optional. Staking VETD on a specific
          review multiplies your effective weight for that review. Unstaked
          aligned votes still earn rewards, at the smaller base rate.
        </li>
      </ul>
      <p>
        <code>
          your_weight = rank_multiplier × (1 + stake_factor)
        </code>
        <br />
        <code>
          your_share = (your_weight × pool) / total_aligned_weight
        </code>
      </p>
      <p>
        Voting rewards land immediately after the review is finalized. They
        don't need to be claimed manually — they settle into your spendable
        balance automatically.
      </p>

      <h3 id="endorsement-payouts">Endorsement payouts</h3>
      <p>
        If you endorsed a candidate and that candidate is hired, you get your
        staked VETD back plus a share of the endorsement reward pool for that
        candidate. The share is proportional to your stake relative to total
        endorser stake on the same candidate.
      </p>
      <p>
        Endorsement payouts can be significantly larger than voting rewards on
        a per-candidate basis, because companies pay more into the endorsement
        pool than into the general review pool.
      </p>

      <h3 id="governance-rewards">Governance rewards</h3>
      <p>
        Some guilds reward active governance participation with small VETD
        bonuses on top of the reputation gain. If the guild you're in has
        governance rewards enabled, voting on proposals will credit your
        balance with the configured bounty.
      </p>
      <p>
        Governance rewards are always small — they're designed as a nudge
        against voter apathy, not as a primary income stream.
      </p>

      <h2 id="claiming">Claiming rewards</h2>
      <p>
        Voting rewards and governance rewards land automatically. Endorsement
        payouts require a manual claim because they involve a settlement
        transaction tied to the hiring outcome.
      </p>
      <p>
        To claim a pending endorsement payout:
      </p>
      <DocsStepList
        steps={[
          {
            title: "Open the Earnings page",
            description: (
              <p>
                Navigate to <strong>Rewards → Earnings</strong>. Any pending
                claims appear in a dedicated card at the top with the total
                amount and the candidate name.
              </p>
            ),
          },
          {
            title: "Click Claim",
            description: (
              <p>
                Your wallet opens for a claim transaction. This is a real
                on-chain transaction, so it costs gas. The amounts involved
                are usually high enough that the gas cost is negligible
                relative to the payout, but it's not free.
              </p>
            ),
          },
          {
            title: "Wait for confirmation",
            description: (
              <p>
                The page shows a pending status until the transaction is
                confirmed. Once confirmed, the claim disappears from the
                Pending list and the VETD shows up in your spendable balance.
              </p>
            ),
          },
        ]}
      />

      <DocsCallout kind="tip" title="Batch claims when gas is high">
        You don't have to claim every endorsement the moment it's settled.
        Batching several small claims into one session is cheaper on gas.
        There's no expiry on pending claims.
      </DocsCallout>

      <h2 id="unstaking">Unstaking and cooldown</h2>
      <p>
        Staked VETD — the amount you have committed to a specific guild as
        skin-in-the-game for voting — is not the same as your earnings
        balance. To move staked VETD out, you have to unstake, wait through
        the cooldown, and then withdraw.
      </p>
      <DocsStepList
        steps={[
          {
            title: "Open the Withdrawals page",
            description: (
              <p>
                From the sidebar, navigate to <strong>Rewards → Withdrawals</strong>.
                Each guild you've staked in appears as a separate position
                with the current stake and an <strong>Unstake</strong> button.
              </p>
            ),
          },
          {
            title: "Request unstake",
            description: (
              <p>
                Click <strong>Unstake</strong>, enter the amount (partial
                unstakes are supported), and confirm the transaction in your
                wallet. The moment the transaction confirms, your stake is
                moved into a pending-withdrawal bucket.
              </p>
            ),
          },
          {
            title: "Wait seven days",
            description: (
              <p>
                A progress bar shows the cooldown timer. During this window
                your VETD is locked — you can't cancel the unstake and you
                can't withdraw. The timer is deliberate: it prevents
                flash-loan attacks and rapid exits immediately before adverse
                outcomes.
              </p>
            ),
          },
          {
            title: "Withdraw",
            description: (
              <p>
                When the cooldown expires, the <strong>Withdraw</strong>{" "}
                button becomes active. Click it, confirm the transaction, and
                the VETD lands in your wallet's spendable balance.
              </p>
            ),
          },
        ]}
      />

      <DocsCallout kind="warning" title="The cooldown doesn't extend">
        If you request a partial unstake, only the requested amount is
        cooling down. Your remaining staked balance is still fully active
        and still earning / at risk on new reviews. Unstaking in smaller
        chunks is a way to preserve earning power while phased-withdrawing.
      </DocsCallout>

      <h2 id="taxes">A note on taxes</h2>
      <p>
        Nothing on this page is tax advice. That said, expert earnings on
        Vetted can be received as VETD (a token) or, for some guilds, as
        stablecoins. Depending on your jurisdiction, these may be taxable as
        income at the moment of receipt. Keep records of claim events — the
        Earnings page has a CSV export button for exactly this purpose.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Voting rewards don't need a claim — they auto-settle into your balance on finalization.</>,
          <>Endorsement claims require a real on-chain transaction. Gas applies.</>,
          <>The 7-day unstake cooldown is immutable — plan liquidity accordingly.</>,
          <>Partial unstakes cool down independently; the remaining staked balance keeps earning (and risks slashing).</>,
          <>Export earnings to CSV from the Earnings page for tax records.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "My earnings",
            description: "View balance, claim pending endorsement payouts, export CSV.",
            href: "/expert/earnings",
            icon: Coins,
            kind: "app",
          },
          {
            title: "My withdrawals",
            description: "Start an unstake or complete a pending withdrawal.",
            href: "/expert/withdrawals",
            icon: Wallet,
            kind: "app",
          },
          {
            title: "Governance & proposals",
            description: "Earn governance rewards while shaping the protocol.",
            href: "/docs/experts/governance",
            icon: Landmark,
          },
          {
            title: "Expert FAQ",
            description: "Tax, claims, and edge cases.",
            href: "/docs/experts/faq",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
