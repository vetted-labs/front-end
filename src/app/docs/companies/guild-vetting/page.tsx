import type { Metadata } from "next";
import { Users, Briefcase, Globe2, MessageSquare } from "lucide-react";
import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsTldr } from "@/components/docs/DocsTldr";
import { DocsKeyTakeaways } from "@/components/docs/DocsKeyTakeaways";
import { DocsNextSteps } from "@/components/docs/DocsNextSteps";
import { DocsGlossaryLink } from "@/components/docs/DocsGlossaryLink";
import { ComplexityBadge } from "@/components/docs/ComplexityBadge";

export const metadata: Metadata = {
  title: "Guild-backed vetting",
  description:
    "The full vetting flow from the hiring team's perspective — what questions to ask, what the scores mean, and how to interpret expert feedback.",
};

const TOC = [
  { id: "the-principle", title: "The underlying principle", level: 2 as const },
  { id: "screening-questions", title: "Writing screening questions", level: 2 as const },
  { id: "what-the-score-means", title: "What the consensus score actually means", level: 2 as const },
  { id: "reading-endorsements", title: "Reading endorsements", level: 2 as const },
  { id: "the-shortlist", title: "Making decisions from the shortlist", level: 2 as const },
  { id: "feedback-loop", title: "The feedback loop", level: 2 as const },
];

export default function GuildVettingPage() {
  return (
    <DocsPage
      href="/docs/companies/guild-vetting"
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "For companies", href: "/docs/companies" },
        { label: "Guild-backed vetting" },
      ]}
      eyebrow="For companies · Core concept"
      title="Guild-backed vetting"
      description="What happens between the moment you post a job and the moment a shortlist lands on your dashboard — and how to get the best signal out of it."
      lastUpdated="April 2026"
      badge={<ComplexityBadge level="intermediate" />}
      toc={TOC}
    >
      <DocsTldr
        points={[
          <>Expert panel + <DocsGlossaryLink term="guild">guild</DocsGlossaryLink> <DocsGlossaryLink term="rubric">rubric</DocsGlossaryLink> + <DocsGlossaryLink term="iqr-consensus">IQR consensus</DocsGlossaryLink> → ranked shortlist with scores 0–100.</>,
          <>Score bands: <strong>85+ strong, 70–85 positive, 55–70 ambiguous, &lt;55 weak</strong>.</>,
          <><DocsGlossaryLink term="endorsement">Endorsements</DocsGlossaryLink> are a <strong>separate signal</strong> from consensus — experts staking <DocsGlossaryLink term="vetd">VETD</DocsGlossaryLink> on specific candidates.</>,
          <>Your hiring outcomes feed back into the expert panel's calibration — the loop tightens over time.</>,
        ]}
      />

      <h2 id="the-principle">The underlying principle</h2>
      <p>
        Traditional hiring pipelines rely on keyword-matched resume screens
        or, increasingly, AI parsers. Both are noisy: they filter on signals
        that correlate weakly with actual performance in the role. The top of
        your funnel ends up full of candidates who pattern-match on surface
        features but fail at the first technical interview.
      </p>
      <p>
        Guild-backed vetting replaces that screen with structured,
        independent evaluation by domain experts who actually do the work.
        Every application is read by multiple experts, scored against a
        published rubric, and aggregated into a single consensus score. You
        receive a shortlist that's been pre-filtered by people whose
        judgement you would otherwise have to spend months building a
        relationship with before you could trust it.
      </p>

      <h2 id="screening-questions">Writing screening questions</h2>
      <p>
        Screening questions are the single most important thing you control.
        The guild rubric is set by the guild, but the content the experts are
        evaluating comes from your questions. Good questions produce high-
        signal reviews; bad questions waste everyone's time.
      </p>
      <p>What makes a screening question good:</p>
      <ul>
        <li>
          <strong>It maps to a real skill you care about.</strong> Not a
          proxy — the actual skill. If you care about system design, ask a
          system design question. Don't ask about programming languages as a
          stand-in.
        </li>
        <li>
          <strong>It requires a substantive answer.</strong> Questions that
          can be answered in one sentence give reviewers nothing to score.
          Aim for answers in the 100–300 word range.
        </li>
        <li>
          <strong>It's grounded in a specific scenario.</strong> "Describe a
          time you..." questions produce better signal than "How would you..."
          questions because reviewers can check the answer against real
          experience.
        </li>
        <li>
          <strong>It's unique to your role.</strong> Generic questions get
          generic answers. The more your question reflects the specific
          challenges of the role, the higher-signal the reviews.
        </li>
      </ul>
      <DocsCallout kind="tip" title="3–5 questions is the sweet spot">
        Fewer than 3 questions doesn't give reviewers enough to work with.
        More than 5 causes candidate drop-off during application and compresses
        review quality because experts start skimming.
      </DocsCallout>

      <h2 id="what-the-score-means">What the consensus score actually means</h2>
      <p>
        Each candidate ends up with a single consensus score on a 0–100
        scale. That score is not an average — it's the statistical median of
        expert votes after outliers are filtered out. Ranges to know:
      </p>
      <ul>
        <li>
          <strong>85+ :</strong> Strong positive signal across the panel. Very
          low false-positive rate at this level. Expected to be a small
          fraction of applications.
        </li>
        <li>
          <strong>70–85 :</strong> Positive but mixed. Worth interviewing.
          Often the bulk of a healthy shortlist.
        </li>
        <li>
          <strong>55–70 :</strong> Ambiguous. Some reviewers were enthusiastic,
          others weren't. Read the feedback before deciding.
        </li>
        <li>
          <strong>Below 55 :</strong> Weak signal. These candidates rarely
          make it onto the final shortlist the guild presents to the company.
        </li>
      </ul>
      <p>
        The scores are relative to the guild's rubric, not to your personal
        bar. A guild with a very high baseline (e.g. the Security guild) will
        have fewer 90+ scores than a guild with a lower baseline.
      </p>

      <h2 id="reading-endorsements">Reading endorsements</h2>
      <p>
        Endorsements appear on the shortlist as a separate signal from the
        consensus score. A candidate can be strongly endorsed with a middling
        consensus score, or have a high consensus score and no endorsements
        — each combination tells you something different.
      </p>
      <ul>
        <li>
          <strong>High score + strong endorsements.</strong> The safest
          candidate to prioritise. Multiple experts are willing to stake real
          VETD on this candidate's success.
        </li>
        <li>
          <strong>High score, no endorsements.</strong> Still a strong
          candidate — the consensus is favourable, experts didn't have
          standout conviction. Very common and not a negative signal.
        </li>
        <li>
          <strong>Medium score, strong endorsement.</strong> One or more
          experts saw something the panel as a whole didn't score highly.
          Worth a closer look; often candidates in this bucket are strong on
          dimensions the rubric underweights.
        </li>
      </ul>

      <h2 id="the-shortlist">Making decisions from the shortlist</h2>
      <p>
        The shortlist is ordered by consensus score by default, but the
        dashboard lets you re-sort by endorsement strength, recency, or
        candidate seniority. Use whichever view matches the role's priority.
      </p>
      <p>
        A few practical tips:
      </p>
      <ul>
        <li>
          <strong>Don't re-screen on resumes.</strong> The whole point of
          vetting is to replace the resume screen. If you go back to
          pattern-matching resumes on the shortlist, you lose the value.
        </li>
        <li>
          <strong>Read the aggregated feedback for borderline candidates.</strong>{" "}
          The 55–70 range is exactly where feedback is most useful — experts
          often wrote specific observations that explain their scores.
        </li>
        <li>
          <strong>Interview broadly from the top of the shortlist.</strong> A
          consensus score of 82 isn't meaningfully different from a score of
          86 — both are strong signals. Don't over-fit to the top of the
          ranking.
        </li>
      </ul>

      <h2 id="feedback-loop">The feedback loop</h2>
      <p>
        When you mark a candidate as hired or rejected, that decision feeds
        back into the platform. Experts who scored the candidate highly (and
        endorsed them, if applicable) see their reputation and reward move.
        Over time, this produces a measurably better match between guild
        consensus and your actual hiring outcomes.
      </p>
      <p>
        You can also post short feedback when marking a candidate as hired —
        "strong on system design, weaker on communication than the scores
        suggested," for example. This goes into the guild's calibration data
        and helps experts tune their own reviews for your specific role type.
      </p>

      <DocsKeyTakeaways
        points={[
          <>Don't re-screen on resumes on the shortlist — that discards the whole value of the vetting.</>,
          <>Read the aggregated feedback for borderline candidates in the 55–70 range. That's where it matters most.</>,
          <>Interview broadly from the top — 82 and 86 are not meaningfully different signals.</>,
          <>Endorsements are orthogonal to consensus. High score + strong endorsements is the safest combination.</>,
          <>Marking outcomes (hired/rejected) tightens the panel's calibration for your next job.</>,
        ]}
      />

      <DocsNextSteps
        steps={[
          {
            title: "View my candidates",
            description: "Open the shortlist for your current jobs.",
            href: "/dashboard/candidates",
            icon: Users,
            kind: "app",
          },
          {
            title: "Post another job",
            description: "Add a new role to your dashboard.",
            href: "/jobs/new",
            icon: Briefcase,
            kind: "app",
          },
          {
            title: "Messaging",
            description: "Reach out to candidates and schedule interviews.",
            href: "/dashboard/messages",
            icon: MessageSquare,
            kind: "app",
          },
          {
            title: "Why Web3 for hiring",
            description: "The accountability argument for stakeholders.",
            href: "/docs/companies/why-web3",
            icon: Globe2,
          },
        ]}
      />
    </DocsPage>
  );
}
