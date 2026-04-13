import type { Metadata } from "next";
import { UserPlus, UserCircle, Briefcase, FileText, MessageSquare, UserCheck, Mail, Linkedin } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsTabs } from "@/components/docs/DocsTabs";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Candidate quickstart",
  description:
    "Sign up, build a profile, and apply to your first job in under ten minutes.",
};

const TOC = [
  { id: "before-you-start", title: "Before you start", level: 2 as const },
  { id: "the-five-steps", title: "The five steps", level: 2 as const },
  { id: "the-vetting-pipeline", title: "The vetting pipeline", level: 2 as const },
  { id: "your-dashboard", title: "Your dashboard", level: 2 as const },
];

export default function CandidateQuickstartPage() {
  return (
    <DocsPage
      href="/docs/candidates/quickstart"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For candidates", href: "/docs/candidates" },
        { label: "Candidate quickstart" },
      ]}
      eyebrow="For candidates · Quickstart"
      title="Your first 10 minutes as a candidate"
      description="A guided walkthrough from signup to your first submitted application. Most candidates finish this flow in under ten minutes — no wallet or crypto knowledge needed."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Email/password or LinkedIn OAuth signup. <strong>No wallet needed.</strong></>,
          <>Build a profile (headline, links, optional resume) then apply to jobs.</>,
          <>Your application enters a <strong>5-stage pipeline</strong>: Applied → Expert review → Company review → Interview → Offer.</>,
          <>Typical end-to-end time: 2–5 days from apply to first company response.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Five steps from signup to your first submitted application. Most candidates finish in under 10 minutes."
        steps={[
          { tag: "Step 1", label: "Sign up", icon: UserPlus },
          { tag: "Step 2", label: "Profile", icon: UserCircle },
          { tag: "Step 3", label: "Browse", icon: Briefcase },
          { tag: "Step 4", label: "Screening Qs", icon: FileText, accent: "primary" },
          { tag: "Step 5", label: "Submit", icon: UserCheck },
        ]}
      />

      <h2 id="before-you-start">Before you start</h2>
      <p>You only need two things:</p>
      <ul>
        <li>
          <strong>An email address</strong> (or a LinkedIn account for
          one-click signup).
        </li>
        <li>
          <strong>A resume or portfolio link</strong> — optional at signup,
          but reviewers weight it heavily.
        </li>
      </ul>
      <DocsCallout kind="note" title="No crypto, no wallet — ever">
        Vetted is built on an on-chain vetting protocol, but candidates
        don't see or use any of it. The blockchain activity is entirely
        on the expert reviewers' side. You use a standard email/password
        login throughout.
      </DocsCallout>

      <h2 id="the-five-steps">The five steps</h2>

      <h3>Step 1 — Sign up</h3>
      <p>
        Go to the home page and click <strong>Get Vetted</strong>, or navigate
        directly to <code>/auth/signup</code>. You'll see two tabs at the
        top: <strong>Job Seeker</strong> and <strong>Employer</strong>. Make
        sure <strong>Job Seeker</strong> is selected.
      </p>
      <DocsTabs
        tabs={[
          {
            label: "Email & password",
            content: (
              <>
                <p>Fill in the signup form:</p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li><strong>Full name</strong></li>
                  <li><strong>Headline</strong> — your current role or specialty (e.g. "Senior Backend Engineer")</li>
                  <li><strong>LinkedIn URL</strong> — required; experts use it to verify your background</li>
                  <li><strong>GitHub URL</strong> and <strong>Portfolio URL</strong> — optional, can be added later</li>
                  <li><strong>Email</strong></li>
                  <li><strong>Password</strong> (6+ characters)</li>
                  <li><strong>Experience level</strong> — dropdown: Junior (0–2 yrs), Mid-Level (2–5), Senior (5–10), Lead/Principal (10+)</li>
                  <li><strong>Terms checkbox</strong> — required to proceed</li>
                </ul>
                <p className="mt-3 text-[14px] text-muted-foreground">
                  Click <strong>Create Account</strong>. You'll be redirected
                  straight to your candidate dashboard.
                </p>
              </>
            ),
          },
          {
            label: "Continue with LinkedIn",
            content: (
              <>
                <p>
                  Click the <strong>Continue with LinkedIn</strong> button.
                  The OAuth flow imports your name, current role, LinkedIn URL,
                  and experience level automatically. You'll be asked to
                  confirm the details and set a password for future email
                  logins.
                </p>
                <p className="mt-3 text-[14px] text-muted-foreground">
                  Fastest option if you already have a complete LinkedIn profile.
                </p>
              </>
            ),
          },
        ]}
      />

      <DocsStepList
        start={2}
        steps={[
          {
            title: "Complete your profile",
            description: (
              <>
                <p>
                  After signup you land on your dashboard. You'll see a{" "}
                  <strong>profile completion ring</strong> showing your
                  percentage. Click <strong>Edit Profile</strong> or go to{" "}
                  <code>/candidate/profile</code>.
                </p>
                <p>The profile editor has these sections:</p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li><strong>Personal info</strong> — name, headline, bio, phone, experience level</li>
                  <li><strong>Resume</strong> — drag-and-drop upload area (PDF or DOCX)</li>
                  <li><strong>Skills</strong> — type a skill and press Enter to add it as a tag</li>
                  <li><strong>Work history</strong> — add entries with company, role, and dates</li>
                  <li><strong>Social links</strong> — LinkedIn, GitHub, portfolio URLs</li>
                </ul>
                <p>
                  Hit <strong>Save Changes</strong> when done. The completion
                  ring updates immediately.
                </p>
              </>
            ),
          },
          {
            title: "Browse jobs",
            description: (
              <>
                <p>
                  Click <strong>Browse jobs</strong> in the sidebar, or go
                  to <code>/browse/jobs</code>. You'll see a search bar at
                  the top and filter pills below it:
                </p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li><strong>Guild filter</strong> — Engineering, Design, Marketing, etc.</li>
                  <li><strong>Job type</strong> — Full-time, Part-time, Contract, Freelance</li>
                  <li><strong>Location</strong> — Remote, Onsite, Hybrid</li>
                  <li><strong>Sort</strong> — Newest or Salary: High to Low</li>
                </ul>
                <p>
                  Each job card shows the company, title, location, salary
                  range, and a <strong>match score</strong> showing how well
                  your profile fits the role.
                </p>
              </>
            ),
          },
          {
            title: "Open a job and read the screening questions",
            description: (
              <>
                <p>
                  Click any job card to open its detail page. You'll see the
                  full description, requirements, skills, and — most
                  importantly — the <strong>screening questions</strong> the
                  company wrote. These are what the expert guild scores you
                  on, so read them carefully before clicking{" "}
                  <strong>Apply</strong>.
                </p>
              </>
            ),
          },
          {
            title: "Answer the questions and submit",
            description: (
              <>
                <p>
                  Click <strong>Apply</strong>. A modal opens with your
                  profile details pre-filled. Answer every screening question
                  — the form auto-saves as you type. Add an optional cover
                  letter if you want.
                </p>
                <p>
                  Hit <strong>Submit</strong>. Your application enters the
                  guild's review queue immediately. Track it from{" "}
                  <code>/candidate/applications</code>.
                </p>
              </>
            ),
          },
        ]}
      />

      <h2 id="the-vetting-pipeline">The vetting pipeline</h2>
      <p>
        After you submit, your application walks through a five-stage
        pipeline. You can see which stage you're in on the applications page
        — each application shows a visual pipeline with colored dots for
        completed, active, and upcoming stages.
      </p>
      <ol>
        <li>
          <strong>Applied.</strong> Your application is queued for expert
          review. Status dot is blue.
        </li>
        <li>
          <strong>Expert review.</strong> Guild experts are scoring your
          answers against the rubric. Typically 2–5 days. Status dot
          pulses while active.
        </li>
        <li>
          <strong>Company review.</strong> The company received the
          ranked shortlist and is reading through it.
        </li>
        <li>
          <strong>Interview.</strong> The company moved you forward to
          their interview process.
        </li>
        <li>
          <strong>Offer.</strong> You received an offer — or a rejection
          with optional feedback visible in the tracker.
        </li>
      </ol>

      <h2 id="your-dashboard">Your dashboard</h2>
      <p>
        Your dashboard at <code>/candidate/dashboard</code> shows everything
        at a glance:
      </p>
      <ul>
        <li>
          <strong>Stats cards</strong> — Total Applied, Under Review,
          Interviews, and Offers.
        </li>
        <li>
          <strong>Recent applications</strong> — each with its pipeline
          status and a link to the job.
        </li>
        <li>
          <strong>Messages</strong> — conversations with companies,
          including meeting scheduling.
        </li>
        <li>
          <strong>Guild applications</strong> — if you applied to any
          guilds (optional for candidates).
        </li>
      </ul>

      <DocsCallout kind="tip" title="You can withdraw a pending application">
        On the applications page, pending applications show a{" "}
        <strong>Withdraw</strong> button. Clicking it opens a confirmation
        dialog. Once expert review has begun, withdrawal is still available
        but the guild's review record stays on file.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>No crypto on the candidate side — email or LinkedIn OAuth, no wallet.</>,
          <>Screening answers carry more weight than your resume during expert review.</>,
          <>Match scores on the browse page rank jobs by fit — use them to prioritise.</>,
          <>The applications page shows a visual pipeline for each application with colored status dots.</>,
          <>Typical review turnaround is 2–5 days; plan applications in batches.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Sign up",
            description: "Create a candidate account with email or LinkedIn.",
            href: "/auth/signup?type=candidate",
            icon: UserPlus,
            kind: "app",
          },
          {
            title: "Browse jobs",
            description: "See what's available right now, ranked by match score.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Building your profile",
            description: "What guild reviewers actually read and how to present it.",
            href: "/docs/candidates/profile",
            icon: UserCircle,
          },
          {
            title: "Endorsements explained",
            description: "How expert endorsements boost your visibility.",
            href: "/docs/candidates/endorsements",
            icon: MessageSquare,
          },
        ]}
      />
    </DocsPage>
  );
}
