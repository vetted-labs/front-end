import type { Metadata } from "next";
import { LayoutDashboard, BookText, FileText, Briefcase } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsFaqList, type FaqItem } from "@/components/docs/DocsFaqList";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Vetted — wallets, accounts, voting, reputation, slashing, and more.",
};

const TOC = [
  { id: "general", title: "General", level: 2 as const },
  { id: "accounts-and-wallets", title: "Accounts and wallets", level: 2 as const },
  { id: "guilds-and-voting", title: "Guilds and voting", level: 2 as const },
  { id: "reputation-and-tokens", title: "Reputation and tokens", level: 2 as const },
  { id: "trust-and-safety", title: "Trust and safety", level: 2 as const },
];

const GENERAL: FaqItem[] = [
  {
    q: "Do I need to know anything about crypto to use Vetted?",
    a: "No. If you're a candidate or a hiring manager, the product looks and feels like a normal web app — you sign in with email and password, no wallet needed. Experts connect a wallet (MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet) for on-chain voting and staking, but the rest of the flows don't require you to think about the blockchain.",
  },
  {
    q: "Is Vetted free to use?",
    a: "Browsing jobs, creating a profile, and applying are free for candidates. Companies pay per job post. Experts don't pay anything to join a guild, but staking VETD is required to earn voting rewards and endorsements.",
  },
  {
    q: "Which blockchains does Vetted support?",
    a: "The protocol is EVM-compatible. Current deployments run on testnets during the public beta; the mainnet rollout schedule is announced in the changelog.",
  },
];

const WALLETS: FaqItem[] = [
  {
    q: "Why does Vetted need my wallet?",
    a: "Your wallet is your identity on the platform. It proves you are the same person across sessions without requiring a centralized login. For experts, it also holds staked VETD and earned reputation.",
  },
  {
    q: "Which wallets are supported?",
    a: "MetaMask and Coinbase Wallet are officially supported. WalletConnect v2 is also available for connecting mobile wallets and other compatible wallets.",
  },
  {
    q: "What happens if I lose access to my wallet?",
    a: "We cannot recover reputation or tokens that belong to a wallet we don't control — that is both a feature and a risk of self-custody. Back up your seed phrase and consider using a hardware wallet if you hold significant stakes.",
  },
];

const VOTING: FaqItem[] = [
  {
    q: "What is commit-reveal voting and why does Vetted use it?",
    a: "It's a two-phase protocol where experts submit their scores blind in the first phase, then reveal them all together in the second phase. This prevents anchoring (seeing other experts' scores and adjusting yours to match) and vote-switching (changing your score after seeing the trend).",
  },
  {
    q: "What if I can't review on time?",
    a: "Missing a commit or reveal deadline doesn't cost you VETD directly, but it counts as inactivity and reputation decays if you skip enough cycles. The dashboard shows deadlines for every active review so you can plan accordingly.",
  },
  {
    q: "Can an expert vote on a candidate they know personally?",
    a: "The platform doesn't currently enforce conflict-of-interest rules automatically, but every guild's code of conduct requires abstaining from reviews where you have a close personal or professional relationship with the candidate. Breaches are surfaced through guild governance.",
  },
];

const REP: FaqItem[] = [
  {
    q: "How is reputation earned?",
    a: "The primary source is voting alignment: experts whose revealed score falls within the consensus range earn reputation, while outliers lose it. Successful endorsements, governance participation, and first-time review streaks also contribute.",
  },
  {
    q: "Is reputation per-guild or global?",
    a: "Per-guild. An expert might hold a high rank in Engineering and be a Recruit in Design. Your wallet is the same, but each guild tracks its own reputation and rank progression.",
  },
  {
    q: "Can I sell or transfer my reputation?",
    a: "No. Reputation is non-transferable by design — it's attached to your wallet and cannot be assigned to another address. VETD tokens are transferable, but the reputation earned from using them is not.",
  },
];

const TRUST: FaqItem[] = [
  {
    q: "What happens if an expert acts in bad faith?",
    a: "Persistent misalignment triggers slashing — the expert forfeits a percentage of their staked VETD and loses reputation. Severe or repeated violations can be escalated through guild governance, which has the power to suspend or remove members.",
  },
  {
    q: "Can my personal data be deleted?",
    a: "Off-chain profile data can be deleted on request and removed from our indexes. On-chain records (commitments, reveals, reputation deltas) cannot be deleted, since that would defeat the tamper-evidence guarantees. Contact support for help with either case.",
  },
  {
    q: "Does Vetted share hiring decisions with third parties?",
    a: "Companies' final hiring decisions are private. Aggregate statistics (e.g. approval rates per guild) may be published but never in a form that identifies individual candidates or companies.",
  },
];

export default function FAQPage() {
  return (
    <DocsPage
      href="/docs/faq"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Reference", href: "/docs" },
        { label: "FAQ" },
      ]}
      eyebrow="Reference"
      title="Frequently asked questions"
      description="The questions that come up most often from candidates, experts, and hiring teams. Persona-specific FAQs live inside each persona section."
      lastUpdated="April 2026"
      toc={TOC}
    >
      <DocsCallout kind="note">
        This page covers the broadest questions. For specifics, see the{" "}
        <a href="/docs/experts/faq">Expert FAQ</a>, or jump to the{" "}
        <a href="/docs/glossary">Glossary</a> for terminology.
      </DocsCallout>

      <h2 id="general">General</h2>
      <DocsFaqList items={GENERAL} />

      <h2 id="accounts-and-wallets">Accounts and wallets</h2>
      <DocsFaqList items={WALLETS} />

      <h2 id="guilds-and-voting">Guilds and voting</h2>
      <DocsFaqList items={VOTING} />

      <h2 id="reputation-and-tokens">Reputation and tokens</h2>
      <DocsFaqList items={REP} />

      <h2 id="trust-and-safety">Trust and safety</h2>
      <DocsFaqList items={TRUST} />

      <DocsNextSteps
        steps={[
          {
            title: "Browse jobs",
            description: "Your questions are answered — jump into the product.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Expert FAQ",
            description: "Questions specific to experts and reviewers.",
            href: "/docs/experts/faq",
            icon: FileText,
          },
          {
            title: "Glossary",
            description: "Every Vetted-specific term, defined.",
            href: "/docs/glossary",
            icon: BookText,
          },
          {
            title: "How it works",
            description: "Walk through the full lifecycle from application to hire.",
            href: "/docs/how-it-works",
            icon: LayoutDashboard,
          },
        ]}
      />
    </DocsPage>
  );
}

