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
  { id: "the-steps", title: "Step by step", level: 2 as const },
  { id: "your-dashboard", title: "Your dashboard after posting", level: 2 as const },
  { id: "whats-next", title: "What happens next", level: 2 as const },
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
      description="The minimum path from creating a Vetted company account to publishing your first job. Most teams finish in under thirty minutes of active work."
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
        A verified company account, a complete company profile visible to
        candidates, and a live job post being reviewed by the expert guild
        you chose. Candidates can apply immediately; the guild reviews each
        application against your screening questions and a rubric defined
        by the guild itself.
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
          <strong>The job you want to post.</strong> Title, description,
          requirements, skills, location, salary range, plus 3–5
          role-specific screening questions.
        </li>
      </ul>

      <DocsCallout kind="note" title="No crypto required on the hiring side">
        Vetted is built on an on-chain vetting protocol, but as a company
        you never touch the blockchain. No wallet, no tokens, no transaction
        fees. The on-chain activity is entirely on the expert reviewers'
        side — you just see the ranked shortlist.
      </DocsCallout>

      <h2 id="the-steps">Step by step</h2>
      <DocsStepList
        steps={[
          {
            title: "Create your account",
            description: (
              <>
                <p>
                  Go to the home page and click <strong>Start hiring</strong>,
                  or navigate to <code>/auth/signup</code>. Select the{" "}
                  <strong>Employer</strong> tab at the top. Enter your email,
                  a password (6+ characters), your company name, and optional
                  website and phone.
                </p>
                <p>
                  You can also click <strong>Continue with LinkedIn</strong>{" "}
                  for one-click signup. Either way, you'll land on your
                  company dashboard.
                </p>
              </>
            ),
          },
          {
            title: "Complete your company profile",
            description: (
              <>
                <p>
                  Navigate to <strong>Company → Company profile</strong> in
                  the sidebar, or go to{" "}
                  <code>/dashboard/company-profile</code>. You'll see
                  fields for:
                </p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li><strong>Company logo</strong> — upload an image</li>
                  <li><strong>Description</strong> — 2–3 sentences about your company</li>
                  <li><strong>Website</strong> and other relevant links</li>
                </ul>
                <p>
                  Candidates see this profile before they apply, so take a
                  few minutes to fill it in properly.
                </p>
              </>
            ),
          },
          {
            title: "Create a new job",
            description: (
              <>
                <p>
                  Click <strong>Jobs → New job</strong> in the sidebar, or
                  go to <code>/jobs/new</code>. The job form has three
                  sections:
                </p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li>
                    <strong>Basic info</strong> — job title (3+ characters),
                    full description (50+ characters), category
                  </li>
                  <li>
                    <strong>Details</strong> — location, location type
                    (remote/onsite/hybrid), salary range, job type
                    (full-time, contract, etc.)
                  </li>
                  <li>
                    <strong>Requirements</strong> — required skills (as tags),
                    nice-to-have skills, experience level. These feed the
                    automatic match-score candidates see on the job card.
                  </li>
                </ul>
                <p>
                  Drafts auto-save every second. You can leave and come back
                  without losing progress.
                </p>
              </>
            ),
          },
          {
            title: "Pick the reviewing guild",
            description: (
              <>
                <p>
                  This is the most important step. You'll see a dropdown of
                  available guilds: Engineering, Product, Design, Marketing,
                  Sales, Operations, Finance, HR. The guild you pick is the
                  group of domain experts who will vet every application to
                  this job.
                </p>
                <p>
                  <strong>Guild selection is locked after publishing.</strong>{" "}
                  You can't change it without re-posting the job, so pick the
                  guild that matches the role's domain.
                </p>
              </>
            ),
          },
          {
            title: "Add screening questions and publish",
            description: (
              <>
                <p>
                  Add 3–5 screening questions candidates must answer. Each
                  needs at least 10 characters. These are the primary signal
                  the guild experts score, so make them specific and relevant.
                </p>
                <p>
                  When ready, click <strong>Publish Job</strong> (blue
                  button). Not ready yet? Click <strong>Save as
                  Draft</strong> to store everything without going live. You
                  can also click the eye icon to <strong>Preview</strong>{" "}
                  the job listing before publishing.
                </p>
              </>
            ),
          },
        ]}
      />

      <h2 id="your-dashboard">Your dashboard after posting</h2>
      <p>
        Your company dashboard at <code>/dashboard</code> shows:
      </p>
      <ul>
        <li>
          <strong>Stat cards</strong> — Open Jobs, Total Applications,
          Interviews Scheduled, Offers Sent.
        </li>
        <li>
          <strong>Recent jobs</strong> — your posted jobs with applicant
          counts and Edit/View/Close actions.
        </li>
        <li>
          <strong>Application pipeline</strong> — candidates grouped by
          status: Pending → Reviewing → Interviewed → Accepted. You advance
          candidates through the pipeline manually as you run interviews.
        </li>
        <li>
          <strong>Activity feed</strong> — timeline of events (new
          applications, status changes, meetings).
        </li>
      </ul>

      <h2 id="whats-next">What happens next</h2>
      <p>
        As candidates apply, their applications enter the guild's review
        queue. On the candidates page at{" "}
        <code>/dashboard/candidates</code> you'll see:
      </p>
      <ul>
        <li>
          <strong>Two view modes</strong> — "Priority" (sorted by match
          score and endorsements) or "By Job" (grouped under each posting).
          Toggle between them at the top.
        </li>
        <li>
          <strong>Match scores</strong> on each candidate — a 0–100 value
          combining skills overlap, experience level, location fit, guild
          membership, and salary compatibility. Click a candidate to see the
          full breakdown.
        </li>
        <li>
          <strong>Endorsement counts</strong> — experts who staked VETD on a
          candidate's success, visible on the candidate card.
        </li>
        <li>
          <strong>Filters</strong> — by status, guild, and sort order
          (endorsements, match score, recent, name).
        </li>
        <li>
          <strong>Candidate detail panel</strong> — click any candidate to
          see their profile, resume, screening answers, match breakdown,
          and action buttons (Message, Schedule Interview, Make Offer,
          Change Status).
        </li>
      </ul>

      <DocsCallout kind="tip" title="Messaging and scheduling built in">
        Click <strong>Message</strong> on any candidate to open a
        conversation. The messaging system at{" "}
        <code>/dashboard/messages</code> supports meeting scheduling with
        time proposals, so you don't need a separate calendar tool for the
        first round.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>Guild is locked at post time — you can't change it later without re-posting.</>,
          <>3–5 screening questions is the sweet spot. Fewer = weak signal. More = candidate drop-off.</>,
          <>Drafts auto-save every second. You can leave and come back.</>,
          <>Use "Priority" view to sort candidates by match score and endorsements across all your jobs.</>,
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
