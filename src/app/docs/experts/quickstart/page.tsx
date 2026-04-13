import type { Metadata } from "next";
import { Vote, Zap, TrendingUp, BookOpen, UserPlus, ShieldCheck, Play, CheckCircle2, Eye, Coins } from "lucide-react";
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
  { id: "connect-wallet", title: "Step 1 — Connect your wallet", level: 2 as const },
  { id: "pick-guild", title: "Step 2 — Pick a guild", level: 2 as const },
  { id: "apply", title: "Step 3 — Fill out the application", level: 2 as const },
  { id: "wait-approval", title: "Step 4 — Wait for approval", level: 2 as const },
  { id: "first-vote", title: "Step 5 — Cast your first vote", level: 2 as const },
  { id: "after-reveal", title: "After the reveal", level: 2 as const },
  { id: "your-dashboard", title: "Your dashboard", level: 2 as const },
  { id: "whats-next", title: "What's next", level: 2 as const },
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
      description="A screen-by-screen walkthrough from landing on Vetted to casting your first commit-reveal vote. Every button and screen described exactly as you'll see it."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>You'll connect a wallet, apply to a <DocsGlossaryLink term="guild">guild</DocsGlossaryLink>, and cast your first blind vote in about 10 minutes.</>,
          <>No gas fees during signup — wallet signing is free. You only pay gas for vote commit and reveal.</>,
          <><DocsGlossaryLink term="commit-reveal">Commit-reveal</DocsGlossaryLink> voting means your score is hidden until all experts reveal together — no anchoring or herding.</>,
          <>After finalization, your alignment with consensus earns or costs <DocsGlossaryLink term="reputation">reputation</DocsGlossaryLink> — up to +10 per review.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="From zero to your first on-chain review. ~10 minutes of active work (plus wait time for guild approval)."
        steps={[
          { tag: "Step 1", label: "Connect wallet", icon: ShieldCheck },
          { tag: "Step 2", label: "Pick a guild", icon: UserPlus },
          { tag: "Step 3", label: "Apply (4 steps)", icon: CheckCircle2, accent: "primary" },
          { tag: "Step 4", label: "Get approved", icon: Play },
          { tag: "Step 5", label: "First vote", icon: Vote },
        ]}
      />

      <h2 id="before-you-start">Before you start</h2>
      <p>You need three things:</p>
      <ul>
        <li>
          <strong>A browser wallet.</strong> MetaMask or Coinbase Wallet are
          officially supported. WalletConnect v2 also works for mobile and
          300+ other wallets. Install the extension before continuing.
        </li>
        <li>
          <strong>A LinkedIn or portfolio URL</strong> to back up your
          expertise claim during the guild application.
        </li>
        <li>
          <strong>~10 minutes of uninterrupted time.</strong> The guild
          application auto-saves to browser local storage but cannot be
          resumed on a different device — finish in one sitting.
        </li>
      </ul>

      <DocsCallout kind="tip" title="Testnet during beta">
        During the public beta, all actions run on a testnet. You don't
        need real VETD — the app mints testnet tokens on your first sign-in.
      </DocsCallout>

      {/* ── Step 1 ────────────────────────────────────── */}
      <h2 id="connect-wallet">Step 1 — Connect your wallet</h2>
      <p>
        From the home page, click <strong>Vet Talent</strong> in the sidebar
        or <strong>Sign in as Expert</strong> in the hero. You'll land on
        the login page.
      </p>
      <p>
        At the top you'll see three tabs:{" "}
        <strong>Job Seeker</strong>, <strong>Company</strong>, and{" "}
        <strong>Expert</strong>. Make sure <strong>Expert</strong> is
        selected. The page shows a single{" "}
        <strong>Connect Wallet</strong> button — no email or password fields.
        Expert accounts are wallet-based only.
      </p>
      <p>
        Click <strong>Connect Wallet</strong>. A wallet selector appears —
        pick MetaMask, Coinbase Wallet, or any WalletConnect option. Approve
        the connection request in your wallet extension.
      </p>
      <p>
        After connecting, your wallet prompts for a{" "}
        <strong>signature</strong>. This proves you own the address — it's
        gasless, no tokens are spent. Once signed, you're logged in.
      </p>

      <DocsCallout kind="note" title="Already have a wallet connected?">
        If your wallet is already connected from a previous session, the
        button reads <strong>Continue with Connected Wallet</strong>
        instead. Click it to skip the selector.
      </DocsCallout>

      {/* ── Step 2 ────────────────────────────────────── */}
      <h2 id="pick-guild">Step 2 — Pick a guild</h2>
      <p>
        After login, you'll see a list of active guilds. There are eight
        at launch: <strong>Engineering</strong>, <strong>Product</strong>,{" "}
        <strong>Design</strong>, <strong>Marketing &amp; Growth</strong>,{" "}
        <strong>Sales &amp; Success</strong>, <strong>Operations &amp;
        Strategy</strong>, <strong>Finance, Legal &amp; Compliance</strong>,
        and <strong>People, HR &amp; Recruitment</strong>.
      </p>
      <p>
        Click the guild matching your domain, then click{" "}
        <strong>Apply</strong>. This opens the 4-step application form with
        a progress bar at the top showing numbered circles connected by
        lines — you'll see which step you're on at all times.
      </p>

      <DocsCallout kind="tip" title="One guild at a time">
        Start with the guild closest to your expertise. You can apply to
        additional guilds later, but each guild tracks reputation
        independently — spreading early means slower progression.
      </DocsCallout>

      {/* ── Step 3 ────────────────────────────────────── */}
      <h2 id="apply">Step 3 — Fill out the application</h2>
      <p>The form has four screens. Everything auto-saves to your browser as you go.</p>

      <DocsStepList
        steps={[
          {
            title: "Personal info",
            description: (
              <p>
                Full name, email, phone, headline (e.g. "Senior Backend
                Engineer"), and a short bio. Your wallet address is already
                connected and shown. Click <strong>Continue</strong> at the
                bottom to proceed.
              </p>
            ),
          },
          {
            title: "Professional background",
            description: (
              <p>
                Upload your resume (drag-and-drop, PDF or DOCX), enter
                years of experience, add specialisations, and tag your
                expertise areas. Click <strong>Continue</strong>.
              </p>
            ),
          },
          {
            title: "Guild questions",
            description: (
              <>
                <p>
                  Two types of questions appear: <strong>general
                  questions</strong> every guild asks, and{" "}
                  <strong>level-specific questions</strong> loaded based on
                  your expertise level. These are what reviewers score you
                  on — take your time.
                </p>
                <p>Click <strong>Continue</strong> when done.</p>
              </>
            ),
          },
          {
            title: "Review & submit",
            description: (
              <>
                <p>
                  A summary of everything you entered. Check the{" "}
                  <strong>no-AI declaration</strong> checkbox — this confirms
                  your answers are your own work (breaches can result in
                  rejection and a 90-day reapplication cooldown).
                </p>
                <p>
                  Click <strong>Sign with Wallet</strong>. Your wallet opens
                  for a gasless identity signature. Then click{" "}
                  <strong>Submit Application</strong>. You'll see a green
                  success screen confirming your application is under review.
                </p>
              </>
            ),
          },
        ]}
      />

      <DocsCallout kind="warning" title="Don't switch devices mid-application">
        The draft lives in browser local storage only. If you close the tab,
        your answers are preserved — but only on the same device and
        browser. A banner reading "Your previous draft has been restored"
        appears when you come back.
      </DocsCallout>

      {/* ── Step 4 ────────────────────────────────────── */}
      <h2 id="wait-approval">Step 4 — Wait for approval</h2>
      <p>
        After submitting, you're redirected to{" "}
        <code>/expert/application-pending</code>. This page has two columns:
      </p>
      <p><strong>Left side:</strong></p>
      <ul>
        <li>
          Your <strong>guild application card</strong> with a status badge
          (Pending / Approved / Rejected) and a countdown showing time
          remaining.
        </li>
        <li>
          A <strong>review progress bar</strong> showing how many of the
          required 5 reviews have been completed (e.g. "2 / 5 reviews").
        </li>
        <li>
          Three stat boxes: <strong>Reviews</strong>,{" "}
          <strong>Approvals</strong>, and <strong>Required</strong> (5).
        </li>
        <li>
          An <strong>Auto-Approval System</strong> info box explaining that
          once 5 positive reviews are in, you get instant access as a
          Recruit.
        </li>
      </ul>
      <p><strong>Right side:</strong></p>
      <ul>
        <li>
          A vertical <strong>timeline</strong> tracking your application
          through: Application Received → On-Chain Session Created → Under
          Guild Review → Approval/Rejection. Completed steps show green
          checkmarks; the current step pulses.
        </li>
      </ul>
      <p>
        <strong>Typical turnaround:</strong> within a week. You'll get a
        notification when the decision is made. If rejected, the page shows
        a breakdown of reviews and a <strong>Reapply</strong> button.
      </p>

      {/* ── Step 5 ────────────────────────────────────── */}
      <h2 id="first-vote">Step 5 — Cast your first vote</h2>
      <p>
        Once approved, the full expert sidebar appears. Navigate to{" "}
        <strong>Vetting → Applications</strong> or go to{" "}
        <code>/expert/voting</code>.
      </p>

      <h3>The voting queue</h3>
      <p>
        At the top you'll see a stats row: <strong>Pending</strong>,{" "}
        <strong>To Vote</strong>, <strong>Completed</strong>, and{" "}
        <strong>Guilds</strong>. Below that, tabs filter between{" "}
        <strong>Expert Applications</strong>,{" "}
        <strong>Candidate Applications</strong>,{" "}
        <strong>Proposals</strong>, and <strong>History</strong>. A search
        bar lets you filter by name.
      </p>
      <p>
        Each application card shows the candidate's name, expertise level
        badge, submission date, review count, and a status badge. Look for
        cards with a <strong>Pending Review</strong> badge and click{" "}
        <strong>Review</strong>.
      </p>

      <h3>The review modal (4 steps)</h3>
      <p>
        Clicking <strong>Review</strong> opens a modal with its own 4-step
        progress bar:
      </p>
      <ol>
        <li>
          <strong>Profile</strong> — the candidate's name, headline, bio,
          experience level, and links (LinkedIn, GitHub, resume, portfolio).
          Review their background, then click <strong>Next</strong>.
        </li>
        <li>
          <strong>General questions</strong> — the candidate's answers to
          general guild questions with your scoring/feedback fields. Fill in
          your assessment, then click <strong>Next</strong>.
        </li>
        <li>
          <strong>Domain questions</strong> — level-specific answers with
          your scoring fields. Optionally stake VETD on your vote (a number
          input appears with a minimum amount). Click{" "}
          <strong>Submit Review</strong> (or{" "}
          <strong>Submit Commitment</strong> if the guild uses commit-reveal
          for this application).
        </li>
        <li>
          <strong>Success</strong> — a green checkmark confirming "Review
          Submitted." Click <strong>Done</strong> to return to the queue.
        </li>
      </ol>

      <h3>Commit-reveal applications</h3>
      <p>
        Some applications use commit-reveal voting. You'll see a{" "}
        <strong>Commit-Reveal Voting</strong> card with a phase indicator
        showing three stages: <strong>Open → Commit → Finalized</strong>.
        The current phase is highlighted.
      </p>
      <p>
        During the <strong>commit phase</strong>, your score is hashed with
        a random <DocsGlossaryLink term="nonce">nonce</DocsGlossaryLink>{" "}
        and submitted on-chain. Your wallet opens for a gas transaction.
        Once confirmed, your vote hash is stored on-chain but no other
        expert can see your score.
      </p>
      <p>
        When the <strong>reveal window</strong> opens (usually 24–48 hours
        later), come back to the same application. A{" "}
        <strong>Reveal</strong> button appears. Click it — the contract
        verifies your score matches the hash you committed.
      </p>

      <DocsCallout kind="warning" title="Don't lose your nonce">
        When you commit, your browser generates a random nonce and stores it
        in local storage alongside your score. If you clear browser data,
        switch devices, or use a private window between commit and reveal,
        you can't reveal. Contact the guild admin if this happens — they can
        mark the vote as abstained, but it counts as inactivity.
      </DocsCallout>

      {/* ── After reveal ─────────────────────────────── */}
      <h2 id="after-reveal">After the reveal</h2>
      <p>
        Once all experts have revealed (or the reveal window expires),
        finalization runs automatically:
      </p>
      <ol>
        <li>
          Scores outside the{" "}
          <DocsGlossaryLink term="iqr-consensus">IQR inclusion band</DocsGlossaryLink>{" "}
          (median ± 0.75×IQR) are excluded.
        </li>
        <li>
          The consensus score is the <strong>average</strong> of the
          remaining scores.
        </li>
        <li>
          Your deviation from the median determines alignment:{" "}
          <strong>≤1×IQR = aligned (+10 rep, 0% slash)</strong>;{" "}
          <strong>&gt;1×IQR = misaligned (−20 rep, 25% slash if
          staked)</strong>.
        </li>
        <li>
          Rewards are distributed to aligned voters, weighted by the{" "}
          <a href="/docs/experts/reputation-and-ranks#multipliers">
            reward tier multiplier
          </a>{" "}
          (Foundation 1.0×, Established 1.25×, Authority 1.5×).
        </li>
      </ol>
      <p>
        Check your results on the <strong>Reputation</strong> page
        (<code>/expert/reputation</code>) — each entry shows the delta,
        alignment distance, and rewards earned.
      </p>

      {/* ── Dashboard ────────────────────────────────── */}
      <h2 id="your-dashboard">Your dashboard</h2>
      <p>
        Your expert dashboard at <code>/expert/dashboard</code> is your
        daily home base. It shows:
      </p>
      <ul>
        <li>
          <strong>Stat cards</strong> — pending reviews, next rank
          threshold, total VETD earned, active guilds.
        </li>
        <li>
          <strong>Review queue</strong> — applications waiting for your
          vote with a <strong>Start Review</strong> button.
        </li>
        <li>
          <strong>Rank progress</strong> — your current rank (Recruit →
          Apprentice → Craftsman → Officer → Master), a reputation bar to
          the next threshold, and days until inactivity decay triggers.
        </li>
        <li>
          <strong>Governance</strong> — active proposal count with a link
          to the governance page.
        </li>
        <li>
          <strong>Activity feed</strong> — timeline of recent votes,
          reviews, and earnings.
        </li>
      </ul>

      {/* ── What's next ──────────────────────────────── */}
      <h2 id="whats-next">What's next</h2>
      <p>
        Your reputation starts at zero (Foundation tier, 1.0× reward
        multiplier). Here's the progression:
      </p>
      <ul>
        <li>
          <strong>First 10–20 reviews:</strong> vote without staking to
          calibrate against your guild's rubric. Get a feel for where
          consensus tends to land.
        </li>
        <li>
          <strong>Start staking:</strong> once you're consistently aligned,
          staking VETD on reviews amplifies your reward share — but also
          exposes you to slashing on misalignment.
        </li>
        <li>
          <strong>Endorsements:</strong> spot a candidate you're convinced
          will be hired? Stake VETD on them via the{" "}
          <a href="/docs/experts/endorsements">endorsement marketplace</a>.
          Successful endorsements earn +20 reputation.
        </li>
        <li>
          <strong>Governance:</strong> vote on guild proposals to shape
          rubrics, parameters, and policies. Active governance earns +5 to
          +10 reputation per proposal.
        </li>
        <li>
          <strong>1,000 reputation → Established tier</strong> (1.25×
          multiplier). <strong>2,000+ → Authority tier</strong> (1.5×).
        </li>
      </ul>

      <DocsKeyTakeaways
        points={[
          <>Wallet signing during signup is <strong>gasless</strong> — gas is only needed for commit and reveal transactions.</>,
          <>The guild application is a 4-step form that auto-saves to browser storage (same device only).</>,
          <>Your nonce lives in local storage. Losing it = can't reveal that vote.</>,
          <>Don't stake on your first 10–20 reviews. Calibrate first, then stake for amplified rewards.</>,
          <>Reputation starts at zero. First aligned vote earns +10 — about 200 aligned reviews to reach the max reward tier (Authority, 1.5×).</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Commit-reveal deep dive",
            description: "The voting protocol with an interactive demo.",
            href: "/docs/experts/commit-reveal-voting",
            icon: Vote,
          },
          {
            title: "Reputation & ranks",
            description: "How votes map to reward tiers and multipliers.",
            href: "/docs/experts/reputation-and-ranks",
            icon: TrendingUp,
          },
          {
            title: "Browse guilds to apply",
            description: "Jump straight into the guild picker.",
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
