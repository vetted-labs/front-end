import type { Metadata } from "next";
import { Vote, Zap, TrendingUp, BookOpen, UserPlus, ShieldCheck, Play, CheckCircle2 } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Expert quickstart",
  description:
    "Connect your wallet, apply to a guild, and cast your first vote — in about 10 minutes.",
};

const TOC = [
  { id: "before-you-start", title: "Before you start", level: 2 as const },
  { id: "the-five-steps", title: "The five steps", level: 2 as const },
  { id: "what-just-happened", title: "What just happened", level: 2 as const },
  { id: "next", title: "Next", level: 2 as const },
];

export default function ExpertQuickstartPage() {
  return (
    <DocsPage
      href="/docs/experts/quickstart"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Expert quickstart" },
      ]}
      eyebrow="For experts · Quickstart"
      title="Your first 10 minutes as an expert"
      description="A guided walkthrough from landing on Vetted to casting your first commit-reveal vote. If you've done web3 onboarding before, you'll finish this in under ten minutes."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>You'll connect a wallet, apply to a <DocsGlossaryLink term="guild">guild</DocsGlossaryLink>, and cast your first blind vote in about 10 minutes.</>,
          <>No gas fees during signup — wallet signing is free; you'll only pay gas for the vote commit and reveal.</>,
          <><DocsGlossaryLink term="commit-reveal">Commit-reveal</DocsGlossaryLink> voting means your score is hidden until all experts reveal together, so you can't be anchored or herded.</>,
          <>After finalization, your alignment with consensus earns or costs <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink> — up to +10 per review for being on-target.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Five steps from zero to your first on-chain review. Totals ~10 minutes of active work."
        steps={[
          { tag: "Step 1", label: "Connect wallet", icon: ShieldCheck },
          { tag: "Step 2", label: "Pick a guild", icon: UserPlus },
          { tag: "Step 3", label: "Sign & submit", icon: CheckCircle2, accent: "primary" },
          { tag: "Step 4", label: "Get approved", icon: Play },
          { tag: "Step 5", label: "First vote", icon: Vote },
        ]}
      />

      <h2 id="before-you-start">Before you start</h2>
      <p>
        You'll need three things to complete this quickstart:
      </p>
      <ul>
        <li>
          <strong>A wallet.</strong> MetaMask or Coinbase Wallet — both are
          officially supported. If you don't have one yet, install the browser
          extension before continuing.
        </li>
        <li>
          <strong>A LinkedIn or portfolio URL</strong> to back up your expertise
          claim during guild application.
        </li>
        <li>
          <strong>About 10 minutes</strong> of focused time. The guild
          application cannot be partially saved across devices, so finish it in
          one sitting.
        </li>
      </ul>

      <DocsCallout kind="tip" title="Testnet or mainnet?">
        During the public beta, all guild actions run on a testnet. You don't
        need real VETD to complete the quickstart — the app will mint you a
        small amount of testnet tokens on first sign-in.
      </DocsCallout>

      <h2 id="the-five-steps">The five steps</h2>

      <DocsStepList
        steps={[
          {
            title: "Connect your wallet",
            description: (
              <>
                <p>
                  From the Vetted home page, click <strong>Vet Talent</strong>{" "}
                  in the sidebar or <strong>Sign in as Expert</strong> in the
                  hero. Pick MetaMask or Coinbase Wallet and approve the
                  connection request.
                </p>
                <p>
                  After the connection, your wallet will prompt you for a
                  signature. This signature proves you own the address — it
                  doesn't spend any gas or tokens.
                </p>
              </>
            ),
          },
          {
            title: "Pick a guild and start the application",
            description: (
              <>
                <p>
                  You'll land on a page listing the active guilds. Pick the one
                  that matches your domain — Engineering, Design, Data,
                  Security, and so on. Click <strong>Apply</strong>. The
                  four-step application flow starts.
                </p>
                <p>
                  Fill in personal info, professional background, and the
                  guild's general questions. Everything auto-saves to your
                  browser as you go, so closing the tab mid-application won't
                  lose your answers.
                </p>
              </>
            ),
          },
          {
            title: "Confirm the no-AI declaration",
            description: (
              <>
                <p>
                  Before you can submit, you'll be asked to confirm that your
                  application answers are written by you. This matters because
                  the application questions are how your future guild peers
                  decide whether your judgement is trustworthy — and whether
                  you'll be slashed later for bad votes.
                </p>
              </>
            ),
          },
          {
            title: "Review and sign the submission",
            description: (
              <>
                <p>
                  The review step shows everything you've entered. When you're
                  happy, click <strong>Sign &amp; submit</strong>. Your wallet
                  will open one more time for the on-chain verification
                  signature.
                </p>
                <p>
                  After submission, your application goes into the guild's
                  review queue. You'll see its status on the{" "}
                  <code>/expert/application-pending</code> page.
                </p>
              </>
            ),
          },
          {
            title: "Cast your first vote",
            description: (
              <>
                <p>
                  Once you're approved, the full expert sidebar appears.
                  Navigate to <strong>Vetting → Applications</strong>. Pick any
                  candidate with a <em>commit phase</em> badge, read their
                  application, and score them using the guild rubric.
                </p>
                <p>
                  Clicking <strong>Commit vote</strong> fires an on-chain
                  transaction that stores a hash of your score. No other expert
                  can see your score until the reveal window opens — that's the
                  whole point. When the reveal window opens (usually 24 to 48
                  hours later), come back and click <strong>Reveal</strong>.
                </p>
              </>
            ),
          },
        ]}
      />

      <DocsCallout kind="warning" title="Don't close the tab during the commit">
        Your browser generates the <DocsGlossaryLink term="nonce">nonce</DocsGlossaryLink> that pairs with your committed hash
        and stores it locally. Losing it means you can't reveal — the
        backend can't match your reveal to your commit. If you do lose it,
        contact the guild lead; there's a manual recovery path but it's slow.
      </DocsCallout>

      <h2 id="what-just-happened">What just happened</h2>
      <p>
        In the course of those five steps you:
      </p>
      <ul>
        <li>Verified wallet ownership (signature-only, no gas).</li>
        <li>Submitted a guild application that was written to the backend and recorded on-chain.</li>
        <li>
          Committed a blind vote on a real candidate — its hash lives on-chain
          and will be used to verify your reveal.
        </li>
      </ul>
      <p>
        That puts you in the active expert pool for the guild you picked. Your
        reputation starts at zero and moves the moment your first vote is
        revealed and consensus is calculated.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Wallet signing during signup is <strong>gasless</strong> — it only proves ownership, it doesn't send a transaction.</>,
          <>Your nonce lives in browser local storage only. If you clear it between commit and reveal, you can't reveal that vote.</>,
          <>You don't have to stake to vote. Staking amplifies rewards but also exposes stake to slashing on severe deviation.</>,
          <>The guild application auto-saves to localStorage, but not across devices — finish it in one sitting.</>,
          <>Your reputation moves the moment your first vote's reveal phase closes and consensus is calculated.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Learn commit-reveal voting",
            description: "The novel voting flow explained with an interactive demo.",
            href: "/docs/experts/commit-reveal-voting",
            icon: Vote,
          },
          {
            title: "Reputation & ranks",
            description: "How your votes map to rank tiers and reward multipliers.",
            href: "/docs/experts/reputation-and-ranks",
            icon: TrendingUp,
          },
          {
            title: "Browse guilds to apply",
            description: "Jump straight into the guild picker and start your application.",
            href: "/guilds",
            icon: Zap,
            kind: "app",
          },
          {
            title: "Full expert handbook",
            description: "All 11 expert docs, grouped by topic.",
            href: "/docs/experts",
            icon: BookOpen,
          },
        ]}
      />
    </DocsPage>
  );
}
