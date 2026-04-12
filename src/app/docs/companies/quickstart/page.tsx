import type { Metadata } from "next";
import { Briefcase, Building2, ShieldCheck, LayoutDashboard, Globe2, UserPlus, FileText, Users, HelpCircle, Upload } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Company quickstart",
  description:
    "Create a company account, post your first job, and receive a guild-vetted shortlist.",
};

const TOC = [
  { id: "what-youll-end-up-with", title: "What you'll end up with", level: 2 as const },
  { id: "before-you-start", title: "Before you start", level: 2 as const },
  { id: "the-five-steps", title: "The five steps", level: 2 as const },
  { id: "what-next", title: "What happens next", level: 2 as const },
];

export default function CompanyQuickstartPage() {
  return (
    <DocsPage
      href="/docs/companies/quickstart"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For companies", href: "/docs/companies" },
        { label: "Company quickstart" },
      ]}
      eyebrow="For companies · Quickstart"
      title="Post a job and get a guild-vetted shortlist"
      description="The minimum path from creating a Vetted company account to publishing your first job. Most teams finish this flow in under thirty minutes of active work."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>~<strong>30 minutes</strong> of active work from signup to published job.</>,
          <>No crypto — email/password signup or LinkedIn OAuth.</>,
          <>Guild selection is <strong>locked at post time</strong>. Pick the guild that matches the role's domain carefully.</>,
          <>3–5 screening questions do most of the reviewing work. Keep them specific.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Six steps from a new account to a live job. Most of the time goes into writing screening questions."
        steps={[
          { tag: "Step 1", label: "Account", icon: UserPlus },
          { tag: "Step 2", label: "Profile", icon: Building2 },
          { tag: "Step 3", label: "Job details", icon: FileText },
          { tag: "Step 4", label: "Pick guild", icon: Users, accent: "primary" },
          { tag: "Step 5", label: "Screening Qs", icon: HelpCircle },
          { tag: "Step 6", label: "Publish", icon: Upload },
        ]}
      />

      <h2 id="what-youll-end-up-with">What you'll end up with</h2>
      <p>
        At the end of this quickstart you'll have a verified company account,
        a complete company profile, and a live job post that's being reviewed
        by the guild of experts you chose. Candidates can apply immediately;
        the guild reviews each application against your screening questions
        and a rubric defined by the guild itself.
      </p>

      <h2 id="before-you-start">Before you start</h2>
      <ul>
        <li>
          <strong>A work email.</strong> You'll sign in with email and
          password — no wallet, no crypto, nothing on-chain from your side.
        </li>
        <li>
          <strong>Basic company details.</strong> Name, website, and a short
          description for the public company profile.
        </li>
        <li>
          <strong>The job you want to post.</strong> Title, responsibilities,
          requirements, skills, location, and salary range — everything you'd
          put in any other job post — plus 3–5 role-specific screening
          questions that the reviewing guild will score candidates against.
        </li>
      </ul>

      <DocsCallout kind="note" title="No crypto required on the hiring side">
        Vetted is built on an on-chain vetting protocol, but as a company
        you never touch the blockchain directly. No wallet, no tokens, no
        transaction fees. The on-chain activity is all on the expert
        reviewers' side — you see the shortlist.
      </DocsCallout>

      <h2 id="the-five-steps">The five steps</h2>
      <DocsStepList
        steps={[
          {
            title: "Create your account",
            description: (
              <>
                <p>
                  From the home page, click <strong>Start hiring</strong> or
                  go to <code>/auth/signup?type=company</code>. Enter your
                  email, a strong password (8+ characters with at least one
                  uppercase letter, number, and special character), your
                  company name, and optional website and phone.
                </p>
                <p>
                  You can also sign in with LinkedIn if you prefer — the
                  button is on the same page.
                </p>
              </>
            ),
          },
          {
            title: "Complete your company profile",
            description: (
              <>
                <p>
                  Navigate to <strong>Company → Company profile</strong>. Add
                  your logo, a 2–3 sentence description, and any relevant
                  links. Candidates see this before they apply, so it's worth
                  taking a few minutes to do properly.
                </p>
              </>
            ),
          },
          {
            title: "Create a new job",
            description: (
              <>
                <p>
                  From the sidebar, click <strong>Jobs → New job</strong>.
                  Fill in the required fields: title (3+ chars), full
                  description (50+ chars), location, location type
                  (remote/onsite/hybrid), job type (full-time, contract,
                  etc.), and experience level.
                </p>
                <p>
                  Add requirements and skills as lists — these feed the
                  automatic match-score calculation candidates see on the
                  job card.
                </p>
              </>
            ),
          },
          {
            title: "Pick the reviewing guild",
            description: (
              <>
                <p>
                  This is the most important step. The guild you pick is the
                  group of domain experts who will vet every application to
                  this job. Engineering jobs go to the Engineering guild,
                  design jobs to Design, and so on.
                </p>
                <p>
                  Guild selection must happen before you can publish — it's
                  locked in at post time, so pick carefully.
                </p>
              </>
            ),
          },
          {
            title: "Add screening questions and publish",
            description: (
              <>
                <p>
                  Before publishing, add 3–5 screening questions candidates
                  must answer. These are the primary signal the guild
                  experts score, so make them specific and relevant to the
                  role. Each question needs at least 10 characters.
                </p>
                <p>
                  Click <strong>Publish job</strong> to make it live. If
                  you're not ready, <strong>Save as draft</strong> stores
                  everything without making it visible. Drafts auto-save
                  every second as you type.
                </p>
              </>
            ),
          },
        ]}
      />

      <h2 id="what-next">What happens next</h2>
      <p>
        As soon as you publish, your job appears in the public job browse.
        Candidates submit applications with answers to your screening
        questions plus their profile (resume, LinkedIn, GitHub, portfolio).
        Each application enters the review queue of the guild you selected.
      </p>
      <p>On your dashboard you'll see:</p>
      <ul>
        <li>
          A ranked <strong>candidate pipeline</strong> at{" "}
          <code>/dashboard/candidates</code>, grouped by job, with filters
          for status, guild, and sort order (endorsements, newest, consensus
          score).
        </li>
        <li>
          <strong>Match scores</strong> on each candidate — a 0–100 value
          combining skills overlap, experience level, location fit, guild
          membership, and salary range compatibility. The breakdown is
          visible when you click into a candidate.
        </li>
        <li>
          <strong>Endorsement counts</strong> per candidate — experts who
          staked VETD on a candidate's success, visible on the candidate
          card.
        </li>
        <li>
          <strong>Application status stages</strong>: pending → reviewing
          → interviewed → accepted (or rejected). You advance candidates
          through the pipeline manually as you run your own interviews.
        </li>
      </ul>

      <DocsCallout kind="tip" title="Messaging is built in">
        Once you've decided to interview a candidate, use the built-in
        messaging at <code>/dashboard/messages</code>. It supports meeting
        scheduling with time proposals so you don't need a separate
        calendar tool for the first round.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>Guild is locked at post time — you can't change it later without re-posting.</>,
          <>3–5 screening questions is the sweet spot. Fewer = weak signal. More = candidate drop-off.</>,
          <>Drafts auto-save every second. You can leave and come back.</>,
          <>Messaging is built in — no need for a separate scheduling tool for the first round.</>,
          <>Match scores combine 5 dimensions (skills, experience, location, guild, salary) — look at the breakdown on borderline candidates.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Post my first job",
            description: "Create a company account and publish a job.",
            href: "/auth/login?type=company",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "My dashboard",
            description: "If you're already signed in, jump to the dashboard.",
            href: "/dashboard",
            icon: LayoutDashboard,
            kind: "app",
          },
          {
            title: "Guild-backed vetting",
            description: "Understand what happens inside the review.",
            href: "/docs/companies/guild-vetting",
            icon: ShieldCheck,
          },
          {
            title: "Why Web3 for hiring",
            description: "Answers to buy-in questions from procurement and legal.",
            href: "/docs/companies/why-web3",
            icon: Globe2,
          },
        ]}
      />
    </DocsPage>
  );
}
