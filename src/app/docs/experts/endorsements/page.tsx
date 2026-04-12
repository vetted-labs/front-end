import type { Metadata } from "next";
import { Handshake, Coins, ShieldAlert, FileText, Vote, Eye } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsComparison } from "@/components/docs/DocsComparison";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Endorsements",
  description:
    "Stake VETD on candidates you believe in. Endorsements are public, higher-risk bets separate from commit-reveal votes.",
};

const TOC = [
  { id: "what-they-are", title: "What endorsements are", level: 2 as const },
  { id: "vs-voting", title: "Endorsements vs voting", level: 2 as const },
  { id: "how-to-endorse", title: "How to endorse", level: 2 as const },
  { id: "outcome-math", title: "Outcome math", level: 2 as const },
  { id: "strategy", title: "Strategy notes", level: 2 as const },
];

export default function EndorsementsPage() {
  return (
    <DocsPage
      href="/docs/experts/endorsements"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Endorsements" },
      ]}
      eyebrow="For experts · Economics"
      title="Endorsements"
      description="Endorsements let you stake VETD on a candidate you think will be hired. They are public, optional, and higher-stakes than ordinary commit-reveal votes."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>An <DocsGlossaryLink term="endorsement">endorsement</DocsGlossaryLink> is a <strong>public financial bet</strong> that a candidate will be hired. You <DocsGlossaryLink term="stake">stake</DocsGlossaryLink> <DocsGlossaryLink term="vetd">VETD</DocsGlossaryLink>; settled on hire/reject.</>,
          <>Public-first by design — unlike blind votes, endorsements are visible immediately.</>,
          <>Successful endorsement: stake returned + <strong>+20 reputation</strong> + share of endorsement reward pool.</>,
          <>Failed endorsement: <strong>stake forfeit</strong>, no reputation loss. Cost is only the VETD.</>,
          <>Endorsements are <strong>not slashable</strong> — they settle automatically on the hire outcome.</>,
        ]}
      />

      <h2 id="what-they-are">What endorsements are</h2>
      <p>
        An endorsement is a financial bet on a specific candidate. You lock up
        a chosen amount of VETD, publicly declare that you believe this
        candidate will be hired, and collect a reward if they are. If they're
        not, your stake is forfeit.
      </p>
      <p>
        Endorsements exist alongside regular voting — they don't replace it.
        Any expert can choose to vote on an application without endorsing, and
        most votes aren't paired with endorsements. Endorsing is something you
        do when you have unusually high conviction about a candidate and want
        to put weight behind it.
      </p>

      <h2 id="vs-voting">Endorsements vs voting</h2>
      <p>
        The two mechanisms differ across visibility, upside, and downside. Pick endorsements when you have high conviction and want the leverage; pick votes when you want to participate without the concentration risk.
      </p>
      <DocsComparison
        left={{
          title: "Votes",
          tagline: "Commit-reveal, blind",
          icon: Vote,
          accent: "neutral",
          rows: [
            <><strong>Hidden</strong> until reveal phase — no other expert sees your score.</>,
            <>Upside: share of the review reward pool if aligned with consensus.</>,
            <>Downside: reputation loss and (if staked) stake slashing on misalignment.</>,
            <>Lower risk, lower reward — the default participation mode.</>,
          ],
        }}
        right={{
          title: "Endorsements",
          tagline: "Public, staked",
          icon: Eye,
          accent: "positive",
          rows: [
            <><strong>Public</strong> the moment you stake — visible to other experts and companies.</>,
            <>Upside: return of stake + <strong>+20 reputation</strong> + share of endorsement reward pool.</>,
            <>Downside: full stake forfeit if the candidate isn't hired. No reputation cost.</>,
            <>Higher risk, higher reward — reserve for high-conviction candidates.</>,
          ],
        }}
      />

      <DocsCallout kind="note" title="Endorsements are public-first on purpose">
        Unlike commit-reveal voting, endorsements need to be visible so that
        other experts and companies can factor them into their own decisions.
        The hiring signal gets stronger when it's layered with skin-in-the-game
        bets.
      </DocsCallout>

      <h2 id="how-to-endorse">How to endorse</h2>
      <p>
        Navigate to <strong>Vetting → Endorsements</strong> in the expert
        sidebar. You'll see a list of active candidate applications in guilds
        you're a member of, each with a "Live market" indicator if the
        endorsement window is still open.
      </p>
      <ol>
        <li>
          Pick a candidate and click <strong>Endorse</strong>.
        </li>
        <li>
          Choose a stake amount. Common presets are 5, 10, and 25 VETD; you
          can also enter a custom amount up to your wallet balance.
        </li>
        <li>
          Add an optional comment. Unlike vote comments, endorsement comments
          are public immediately.
        </li>
        <li>
          Confirm. Your wallet will open for the staking transaction. Once
          confirmed, your VETD is locked in the guild treasury contract until
          the outcome is determined.
        </li>
      </ol>

      <h2 id="outcome-math">Outcome math</h2>
      <p>
        When the candidate's hiring outcome is finalized (company marks them
        as hired or rejected), the contract settles every endorsement on that
        candidate at once.
      </p>
      <p>
        <strong>If the candidate is hired:</strong>
      </p>
      <ul>
        <li>Your staked VETD is returned in full.</li>
        <li>
          You earn a <strong>+20 reputation</strong> boost in the relevant
          guild.
        </li>
        <li>
          You receive a share of the endorsement reward pool, proportional to
          your stake relative to the total staked across all endorsers for
          that candidate.
        </li>
      </ul>
      <p>
        <strong>If the candidate is not hired:</strong>
      </p>
      <ul>
        <li>
          Your stake is forfeited to the guild treasury. It's used to fund
          future reward pools and guild operations.
        </li>
        <li>
          Your reputation is <strong>not</strong> penalised. Unsuccessful
          endorsements cost money, not standing.
        </li>
      </ul>

      <DocsCallout kind="warning" title="Endorsement stakes don't respect the cooldown">
        Regular stake unstaking has a seven-day cooldown. Endorsement stakes
        don't — they're tied to a specific candidate and settle automatically
        when that candidate's outcome is finalized. You can't withdraw mid-
        endorsement.
      </DocsCallout>

      <h2 id="strategy">Strategy notes</h2>
      <ul>
        <li>
          <strong>Don't endorse everyone you voted high.</strong> Endorsements
          are concentrated bets; spread them too thin and you lose on the
          losers and barely benefit from the winners.
        </li>
        <li>
          <strong>Wait for application quality signals.</strong> The best
          endorsement timing is after enough votes have been committed that
          you have a sense of the guild's overall read — but before the reveal
          phase, when the information is still private to you.
        </li>
        <li>
          <strong>Size to your conviction.</strong> A 5 VETD endorsement is a
          signal boost; a 50 VETD endorsement is a statement. Guild leaders
          often factor large endorsements into their recommendations to the
          hiring company.
        </li>
        <li>
          <strong>Watch your concentration.</strong> Endorsing the same
          candidate alongside three other experts you regularly collaborate
          with can look like collusion even when it isn't. Track who's
          endorsing with you.
        </li>
      </ul>

      <DocsKeyTakeaways
        points={[
          <>Public-first on purpose — the hiring signal compounds when experts visibly stake on candidates.</>,
          <>No cooldown on endorsement stakes — they settle automatically when the hire outcome is decided.</>,
          <>Size to conviction, not reflex. A 5 VETD endorsement is a signal boost; a 50 VETD endorsement is a statement.</>,
          <>Failed endorsement costs money but not reputation — the asymmetry sits on the upside.</>,
          <>Endorsement success requires candidate hiring — you're betting on the company's decision, not just the guild's.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Open endorsements",
            description: "Browse active candidates and place your first stake.",
            href: "/expert/endorsements",
            icon: Handshake,
            kind: "app",
          },
          {
            title: "Earnings & withdrawals",
            description: "How endorsement payouts settle into your balance.",
            href: "/docs/experts/earnings-and-withdrawals",
            icon: Coins,
          },
          {
            title: "Slashing & accountability",
            description: "The related economics — when staked VETD can be forfeited.",
            href: "/docs/experts/slashing-and-accountability",
            icon: ShieldAlert,
          },
          {
            title: "Back to overview",
            description: "Full expert handbook.",
            href: "/docs/experts",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
