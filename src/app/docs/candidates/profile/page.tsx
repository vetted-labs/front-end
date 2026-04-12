import type { Metadata } from "next";
import { UserCircle, Briefcase, Handshake, FileText } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";

export const metadata: Metadata = {
  title: "Building your profile",
  description:
    "What fields matter most to guild reviewers and how to present your work in ways they actually read.",
};

const TOC = [
  { id: "how-reviewers-read", title: "How reviewers actually read profiles", level: 2 as const },
  { id: "the-headline", title: "The headline", level: 2 as const },
  { id: "work-history", title: "Work history", level: 2 as const },
  { id: "links", title: "Links — LinkedIn, GitHub, portfolio", level: 2 as const },
  { id: "application-answers", title: "Application answers", level: 2 as const },
  { id: "common-pitfalls", title: "Common pitfalls", level: 2 as const },
];

export default function CandidateProfilePage() {
  return (
    <DocsPage
      href="/docs/candidates/profile"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For candidates", href: "/docs/candidates" },
        { label: "Building your profile" },
      ]}
      eyebrow="For candidates · How-to"
      title="Building your profile"
      description="The profile is what guild experts actually see when they review your application. This page covers what they look for, in what order, and what you can do to make their job easier."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="beginner" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Reviewers spend 15–20 minutes per candidate. The first 60 seconds on your profile carry the most weight.</>,
          <>Headline + top portfolio link are where they start. <strong>Match the guild's vocabulary</strong> in your headline.</>,
          <>Evidence beats adjectives. Quantify outcomes in work history; name real technologies and projects.</>,
          <>Dead links are <strong>worse than no links</strong>. Test everything before you submit.</>,
        ]}
      />

      <h2 id="how-reviewers-read">How reviewers actually read profiles</h2>
      <p>
        A <DocsGlossaryLink term="guild">guild</DocsGlossaryLink> expert reviewing your application has a budget of roughly 15
        to 20 minutes per candidate. They don't read your profile the way a
        recruiter reads a resume — they're looking for evidence that maps to
        their rubric criteria, and they're making a deliberate effort to form
        their opinion before seeing anyone else's vote.
      </p>
      <p>That means three things for you as a candidate:</p>
      <ul>
        <li>
          <strong>The first 60 seconds count the most.</strong> Headline,
          current role, primary discipline, and top portfolio link are the
          first signals they collect. Everything else modifies that first
          impression.
        </li>
        <li>
          <strong>Evidence beats adjectives.</strong> Specific projects and
          outcomes get scored. Generic descriptions of skills do not.
        </li>
        <li>
          <strong>Structure is a favour to the reviewer.</strong> A
          profile that reads as a wall of text gets skimmed. A structured
          profile with clear sections gets read.
        </li>
      </ul>

      <h2 id="the-headline">The headline</h2>
      <p>
        Your headline is one sentence — maybe twelve words — and it appears
        above the fold on every view of your profile. It should answer
        "what do you actually do?" as specifically as you can stand.
      </p>
      <p>
        A bad headline: <em>Experienced software engineer</em>.<br />
        A better headline:{" "}
        <em>Backend engineer focused on high-throughput payment systems</em>.
      </p>
      <DocsCallout kind="tip" title="Match the guild's vocabulary">
        If you're applying to the Security guild, use the specific
        sub-disciplines they care about (appsec, infra, reversing) rather
        than a generic "security engineer" label. Guild rubrics are written
        in the guild's own vocabulary, and your headline telegraphs whether
        you speak it.
      </DocsCallout>

      <h2 id="work-history">Work history</h2>
      <p>
        The work history section is where most candidates waste space. Three
        principles:
      </p>
      <ul>
        <li>
          <strong>Recency matters more than totality.</strong> Five years at
          your current role is more relevant than a fifteen-year chronology.
          Trim the early jobs to one line each.
        </li>
        <li>
          <strong>Quantify when you can.</strong> "Reduced p95 latency by 40%"
          is a scored signal. "Worked on performance optimization" is not.
        </li>
        <li>
          <strong>Name real technologies.</strong> Stacks, frameworks, and
          specific products are keywords a reviewer can anchor on.
        </li>
      </ul>

      <h2 id="links">Links — LinkedIn, GitHub, portfolio</h2>
      <p>
        Add at least one external link. For most engineers, GitHub is the
        single most-clicked link. For designers, it's the portfolio. For
        candidates in non-public domains (security research, ML research),
        LinkedIn plus a personal site is usually enough.
      </p>
      <p>
        What reviewers do with the links:
      </p>
      <ul>
        <li>
          They click through to check that the claims in your profile are
          consistent with public artifacts.
        </li>
        <li>
          For engineers, they often spot-check a recent repo to look at
          commit patterns and code quality.
        </li>
        <li>
          For designers, they look at the highest-rated piece on your portfolio
          and read its case study.
        </li>
      </ul>
      <DocsCallout kind="warning" title="Dead links are worse than no links">
        A 404 on your portfolio is a stronger negative signal than not having
        the link at all. Test your links before you submit an application.
      </DocsCallout>

      <h2 id="application-answers">Application answers</h2>
      <p>
        Each job has its own screening questions in addition to the guild's
        general application questions. Your answers are the single most
        heavily weighted section of the review — experts score them against
        specific rubric criteria.
      </p>
      <p>What works:</p>
      <ul>
        <li>
          <strong>Short, specific, structured.</strong> Lead with the answer,
          then the context, then the tradeoffs. Don't bury the point.
        </li>
        <li>
          <strong>Examples from real projects.</strong> Hypotheticals are
          weaker than actual stories, even when the actual stories are small.
        </li>
        <li>
          <strong>Honest about what you didn't know.</strong> Reviewers
          regularly rate "I was wrong about X, here's how I figured it out"
          above "I was right from the start."
        </li>
      </ul>
      <p>What doesn't work:</p>
      <ul>
        <li>
          Long answers with no structure. Reviewers skim; they don't re-read.
        </li>
        <li>
          Copy-paste answers shared across applications. Experts notice, and
          they talk to each other.
        </li>
        <li>
          AI-generated answers. See the no-AI declaration — the penalty for
          breaches is a platform-wide suspension, not only a guild rejection.
        </li>
      </ul>

      <h2 id="common-pitfalls">Common pitfalls</h2>
      <ul>
        <li>
          <strong>Inconsistent seniority signals.</strong> If your headline
          says "senior" but your experience bullets read as IC-level work,
          reviewers notice immediately.
        </li>
        <li>
          <strong>Missing the current role.</strong> Profiles without a
          current employer or self-employed status feel incomplete.
        </li>
        <li>
          <strong>Links to private resources.</strong> GitHub repos gated
          behind a private org, portfolio PDFs behind a password wall — these
          are effectively invisible to reviewers.
        </li>
        <li>
          <strong>Over-polishing.</strong> A profile that reads as
          thesaurus-assisted is less trusted than one that reads as honest.
          Clarity beats eloquence.
        </li>
      </ul>

      <DocsKeyTakeaways
        points={[
          <>Headline carries the most weight. Write it with the guild's own vocabulary.</>,
          <>Trim early-career roles to one line each — recency is what matters.</>,
          <>Quantify with numbers. "Reduced p95 latency by 40%" beats "worked on performance".</>,
          <>Dead links are worse than no links — test before submit.</>,
          <>Copy-paste or AI-generated screening answers get flagged across applications, not only one.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "Edit my profile",
            description: "Jump straight to the profile editor.",
            href: "/candidate/profile",
            icon: UserCircle,
            kind: "app",
          },
          {
            title: "Browse jobs",
            description: "See what's available and apply with your updated profile.",
            href: "/browse/jobs",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Endorsements explained",
            description: "How expert endorsements can boost your visibility.",
            href: "/docs/candidates/endorsements",
            icon: Handshake,
          },
          {
            title: "Back to overview",
            description: "Full candidate guide.",
            href: "/docs/candidates",
            icon: FileText,
          },
        ]}
      />
    </DocsPage>
  );
}
