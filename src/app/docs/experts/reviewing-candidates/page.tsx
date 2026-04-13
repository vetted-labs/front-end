import type { Metadata } from "next";
import { Vote, Scale, MessageSquare, TrendingUp, FileSearch, UserSquare, FileText, ClipboardList } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsFlowDiagram } from "@/components/docs/DocsFlowDiagram";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Reviewing candidates",
  description:
    "How to read a candidate application, score against the rubric, and write comments that help your fellow experts.",
};

const TOC = [
  { id: "the-review-page", title: "The review page", level: 2 as const },
  { id: "the-rubric", title: "Working the rubric", level: 2 as const },
  { id: "writing-comments", title: "Writing comments", level: 2 as const },
  { id: "common-mistakes", title: "Common mistakes", level: 2 as const },
  { id: "conflicts", title: "Conflicts of interest", level: 2 as const },
];

export default function ReviewingCandidatesPage() {
  return (
    <DocsPage
      href="/docs/experts/reviewing-candidates"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For experts", href: "/docs/experts" },
        { label: "Reviewing candidates" },
      ]}
      eyebrow="For experts · How-to"
      title="Reviewing candidates"
      description="How to read a candidate application, work the rubric, and leave comments that are actually useful to other experts and the candidate."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Budget <strong>15–20 minutes per application</strong>. Rushed reviews risk misalignment with consensus.</>,
          <>Score against the rubric's band descriptions — <strong>not</strong> against the last candidate you saw.</>,
          <>Comments are surfaced to both other experts and the hiring company. Keep them specific, evidence-based, 2–4 sentences.</>,
          <>Abstain from reviews where you have any material relationship with the candidate. No platform enforcement — it's on you.</>,
        ]}
      />

      <DocsFlowDiagram
        caption="The review page has three columns on desktop. Fill the rubric first, then read the profile and answers, then write comments."
        steps={[
          { tag: "Column 1", label: "Profile", description: "Quick read", icon: UserSquare },
          { tag: "Column 2", label: "Application", description: "Screening answers", icon: FileText },
          { tag: "Column 3", label: "Rubric", description: "Sticky, score here", icon: ClipboardList, accent: "primary" },
        ]}
      />

      <h2 id="the-review-page">The review page</h2>
      <p>
        From the expert sidebar, navigate to <strong>Vetting → Applications</strong>.
        The queue lists every candidate application currently in a commit or
        reveal phase for any guild you're a member of. Each row shows the
        candidate, the job they applied to, the current phase, and a deadline
        countdown.
      </p>
      <p>
        Clicking into an application opens the review page. It has three
        sections:
      </p>
      <ol>
        <li>
          <strong>Candidate profile.</strong> Name, headline, LinkedIn,
          portfolio, resume. Read this first — it's the quickest way to build a
          prior.
        </li>
        <li>
          <strong>Application responses.</strong> Every answer the candidate
          gave to the guild's application questions, structured by section.
        </li>
        <li>
          <strong>Your review.</strong> The rubric form, sticky on the right
          side of the page on desktop. This is where you score.
        </li>
      </ol>

      <DocsCallout kind="tip" title="Budget 15–20 minutes per application">
        Rushing reviews is the fastest way to miss subtle signal and get
        classified as misaligned when consensus lands. Block time for
        reviews the same way you'd block time for interviews.
      </DocsCallout>

      <h2 id="the-rubric">Working the rubric</h2>
      <p>
        Every guild defines its own rubric. An Engineering rubric might have
        three criteria — Systems Thinking, Code Quality, Communication — each
        scored 0 to 100 with a short description of what each band means. A
        Design guild might have different criteria including Visual Quality and
        Crypto Fundamentals.
      </p>
      <p>
        The rubric always appears in the right-hand panel with a slider or
        radio selector per criterion. An overall score is computed from the
        per-criterion scores. Every criterion also has an optional comment
        field — use it when your score on that criterion is meaningfully above
        or below your overall.
      </p>
      <p>
        Three practical tips:
      </p>
      <ul>
        <li>
          <strong>Score against the band descriptions, not against the last
          candidate you saw.</strong> Relative grading creates drift.
        </li>
        <li>
          <strong>Use the whole range.</strong> If you only ever score between
          60 and 80, you're compressing the signal and making consensus harder
          to calculate.
        </li>
        <li>
          <strong>Don't half-score.</strong> If you're genuinely split between
          two bands, write a comment explaining what tipped you.
        </li>
      </ul>

      <h2 id="writing-comments">Writing comments</h2>
      <p>
        Comments are the most under-used leverage point in reviewing. They're
        shown to other experts after reveal phase and surface in the candidate
        feedback aggregation that the hiring company receives. Good comments
        change votes and change hires.
      </p>
      <p>What makes a good comment:</p>
      <ul>
        <li>
          <strong>Specific to the application.</strong> Reference actual
          answers or portfolio work. Generic praise and generic criticism both
          add no value.
        </li>
        <li>
          <strong>Focused on evidence.</strong> "The systems design answer
          conflates throughput and latency" is actionable. "Weak technical
          skills" is not.
        </li>
        <li>
          <strong>Short.</strong> Two to four sentences. Long comments rarely
          get read end-to-end.
        </li>
      </ul>
      <p>
        What to avoid: hiring decisions, personal attacks, anything that
        couldn't be read aloud in a guild meeting without embarrassment.

      </p>

      <h2 id="common-mistakes">Common mistakes</h2>
      <ul>
        <li>
          <strong>Anchoring on the first signal.</strong> If the candidate's
          LinkedIn is impressive, it's easy to score their actual answers
          generously. Fight this by filling in your rubric scores based on
          the application answers themselves before you let background
          polish colour your read.
        </li>
        <li>
          <strong>Scoring on intent, not evidence.</strong> "They probably
          would do well at this" is a prediction. The rubric asks about what's
          actually in the application.
        </li>
        <li>
          <strong>Staying in the middle to avoid risk.</strong> Central-tendency
          bias is a thing. Clustering every score at 60 seems safe but actually
          gets you flagged as misaligned when consensus lands at 30 or 90.
        </li>
        <li>
          <strong>Forgetting to comment on extreme scores.</strong> If you give
          a 20 or a 95, write a comment. Anonymised outlier scores with no
          justification are the single largest source of post-reveal disputes.
        </li>
      </ul>

      <h2 id="conflicts">Conflicts of interest</h2>
      <p>
        The platform doesn't currently enforce conflict checks automatically.
        It's on you to abstain from reviews where you have a material
        relationship with the candidate — current or former coworker, close
        personal friend, direct report, and so on.
      </p>
      <p>
        To abstain, don't click into the review. There's no penalty for
        skipping reviews due to conflicts; there's a significant reputation
        penalty if another expert notices and reports you after the fact.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Fill in rubric scores <strong>before</strong> letting polish colour your read of the application.</>,
          <>Use the whole 0–100 range. Central-tendency bias risks misalignment when consensus diverges.</>,
          <>Write a comment on any extreme score (below 20 or above 95). Unjustified outliers are the #1 post-reveal dispute source.</>,
          <>Abstain on conflicts of interest. Post-hoc COI findings are harder to appeal than self-reporting.</>,
          <>Comments reach the hiring company. Keep them professional — nothing you wouldn't say in a guild meeting.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Open my review queue",
            description: "Jump into the app and see candidates waiting for review.",
            href: "/expert/voting",
            icon: Vote,
            kind: "app",
          },
          {
            title: "Commit-reveal voting",
            description: "How the vote is actually cast — with an interactive demo.",
            href: "/docs/experts/commit-reveal-voting",
            icon: Scale,
          },
          {
            title: "Reputation & ranks",
            description: "How alignment history rolls up into rank tiers.",
            href: "/docs/experts/reputation-and-ranks",
            icon: TrendingUp,
          },
          {
            title: "Writing good comments",
            description: "Jump back to the comments section of this page.",
            href: "#writing-comments",
            icon: MessageSquare,
          },
        ]}
      />
    </DocsPage>
  );
}
