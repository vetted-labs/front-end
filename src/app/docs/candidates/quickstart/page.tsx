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
      description="Sign up, fill in a minimal profile, and submit your first application. Most candidates finish this flow in under ten minutes."
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
      <ul>
        <li>
          <strong>A work email.</strong> You'll sign in with email and
          password, or with LinkedIn if you prefer. No wallet needed —
          nothing about the candidate side of Vetted touches the blockchain.
        </li>
        <li>
          <strong>Your LinkedIn URL.</strong> Required during signup as a
          verification of your professional background.
        </li>
        <li>
          <strong>A resume or portfolio link.</strong> Optional at signup,
          but reviewers weight it heavily, so adding one is the single
          biggest thing you can do to improve your applications.
        </li>
      </ul>
      <DocsCallout kind="note" title="You never need crypto on the candidate side">
        Vetted is built on an on-chain vetting protocol, but candidates
        don't see or use any of it directly. The on-chain activity is all
        on the expert reviewers' side — you see only application status
        and feedback.
      </DocsCallout>

      <h2 id="the-five-steps">The five steps</h2>

      <h3>Step 1 — Sign up</h3>
      <p>
        From the home page, click <strong>Get vetted</strong> or go to{" "}
        <code>/auth/signup?type=candidate</code>. You have two signup options — pick
        whichever is faster for you.
      </p>
      <DocsTabs
        tabs={[
          {
            label: "Email & password",
            content: (
              <>
                <p>Fill in:</p>
                <ul className="my-2 list-disc pl-6 text-[14.5px] [&_li]:my-1">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Password (6+ characters)</li>
                  <li>Headline — your current role or specialty</li>
                  <li>LinkedIn URL (required for background verification)</li>
                  <li>Experience level (Junior / Mid / Senior / Lead)</li>
                </ul>
                <p className="mt-3 text-[14px] text-muted-foreground">
                  You can add GitHub, portfolio URL, and phone later from the profile
                  editor.
                </p>
              </>
            ),
          },
          {
            label: "Continue with LinkedIn",
            content: (
              <>
                <p>
                  One-click signup. The OAuth flow imports your name, current role,
                  LinkedIn URL, and experience level automatically from LinkedIn. You'll
                  be asked to confirm and add a password for future email logins.
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
                  Navigate to <code>/candidate/profile</code>. The profile
                  editor opens in edit mode automatically until you hit
                  100% completion. Add your bio, location, phone, and
                  social links (LinkedIn, GitHub, portfolio).
                </p>
                <p>
                  Upload a PDF or DOCX resume if you have one — the resume
                  is one of the most-clicked links during expert review.
                </p>
              </>
            ),
          },
          {
            title: "Browse jobs",
            description: (
              <>
                <p>
                  Open <strong>Browse jobs</strong> from the sidebar. Filter
                  by <DocsGlossaryLink term="guild">guild</DocsGlossaryLink>, job type, location type, or keyword. As a
                  signed-in candidate, each job card shows a personalised
                  match score so you can prioritise the roles where your
                  profile is strongest.
                </p>
              </>
            ),
          },
          {
            title: "Open a job and review its screening questions",
            description: (
              <>
                <p>
                  Click any job to open the detail view. You'll see the
                  full description, requirements, skills, salary range,
                  company profile, and — importantly — the screening
                  questions the company added when they posted.
                </p>
                <p>
                  Read them before you hit <strong>Apply</strong>. The
                  reviewing guild scores your answers to those questions
                  against the guild's rubric, so putting real thought into
                  each answer is how you stand out.
                </p>
              </>
            ),
          },
          {
            title: "Submit your application",
            description: (
              <>
                <p>
                  Click <strong>Apply</strong>. The application modal opens
                  with your profile details auto-filled. Answer every
                  screening question, add an optional cover letter, and
                  submit. The form auto-saves as you type.
                </p>
                <p>
                  Your application lands in the reviewing guild's queue
                  immediately. You can track it from{" "}
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
        pipeline. You can see which stage you're in on the application
        tracker page.
      </p>
      <ol>
        <li>
          <strong>Applied.</strong> We received your application. It's
          queued for expert review.
        </li>
        <li>
          <strong>Expert review.</strong> Guild experts are scoring your
          application against the rubric. This typically takes 2–5 days.
        </li>
        <li>
          <strong>Company review.</strong> The company has received the
          shortlist from the guild and is reading through it.
        </li>
        <li>
          <strong>Interview.</strong> The company has moved you forward to
          their own interview process.
        </li>
        <li>
          <strong>Offer.</strong> The company has extended an offer — or
          rejected you with optional feedback visible in the tracker.
        </li>
      </ol>

      <DocsCallout kind="tip" title="You can withdraw a pending application">
        If you change your mind before expert review starts, you can
        withdraw from the application tracker. Once the review has begun,
        withdrawal is still available but the guild's review record stays
        on file.
      </DocsCallout>

      <DocsKeyTakeaways
        points={[
          <>No crypto on the candidate side — email or LinkedIn OAuth, no wallet.</>,
          <>Screening answers carry more weight than your resume during expert review.</>,
          <>You can withdraw a pending application at any point before finalization.</>,
          <>Match scores on the browse page rank jobs by fit with your profile.</>,
          <>Typical review turnaround is 2–5 days; plan applications in batches.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Sign up",
            description: "Create a candidate account with email or LinkedIn.",
            href: "/auth/login?type=candidate",
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
