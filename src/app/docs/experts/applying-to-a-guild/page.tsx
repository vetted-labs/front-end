import type { Metadata } from "next";
import { UserPlus, FileText, PenLine, ShieldCheck, Users, Vote } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Applying to a guild",
  description:
    "Walkthrough of the four-step guild application — personal info, background, answers, and wallet-signed review.",
};

const TOC = [
  { id: "overview", title: "Overview", level: 2 as const },
  { id: "step-0", title: "Step 1 — Personal information", level: 2 as const },
  { id: "step-1", title: "Step 2 — Professional background", level: 2 as const },
  { id: "step-2", title: "Step 3 — Application questions", level: 2 as const },
  { id: "step-3", title: "Step 4 — Review and sign", level: 2 as const },
  { id: "after-submit", title: "After you submit", level: 2 as const },
  { id: "picking-guild", title: "Picking the right guild", level: 2 as const },
];

export default function ApplyingToGuildPage() {
  return (
    <DocsPage
      href="/docs/experts/applying-to-a-guild"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Applying to a guild" },
      ]}
      eyebrow="For experts · How-to"
      title="Applying to a guild"
      description="Every field of the four-step guild application explained, plus what actually happens after you hit submit."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>The guild application is a <strong>4-step form</strong> — personal info, background, questions, review & sign.</>,
          <>All steps auto-save to <strong>browser local storage</strong>. Switching devices mid-flow loses your draft.</>,
          <>The no-AI declaration is <strong>binding</strong>. Breaches lead to rejection plus a 90-day reapplication cooldown.</>,
          <>Wallet signing at submission is <strong>gasless</strong> — it's an identity proof, not a transaction.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="Finish the application in one sitting. The draft does not sync across devices."
        steps={[
          { tag: "Step 1", label: "Personal", icon: UserPlus },
          { tag: "Step 2", label: "Background", icon: FileText },
          { tag: "Step 3", label: "Questions", icon: PenLine, accent: "primary" },
          { tag: "Step 4", label: "Review & sign", icon: ShieldCheck },
        ]}
      />

      <h2 id="overview">Overview</h2>
      <p>
        The guild application is a four-step form. It's how a guild decides
        whether to admit you as a reviewer, and it's the only piece of your
        writing that your future peers will read before you start voting. Take
        it seriously.
      </p>
      <p>
        All four steps auto-save to your browser's local storage as you go, so
        you can safely close the tab and come back. You can't reopen the
        application on a different device mid-flow — the draft lives in local
        storage, not on the backend.
      </p>

      <h2 id="step-0">Step 1 — Personal information</h2>
      <p>The basics:</p>
      <ul>
        <li>
          <strong>Full name.</strong> Your real name or a consistent pseudonym.
          Guilds vary in how strict they are; some require real names, others
          accept long-standing online handles with public track records.
        </li>
        <li>
          <strong>Email.</strong> Used for status notifications. Not shared with
          other experts.
        </li>
        <li>
          <strong>LinkedIn URL and portfolio URL.</strong> At least one is
          required. This is the only external signal reviewers have that you
          actually do the work you claim.
        </li>
        <li>
          <strong>Resume upload.</strong> Optional but strongly recommended.
          PDFs under 5MB.
        </li>
        <li>
          <strong>Expertise areas.</strong> Multi-select chips for your
          declared specialties inside the guild's domain.
        </li>
      </ul>

      <h2 id="step-1">Step 2 — Professional background</h2>
      <p>Context about your career and why you want to be in this guild:</p>
      <ul>
        <li>
          <strong>Expertise level.</strong> Junior, Mid, Senior, Staff, and so
          on — guild-specific options. Be honest; claiming a level above your
          actual experience surfaces quickly during the first few reviews.
        </li>
        <li>
          <strong>Years of experience</strong> in the field.
        </li>
        <li>
          <strong>Current job title and company</strong> — optional for people
          who prefer not to disclose employer.
        </li>
        <li>
          <strong>Professional bio.</strong> A short summary of your work. Keep
          it under 300 words.
        </li>
        <li>
          <strong>Motivation statement.</strong> Why you want to join this
          specific guild. Generic "I like vetting" answers do poorly; specifics
          do well.
        </li>
      </ul>

      <h2 id="step-2">Step 3 — Application questions</h2>
      <p>
        The heart of the application. Four general questions every guild asks,
        plus a set of level-specific domain questions loaded based on the
        expertise level you selected.
      </p>
      <p>The four general questions are:</p>
      <ol>
        <li>
          <strong>Learning from failure.</strong> Describe a real project where
          something went wrong and what you took from it.
        </li>
        <li>
          <strong>Decision-making under uncertainty.</strong> Describe a call
          you made with incomplete information and how you reasoned about it.
        </li>
        <li>
          <strong>Motivation and conflict.</strong> Describe a professional
          conflict and how you handled it.
        </li>
        <li>
          <strong>How you'd improve the guild.</strong> Tactical suggestions
          are valued more than generic praise.
        </li>
      </ol>

      <DocsCallout kind="warning" title="The no-AI declaration is binding">
        Before submitting this step you must confirm that the answers are your
        own work. Guild members can flag suspected AI-generated applications
        for review, and a confirmed breach is grounds for immediate
        rejection and a 90-day reapplication cooldown.
      </DocsCallout>

      <h2 id="step-3">Step 4 — Review and sign</h2>
      <p>
        The review step shows everything you've entered in a read-only format.
        This is your last chance to catch typos or factual errors — once you
        submit, you can't edit an in-flight application.
      </p>
      <p>
        When you click <strong>Sign &amp; submit</strong>, your wallet opens
        for a verification signature. This is a cryptographic proof that you
        control the wallet attached to the submission. It's gasless — you're
        signing a message, not sending a transaction.
      </p>

      <h2 id="after-submit">After you submit</h2>
      <p>
        Your application lands in the guild's review queue with status{" "}
        <code>pending</code>. You'll see it on the{" "}
        <code>/expert/application-pending</code> page. Guild admins review
        applications in batches — turnaround depends on guild size and volume,
        typically within a week.
      </p>
      <p>Possible outcomes:</p>
      <ul>
        <li>
          <strong>Approved.</strong> The full expert sidebar unlocks and you
          can start reviewing candidates immediately.
        </li>
        <li>
          <strong>Rejected.</strong> You'll get a reason and a suggested
          timeline for reapplication (usually 30–90 days).
        </li>
        <li>
          <strong>Needs more info.</strong> A guild admin will leave a comment
          asking for clarification. You can respond without restarting the
          application.
        </li>
      </ul>

      <h2 id="picking-guild">Picking the right guild</h2>
      <p>
        If you genuinely span two domains (e.g. security and backend), apply to
        one first, establish a track record, and then apply to the second.
        Applying to multiple guilds simultaneously dilutes your reputation
        gains early on and can flag you as non-serious to admins.
      </p>
      <p>
        Each guild publishes its rubric publicly. Read the rubric for the
        guilds you're considering before you apply — if the rubric doesn't
        match how you'd actually evaluate work in your field, the guild
        probably isn't a fit.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Local storage is the draft store — <strong>don't switch devices</strong> mid-application.</>,
          <>Use your real name or a long-standing pseudonym with a public track record.</>,
          <>Motivation matters more than bio. Generic motivation answers fail.</>,
          <>Apply to <strong>one guild at a time</strong>. Multi-apply dilutes reputation gains and looks non-serious.</>,
          <>Wallet signing on submit is gasless — it only proves you control the address.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Start your application",
            description: "Pick a guild and begin the 4-step flow.",
            href: "/guilds",
            icon: UserPlus,
            kind: "app",
          },
          {
            title: "Reviewing candidates",
            description: "How to work the rubric and write useful comments.",
            href: "/docs/experts/reviewing-candidates",
            icon: Vote,
          },
          {
            title: "Browse guilds",
            description: "See all active guilds and their rubrics before committing.",
            href: "/guilds",
            icon: Users,
            kind: "app",
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
