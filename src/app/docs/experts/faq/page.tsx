import type { Metadata } from "next";
import { LayoutDashboard, Vote, ShieldAlert, FileText } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsFaqList, type FaqItem } from "@/components/docs/DocsFaqList";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Expert FAQ",
  description:
    "Questions experts ask most often — deadlines, wallets, earnings, appeals, taxes.",
};

const TOC = [
  { id: "wallets", title: "Wallets and accounts", level: 2 as const },
  { id: "voting-operations", title: "Voting and deadlines", level: 2 as const },
  { id: "rewards-and-claims", title: "Rewards and claims", level: 2 as const },
  { id: "slashing-appeals", title: "Slashing and appeals", level: 2 as const },
  { id: "career", title: "Reputation and career", level: 2 as const },
];

const WALLETS: FaqItem[] = [
  {
    q: "Can I use the same wallet for expert and candidate accounts?",
    a: "Technically yes, but it's discouraged. Guilds can see that a wallet is both reviewing and applying, which creates conflict-of-interest optics even when there's no actual conflict. Use separate wallets for separate roles.",
  },
  {
    q: "How do I switch to a new wallet without losing reputation?",
    a: "You can't — reputation is bound to the wallet that earned it. If you switch wallets, the new wallet starts at zero. The only supported case is a one-time migration for compromised wallets, which goes through guild governance.",
  },
  {
    q: "What happens if my wallet is drained?",
    a: "Your tokens are gone — that is the nature of self-custody. However, your reputation is still tied to the compromised wallet. Contact guild admins immediately so they can freeze the reputation (no further actions possible) and start the migration process if applicable.",
  },
];

const VOTING: FaqItem[] = [
  {
    q: "What happens if I miss a commit deadline?",
    a: "The vote is marked as 'not committed' for that review. No reputation is earned or lost on the specific review, but you do accumulate an inactivity marker that counts toward cyclical decay.",
  },
  {
    q: "What if I commit but miss the reveal deadline?",
    a: "Worse than missing the commit. Your commitment is on-chain but unrevealed, so the backend has no way to count your score. Guild admins can mark the vote as abstained manually, but you'll have to explain why.",
  },
  {
    q: "Can I change my vote after committing?",
    a: "No. The whole point of commit-reveal voting is that the committed hash is immutable. What you commit is what you must reveal.",
  },
  {
    q: "I clicked Reveal and got an error — 'hash mismatch'. What now?",
    a: "Your saved nonce doesn't match the one used during commit. This usually means you reset your browser data or used a different device between commit and reveal. Contact the guild admin; they can mark the vote as abstained but cannot reveal on your behalf.",
  },
];

const REWARDS: FaqItem[] = [
  {
    q: "When do voting rewards land?",
    a: "When a review finalizes, rewards are calculated and published. On-chain claims use a Merkle-proof system — you have 90 days to claim before they expire.",
  },
  {
    q: "Can I opt out of rewards?",
    a: "You can choose not to claim rewards. Some experts who want to contribute pro-bono periodically donate their claimed balance back to the guild treasury.",
  },
  {
    q: "Do I need to stake to earn voting rewards?",
    a: "No. Unstaked votes still earn voting rewards when aligned with consensus, they earn a smaller share (no stake weight multiplier). Staking amplifies both upside and downside.",
  },
];

const SLASHING: FaqItem[] = [
  {
    q: "My slashing was reversed on appeal — when does the VETD come back?",
    a: "Within one block of the governance vote closing in your favor. The contract reads the governance outcome and automatically refunds the slashed amount and restores the reputation delta.",
  },
  {
    q: "Can I appeal an appeal?",
    a: "No. Appeals are single-shot per event. The system is designed so that a well-argued single appeal is heard, not that experts can drag disputes across multiple rounds.",
  },
  {
    q: "Can a single vote trigger slashing if I didn't stake?",
    a: <>No. <DocsGlossaryLink term="slashing">Slashing</DocsGlossaryLink> only applies to staked votes. An unstaked severe deviation costs the normal -20 reputation but does not touch any VETD.</>,
  },
];

const CAREER: FaqItem[] = [
  {
    q: "How long does it take to reach the highest reward tier?",
    a: "The Authority reward tier starts at 2,000 reputation. At +10 per aligned review, that's about 200 aligned reviews. Most experts who reach Authority have been active for several months with consistent reviewing.",
  },
  {
    q: "Does reputation carry across guilds if I move to a new one?",
    a: "No. Each guild tracks reputation independently. Moving from one guild to another starts you at zero in the new guild, though your existing wallet-level history is visible to guild admins during the application review.",
  },
  {
    q: "Is there a way to get a public reference from my Vetted track record?",
    a: "Yes — every expert has a public profile page showing their guild memberships, current ranks, and reputation history. The URL is stable and linkable, which makes it suitable for including in a CV or a LinkedIn bio.",
  },
];

export default function ExpertFAQPage() {
  return (
    <DocsPage
      href="/docs/experts/faq"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Expert FAQ" },
      ]}
      eyebrow="For experts · Reference"
      title="Expert FAQ"
      description="The questions experts actually ask after their first few weeks on Vetted."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsCallout kind="note">
        Looking for general questions? See the{" "}
        <a href="/docs/faq">platform-wide FAQ</a>. For terminology, see the{" "}
        <a href="/docs/glossary">glossary</a>.
      </DocsCallout>

      <h2 id="wallets">Wallets and accounts</h2>
      <DocsFaqList items={WALLETS} />

      <h2 id="voting-operations">Voting and deadlines</h2>
      <DocsFaqList items={VOTING} />

      <h2 id="rewards-and-claims">Rewards and claims</h2>
      <DocsFaqList items={REWARDS} />

      <h2 id="slashing-appeals">Slashing and appeals</h2>
      <DocsFaqList items={SLASHING} />

      <h2 id="career">Reputation and career</h2>
      <DocsFaqList items={CAREER} />

      <DocsNextSteps
        steps={[
          {
            title: "My dashboard",
            description: "Open the expert dashboard to act on anything you read above.",
            href: "/expert/dashboard",
            icon: LayoutDashboard,
            kind: "app",
          },
          {
            title: "Commit-reveal voting",
            description: "Deep dive on the vote protocol with an interactive demo.",
            href: "/docs/experts/commit-reveal-voting",
            icon: Vote,
          },
          {
            title: "Slashing & accountability",
            description: "What happens when votes go wrong.",
            href: "/docs/experts/slashing-and-accountability",
            icon: ShieldAlert,
          },
          {
            title: "Glossary",
            description: "Every term used in this FAQ, defined.",
            href: "/docs/glossary",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}

